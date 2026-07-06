from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parent.parent
ARTIFACT_DIR = ROOT_DIR / "model_artifacts"

DEFAULT_FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

MODEL_FILE_CANDIDATES = [
    ARTIFACT_DIR / "student_success_model.keras",
    ROOT_DIR / "student_success_model.keras",
]
SCALER_FILE_CANDIDATES = [
    ARTIFACT_DIR / "student_scaler.pkl",
    ROOT_DIR / "student_scaler.pkl",
]
FEATURE_COLUMNS_FILE_CANDIDATES = [
    ARTIFACT_DIR / "feature_columns.json",
    ROOT_DIR / "feature_columns.json",
]
SKILLS_FILE_CANDIDATES = [
    ARTIFACT_DIR / "skills.json",
    ROOT_DIR / "skills.json",
]
PROBLEM_TYPES_FILE_CANDIDATES = [
    ARTIFACT_DIR / "problem_types.json",
    ROOT_DIR / "problem_types.json",
]
SHAP_BACKGROUND_FILE_CANDIDATES = [
    ARTIFACT_DIR / "shap_background.npy",
    ROOT_DIR / "shap_background.npy",
]
FEATURE_IMPORTANCE_FILE_CANDIDATES = [
    ARTIFACT_DIR / "feature_importance.json",
    ROOT_DIR / "feature_importance.json",
]

NUMERIC_COLUMNS = [
    "attempt_count",
    "hint_count",
    "bottom_hint",
    "ms_first_response",
    "session_duration",
    "Average_confidence(FRUSTRATED)",
    "Average_confidence(CONFUSED)",
    "Average_confidence(CONCENTRATING)",
    "Average_confidence(BORED)",
]


class PredictRequest(BaseModel):
    skill: str = Field(..., description="Skill name")
    problem_type: str = Field(..., description="Problem type")
    attempt_count: float = Field(..., ge=0)
    hint_count: float = Field(..., ge=0)
    bottom_hint: float = Field(..., ge=0, le=1)
    ms_first_response: float = Field(..., ge=0)
    first_action: Literal[0, 1, 2]
    session_duration: float = Field(..., ge=0)
    is_scaffold: float = Field(..., ge=0, le=1)
    Average_confidence_FRUSTRATED: float = Field(..., alias="Average_confidence(FRUSTRATED)", ge=0, le=1)
    Average_confidence_CONFUSED: float = Field(..., alias="Average_confidence(CONFUSED)", ge=0, le=1)
    Average_confidence_CONCENTRATING: float = Field(..., alias="Average_confidence(CONCENTRATING)", ge=0, le=1)
    Average_confidence_BORED: float = Field(..., alias="Average_confidence(BORED)", ge=0, le=1)

    class Config:
        populate_by_name = True


def _first_existing_file(candidates: list[Path]) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Missing artifact. Checked: {', '.join(str(path) for path in candidates)}")


