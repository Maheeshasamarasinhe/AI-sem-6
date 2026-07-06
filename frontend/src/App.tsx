import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ExplainResponse,
  PredictFormState,
  PredictionResponse,
} from "./types";

type OptionState = {
  skills: string[];
  problemTypes: string[];
};

type ResultState = PredictionResponse | null;

type ExplainState = ExplainResponse | null;

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const defaultForm: PredictFormState = {
  skill: "",
  problem_type: "",
  attempt_count: 1,
  hint_count: 0,
  bottom_hint: 0,
  ms_first_response: 1000,
  first_action: "0",
  session_duration: 10,
  is_scaffold: 0,
  Average_confidence_FRUSTRATED: 0.2,
  Average_confidence_CONFUSED: 0.2,
  Average_confidence_CONCENTRATING: 0.6,
  Average_confidence_BORED: 0.1,
};

const confidenceLabel = (value: number) => {
  if (value < 0.34) return "Low";
  if (value < 0.67) return "Medium";
  return "High";
};

const confidenceTone = (value: number) => {
  if (value < 0.34) return "bg-slate-100 text-slate-700 border-slate-200";
  if (value < 0.67) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
};

const probabilityText = (probability: number) =>
  `${Math.round(probability * 100)}%`;

const interpret = (result: PredictionResponse, form: PredictFormState) => {
  if (result.prediction === "incorrect") {
    if (form.Average_confidence_CONFUSED >= 0.66 || form.hint_count >= 2) {
      return "This student is likely to struggle. High confusion and repeated hint requests are strong signals.";
    }
    return "This student is likely to struggle based on the current behavioral pattern.";
  }

  if (form.Average_confidence_CONCENTRATING >= 0.66 && form.hint_count <= 1) {
    return "This student is likely to answer correctly. Strong concentration and low hint usage support success.";
  }

  return "This student is likely to answer correctly based on the current input pattern.";
};

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
};

