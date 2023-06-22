import { readFileSync } from "fs";

interface Config {
  GLOO_SERVICE_PORT: number;
  TABLE_SECRETS: string;
  TABLE_CLASSIFIERS: string;
  TABLE_CLASSES: string;
  TABLE_DATAPOINTS: string;
  TABLE_ML_MODELS: string;
  BUCKET_ML_MODELS: string;
  TABLE_ORGS: string;
  TABLE_QA: string;
  AWS_REGION: string;
  OPENAI_KEY: string;
  STAGE: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PRICING_PLAN: string;
}

export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

const throwMissingEnv = (key: string) => {
  throw new Error(`Missing environment variable: ${key}`);
};

const getEnvInt = (key: KeysOfType<Config, number>) => {
  const v = process.env[key];
  return process.env[key] ? parseInt(v!) : throwMissingEnv(key);
};

const getEnvBool = (key: KeysOfType<Config, boolean>) => {
  const v = process.env[key];
  return process.env[key] ? !!parseInt(v!) : throwMissingEnv(key);
};

const getEnvString = (key: KeysOfType<Config, string>): string => {
  const s = process.env[key] ? process.env[key] : throwMissingEnv(key);
  if (!s) {
    throw new Error(`Missing config: ${key}`);
  }
  return s;
};

const getResourceName = (stage: string, resourceName: string) => {
  return `${stage}-${resourceName}`;
};

const currentStage = getEnvString("STAGE");
console.log("Initializing with stage: ", currentStage);

const config: Config = {
  GLOO_SERVICE_PORT: getEnvInt("GLOO_SERVICE_PORT"),
  TABLE_SECRETS: getResourceName(currentStage, getEnvString("TABLE_SECRETS")),
  TABLE_CLASSIFIERS: getResourceName(
    currentStage,
    getEnvString("TABLE_CLASSIFIERS")
  ),
  TABLE_CLASSES: getResourceName(currentStage, getEnvString("TABLE_CLASSES")),
  TABLE_ML_MODELS: getResourceName(
    currentStage,
    getEnvString("TABLE_ML_MODELS")
  ),
  TABLE_DATAPOINTS: getResourceName(
    currentStage,
    getEnvString("TABLE_DATAPOINTS")
  ),
  TABLE_ORGS: getResourceName(currentStage, getEnvString("TABLE_ORGS")),
  TABLE_QA: getResourceName(currentStage, getEnvString("TABLE_QA")),
  BUCKET_ML_MODELS: getResourceName(
    currentStage,
    getEnvString("BUCKET_ML_MODELS")
  ),
  AWS_REGION: getEnvString("AWS_REGION"),
  OPENAI_KEY: getEnvString("OPENAI_KEY"),
  STAGE: currentStage,
  STRIPE_SECRET_KEY: getEnvString("STRIPE_SECRET_KEY"),
  STRIPE_PRICING_PLAN: getEnvString("STRIPE_PRICING_PLAN"),
};

export default config;
