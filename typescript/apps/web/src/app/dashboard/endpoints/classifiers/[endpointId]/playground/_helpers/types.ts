import type { Types } from "@gloo/database";

import type { getClassifier } from "@/app/actions/classifiers";
import type { getLLMKeysSafe } from "@/app/actions/secrets";

export type EditableConfig = {
  testInputs: {
    items: {
      id: string | null; // undefined means new
      text: string;
    }[];
  };
  normalizer: {
    options: Types.NormalizerOptions;
  } | null;
  fineTunedPredictor: null;
  llmPredictor: {
    options: Types.LLMClassifierOptions;
  } | null;
};

export type Classifier = Awaited<ReturnType<typeof getClassifier>>;
export type LLMTargets = Awaited<ReturnType<typeof getLLMKeysSafe>>;
