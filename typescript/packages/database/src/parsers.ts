import * as uuid from "uuid";

function uuidGen(
  prefix:
    | "ep"
    | "config"
    | "llmClassifier"
    | "ftClassifier"
    | "normalizer"
    | "klass"
    | "input"
    | "input_normalized"
    | "prediction"
    | "hi_predictor"
): string {
  return `${prefix}_${uuid.v4().replace(/-/g, "")}`;
}

export { uuidGen };
