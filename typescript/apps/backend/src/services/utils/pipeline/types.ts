import type { Types, PrismaBase } from "@gloo/database";

export type PipelineInput =
  | {
      text: string;
    }
  | {
      inputId: string;
    };

export type Pipeline = {
  classifierId: string;
} & {
  normalizer:
    | {
        normalizerId: string;
      }
    | {
        options: Types.NormalizerOptions;
      }
    | null;
  fineTunedPredictor:
    | {
        predictorId: string;
      }
    | {
        options: Types.TraditionalClassifierOptions;
        supportedKlasses: Types.SupportedKlasses;
        blacklistedKlasses: string[];
      }
    | null;
  llmPredictor:
    | {
        predictorId: string;
      }
    | {
        options: Types.LLMClassifierOptions;
        supportedKlasses: Types.SupportedKlasses;
        blacklistedKlasses: string[];
      }
    | null;
  klassList: {
    id: string;
    version: number;
    name: string;
    description: string;
  }[];
};

export interface KlassPrediction {
  klassId: string;
  versionId: number;
  score: number;
  selected: boolean;
}

export type KlassMap = ReadonlyMap<
  { klassId: string; version: number },
  { name: string; description: string }
>;

export type PredictionResult =
  | {
      predictorId: string;
      type: PrismaBase.PredictorType;
      predictions: KlassPrediction[];
    }
  | {
      predictorId: string;
      type: PrismaBase.PredictorType;
      error: string;
    }
  | null;

export type PipelineOutput = {
  normalizer:
    | {
        text: string;
        normalizerId: string | null;
      }
    | {
        error: string;
      };
  predictions: NonNullable<PredictionResult>[];
};

export interface LLMOptionsInterface {
  name: string;
  provider: PrismaBase.LLMProvider;
  apiBaseUrl: string;
  apiKey: string;
}