export default function App() {
  const [form, setForm] = useState<PredictFormState>(defaultForm);
  const [options, setOptions] = useState<OptionState>({
    skills: [],
    problemTypes: [],
  });
  const [result, setResult] = useState<ResultState>(null);
  const [explain, setExplain] = useState<ExplainState>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");

  useEffect(() => {
    void Promise.all([
      fetchJson<{ skills: string[] }>("/skills"),
      fetchJson<{ problem_types: string[] }>("/problem_types"),
    ])
      .then(([skillsResponse, problemTypesResponse]) => {
        setOptions({
          skills: skillsResponse.skills ?? [],
          problemTypes: problemTypesResponse.problem_types ?? [],
        });
        setForm((current) => ({
          ...current,
          skill: skillsResponse.skills?.[0] ?? "",
          problem_type: problemTypesResponse.problem_types?.[0] ?? "",
        }));
      })
      .catch(() => {
        setApiError(
          "Unable to load dropdown values from the API. Check that the backend is running.",
        );
      });
  }, []);

  const chartData = useMemo(() => {
    if (!explain?.features?.length) return [];
    return explain.features.map((item) => ({
      name: item.feature,
      impact: Number((item.impact * 100).toFixed(2)),
      direction: item.direction ?? "global",
    }));
  }, [explain]);

  const updateNumber = (key: keyof PredictFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: Number(value),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setApiError("");
    setMessage("");
    setExplain(null);

    try {
      const predictResponse = await fetchJson<PredictionResponse>("/predict", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          first_action: Number(form.first_action),
          "Average_confidence(FRUSTRATED)": form.Average_confidence_FRUSTRATED,
          "Average_confidence(CONFUSED)": form.Average_confidence_CONFUSED,
          "Average_confidence(CONCENTRATING)":
            form.Average_confidence_CONCENTRATING,
          "Average_confidence(BORED)": form.Average_confidence_BORED,
        }),
      });

      setResult(predictResponse);
      setMessage(interpret(predictResponse, form));

      const explainResponse = await fetchJson<ExplainResponse>("/explain", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          first_action: Number(form.first_action),
          "Average_confidence(FRUSTRATED)": form.Average_confidence_FRUSTRATED,
          "Average_confidence(CONFUSED)": form.Average_confidence_CONFUSED,
          "Average_confidence(CONCENTRATING)":
            form.Average_confidence_CONCENTRATING,
          "Average_confidence(BORED)": form.Average_confidence_BORED,
        }),
      });

      setExplain(explainResponse);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Prediction request failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resultTone =
    result?.prediction === "correct"
      ? "text-emerald-700 bg-emerald-100 border-emerald-200"
      : "text-rose-700 bg-rose-100 border-rose-200";

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 md:text-2xl">
              Intelligent Student Learning Path Recommendation System
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft animate-fadeUp">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Predict</h2>
              <p className="mt-1 text-sm text-slate-600">
                Enter a single student attempt to estimate the probability of a
                correct answer.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-700">
                  Problem context
                </legend>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Skill"
                    value={form.skill}
                    options={options.skills}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, skill: value }))
                    }
                  />
                  <SelectField
                    label="Problem type"
                    value={form.problem_type}
                    options={options.problemTypes}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        problem_type: value,
                      }))
                    }
                  />
                  <SelectField
                    label="First action"
                    value={form.first_action}
                    options={[
                      { label: "0", value: "0" },
                      { label: "1", value: "1" },
                      { label: "2", value: "2" },
                    ]}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        first_action: value as "0" | "1" | "2",
                      }))
                    }
                  />
                  <ToggleField
                    label="Is scaffold"
                    value={form.is_scaffold}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, is_scaffold: value }))
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-700">
                  Behavior
                </legend>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <NumberField
                    label="Attempt count"
                    value={form.attempt_count}
                    onChange={(value) => updateNumber("attempt_count", value)}
                  />
                  <NumberField
                    label="Hint count"
                    value={form.hint_count}
                    onChange={(value) => updateNumber("hint_count", value)}
                  />
                  <ToggleField
                    label="Bottom hint"
                    value={form.bottom_hint}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, bottom_hint: value }))
                    }
                  />
                  <NumberField
                    label="ms first response"
                    value={form.ms_first_response}
                    onChange={(value) =>
                      updateNumber("ms_first_response", value)
                    }
                  />
                  <NumberField
                    label="Session duration (seconds)"
                    value={form.session_duration}
                    onChange={(value) =>
                      updateNumber("session_duration", value)
                    }
                  />
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-700">
                  Affective state
                </legend>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <SliderField
                    label="Frustrated"
                    value={form.Average_confidence_FRUSTRATED}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        Average_confidence_FRUSTRATED: value,
                      }))
                    }
                  />
                  <SliderField
                    label="Confused"
                    value={form.Average_confidence_CONFUSED}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        Average_confidence_CONFUSED: value,
                      }))
                    }
                  />
                  <SliderField
                    label="Concentrating"
                    value={form.Average_confidence_CONCENTRATING}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        Average_confidence_CONCENTRATING: value,
                      }))
                    }
                  />
                  <SliderField
                    label="Bored"
                    value={form.Average_confidence_BORED}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        Average_confidence_BORED: value,
                      }))
                    }
                  />
                </div>
              </fieldset>

              {apiError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {apiError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !form.skill || !form.problem_type}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Predicting..." : "Run Prediction"}
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft animate-fadeUp">
            <h2 className="text-xl font-semibold text-slate-900">Result</h2>
            {result ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-end gap-4">
                  <div className="text-5xl font-bold tracking-tight text-slate-900">
                    {probabilityText(result.probability)}
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${resultTone}`}
                  >
                    {result.prediction}
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {result.confidence_label}
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {message}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Submit the form to see the model output here.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft animate-fadeUp">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Why</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Top contribution summary from the explanation endpoint.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {explain?.mode === "shap" ? "Per-student" : "Global fallback"}
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis type="category" dataKey="name" width={130} />
                    <Tooltip />
                    <Bar dataKey="impact" radius={[0, 10, 10, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.direction === "incorrect"
                              ? "#ef4444"
                              : entry.direction === "correct"
                                ? "#22c55e"
                                : "#64748b"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                The explanation chart will appear after you run a prediction.
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => {
          const optionValue =
            typeof option === "string" ? option : option.value;
          const optionLabel =
            typeof option === "string" ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const enabled = value === 1;

  return (
    <button
      type="button"
      onClick={() => onChange(enabled ? 0 : 1)}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300"
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
      >
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceTone(value)}`}
        >
          {confidenceLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-blue-600"
      />
      <div className="text-xs text-slate-500">{value.toFixed(2)}</div>
    </label>
  );
}
