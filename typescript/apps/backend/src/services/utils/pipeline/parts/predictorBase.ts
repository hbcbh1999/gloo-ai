import type { Types, PrismaBase } from "@gloo/database";

import type { Input } from "./input";
import type { NormalizationResult } from "./normalizer";
import type { IKlassManager } from "./klassBase";
import { DetailsUnion } from "@/api/generated/api/resources/v1";

interface IPredictor {
  id(): string | null;

  options(): Promise<{
    options: Types.TraditionalClassifierOptions | Types.LLMClassifierOptions;
    supportedKlasses: Types.SupportedKlasses;
    blacklistedKlassIds: string[];
  }>;

  run(
    input: Input,
    normalizedInput: NormalizationResult | null,
    klassManager: IKlassManager,
    priors: Promise<IPredictionResult>[],
    startTime?: number
  ): Promise<IPredictionResult>;
}

interface IPredictionResult {
  getId(): string;
  id: string | null;
  predictorId: string;
  details(klassManager: IKlassManager): Promise<DetailsUnion[]>;
  predictions?: ReadonlyArray<Types.PredictionResult[0]>;
  type: PrismaBase.PredictorType;
  status: PrismaBase.Status;
  latencyMs: number;
  hallucinations?: Types.Hallucinations;
  llmMeta?: Types.LLMClassificationResponse;
}

export type { IPredictor, IPredictionResult };
