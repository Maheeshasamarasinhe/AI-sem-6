export type PredictionResponse = {
  probability: number;
  prediction: "correct" | "incorrect";
  confidence_label: string;
};

export type ExplainFeature = {
  feature: string;
  impact: number;
  direction?: string;
};

export type ExplainResponse = {
  mode: "shap" | "global_importance";
  note: string;
  features: ExplainFeature[];
};

export type PredictFormState = {
  skill: string;
  problem_type: string;
  attempt_count: number;
  hint_count: number;
  bottom_hint: number;
  ms_first_response: number;
  first_action: "0" | "1" | "2";
  session_duration: number;
  is_scaffold: number;
  Average_confidence_FRUSTRATED: number;
  Average_confidence_CONFUSED: number;
  Average_confidence_CONCENTRATING: number;
  Average_confidence_BORED: number;
};
