# Model Artifacts

This folder holds the runtime files used by the backend and UI.

## Files

- student_success_model.keras - trained Keras model
- student_scaler.pkl - fitted StandardScaler
- feature_columns.json - exact one-hot encoded column order used during training
- skills.json - dropdown values for the UI
- problem_types.json - dropdown values for the UI
- feature_importance.json - fallback explanation data when SHAP is not available
- shap_background.npy - optional SHAP background sample for per-student explanations

## Important

The training notebook used `pd.get_dummies(..., drop_first=True)` and a 214-column model input. Replace the placeholder JSON files here with the exact exported training artifacts if you want production-accurate predictions.