@lru_cache(maxsize=1)
def _load_json_list(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8") as file_handle:
        data = json.load(file_handle)
    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON list in {path}")
    return [str(item) for item in data]


def _load_json_data(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def _load_state() -> dict[str, Any]:
    try:
        import numpy as np
        from tensorflow.keras.models import load_model
    except ModuleNotFoundError as exc:
        return {
            "load_error": str(exc),
            "model": None,
            "scaler": None,
            "feature_columns": [],
            "skills": [],
            "problem_types": [],
            "feature_importance": None,
            "shap_background": None,
        }

    model_path = _first_existing_file(MODEL_FILE_CANDIDATES)
    scaler_path = _first_existing_file(SCALER_FILE_CANDIDATES)

    feature_columns_path = None
    for candidate in FEATURE_COLUMNS_FILE_CANDIDATES:
        if candidate.exists():
            feature_columns_path = candidate
            break

    state: dict[str, Any] = {
        "model": load_model(model_path),
        "scaler": joblib.load(scaler_path),
        "feature_columns": _load_json_list(feature_columns_path) if feature_columns_path else [],
        "skills": _load_json_list(_first_existing_file(SKILLS_FILE_CANDIDATES)) if any(path.exists() for path in SKILLS_FILE_CANDIDATES) else [],
        "problem_types": _load_json_list(_first_existing_file(PROBLEM_TYPES_FILE_CANDIDATES)) if any(path.exists() for path in PROBLEM_TYPES_FILE_CANDIDATES) else [],
        "feature_importance": _load_json_data(_first_existing_file(FEATURE_IMPORTANCE_FILE_CANDIDATES)) if any(path.exists() for path in FEATURE_IMPORTANCE_FILE_CANDIDATES) else None,
        "shap_background": np.load(_first_existing_file(SHAP_BACKGROUND_FILE_CANDIDATES), allow_pickle=False) if any(path.exists() for path in SHAP_BACKGROUND_FILE_CANDIDATES) else None,
    }
    return state


state: dict[str, Any] = {}


def create_app() -> FastAPI:
    app = FastAPI(title="Intelligent Student Learning Path Recommendation System")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[DEFAULT_FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        global state
        state = _load_state()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/skills")
    def get_skills() -> dict[str, list[str]]:
        return {"skills": state.get("skills", [])}

    @app.get("/problem_types")
    def get_problem_types() -> dict[str, list[str]]:
        return {"problem_types": state.get("problem_types", [])}

    @app.post("/predict")
    def predict(request: PredictRequest) -> dict[str, Any]:
        _ensure_state_loaded()

        encoded = _prepare_model_row(request)
        probability = float(state["model"].predict(encoded, verbose=0)[0][0])
        prediction = "correct" if probability >= 0.5 else "incorrect"
        confidence_label = _confidence_label(probability, prediction)

        return {
            "probability": probability,
            "prediction": prediction,
            "confidence_label": confidence_label,
        }

    @app.post("/explain")
    def explain(request: PredictRequest) -> dict[str, Any]:
        _ensure_state_loaded()

        if state.get("feature_importance"):
            return {
                "mode": "global_importance",
                "note": "This is global feature importance, not a per-student SHAP explanation.",
                "features": _top_global_importance(state["feature_importance"], limit=5),
            }

        shap_background = state.get("shap_background")
        if shap_background is not None:
            try:
                import shap
            except Exception:
                return {
                    "mode": "global_importance",
                    "note": "SHAP is unavailable in the runtime, so this is global feature importance.",
                    "features": [],
                }

            row = _prepare_model_row(request)
            background = pd.DataFrame(shap_background, columns=state["feature_columns"])
            background = background.sample(min(len(background), 100), random_state=42)

            def predict_fn(values: np.ndarray) -> np.ndarray:
                values_df = pd.DataFrame(values, columns=state["feature_columns"])
                return state["model"].predict(values_df.astype("float32"), verbose=0).reshape(-1)

            explainer = shap.KernelExplainer(predict_fn, background)
            shap_values = explainer.shap_values(row, nsamples=100)
            contributions = np.asarray(shap_values)
            if contributions.ndim == 3:
                contributions = contributions[0]
            if contributions.ndim == 2:
                contributions = contributions[0]

            ranked_features = []
            for feature_name, contribution in zip(state["feature_columns"], contributions):
                ranked_features.append(
                    {
                        "feature": feature_name,
                        "impact": float(abs(contribution)),
                        "direction": "correct" if contribution >= 0 else "incorrect",
                    }
                )
            ranked_features.sort(key=lambda item: item["impact"], reverse=True)

            return {
                "mode": "shap",
                "note": "Per-student explanation generated with SHAP KernelExplainer.",
                "features": ranked_features[:5],
            }

        return {
            "mode": "global_importance",
            "note": "No SHAP background file was found, so this is global feature importance.",
            "features": _top_global_importance(state.get("feature_importance"), limit=5),
        }

    return app


def _ensure_state_loaded() -> None:
    if not state:
        raise HTTPException(status_code=503, detail="Model artifacts are not loaded")

    if state.get("load_error"):
        raise HTTPException(status_code=503, detail=f"Backend dependencies are incomplete: {state['load_error']}")

    if state.get("model") is None or state.get("scaler") is None:
        raise HTTPException(status_code=503, detail="Model artifacts are not loaded")


def _prepare_model_row(request: PredictRequest) -> pd.DataFrame:
    if not state.get("feature_columns"):
        raise HTTPException(status_code=503, detail="feature_columns.json is missing from model_artifacts")

    import pandas as pd

    raw_payload = request.model_dump(by_alias=True)
    row = pd.DataFrame([raw_payload])
    row["first_action"] = row["first_action"].astype(str)

    encoded = pd.get_dummies(row, columns=["skill", "problem_type", "first_action"])
    encoded = encoded.reindex(columns=state["feature_columns"], fill_value=0)

    missing_numeric_columns = [column for column in NUMERIC_COLUMNS if column not in encoded.columns]
    if missing_numeric_columns:
        raise HTTPException(
            status_code=500,
            detail=f"Training columns are missing required numeric features: {missing_numeric_columns}",
        )

    encoded[NUMERIC_COLUMNS] = state["scaler"].transform(encoded[NUMERIC_COLUMNS])
    return encoded.astype("float32")


def _confidence_label(probability: float, prediction: str) -> str:
    if prediction == "correct":
        if probability >= 0.85:
            return "high confidence in correct"
        if probability >= 0.65:
            return "moderate confidence in correct"
        return "low confidence in correct"

    inverse_probability = 1.0 - probability
    if inverse_probability >= 0.85:
        return "high confidence in incorrect"
    if inverse_probability >= 0.65:
        return "moderate confidence in incorrect"
    return "low confidence in incorrect"


def _top_global_importance(feature_importance: Any, limit: int = 5) -> list[dict[str, Any]]:
    if not feature_importance:
        return []

    items: list[dict[str, Any]] = []
    if isinstance(feature_importance, dict):
        iterable = feature_importance.items()
    elif isinstance(feature_importance, list):
        iterable = ((entry.get("feature"), entry.get("importance")) for entry in feature_importance if isinstance(entry, dict))
    else:
        return []

    for feature_name, importance in iterable:
        if feature_name is None:
            continue
        items.append({"feature": str(feature_name), "impact": float(abs(float(importance))), "direction": "global"})

    items.sort(key=lambda item: item["impact"], reverse=True)
    return items[:limit]


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
