import type { PrismaBase } from "@gloo/database";
import { uuidGen } from "@gloo/database";
import { prisma, Types } from "@gloo/database";

import { notEmpty } from "../../parsers";
import { llmClassification } from "../../LLMApi";
import type { LLMOptionsInterface, Pipeline } from "../types";

import type { Input } from "./input";
import type { NormalizationResult } from "./normalizer";
import type { IPredictionResult, IPredictor } from "./predictorBase";
import type { IKlassManager } from "./klassBase";
import { DetailsUnion } from "@/api/generated/api/resources/v1";

class LLMPredictor implements IPredictor {
  private _metadata: PrismaBase.Predictor | null = null;

  constructor(
    public _id: string | null,
    private content: {
      options: Types.LLMClassifierOptions;
      supportedKlasses: Types.SupportedKlasses;
      blacklistedKlassIds: string[];
    } | null,
    private llmConfig: LLMOptionsInterface
  ) {}

  static fromPipeline(
    pipeline: Pipeline,
    llmConfig: LLMOptionsInterface | null
  ): IPredictor | null {
    if (!pipeline.llmPredictor) return null;

    if (!llmConfig) {
      throw new Error("Must configure LLM config");
    }

    if ("predictorId" in pipeline.llmPredictor) {
      return new LLMPredictor(
        pipeline.llmPredictor.predictorId,
        null,
        llmConfig
      );
    }
    return new LLMPredictor(
      null,
      {
        options: pipeline.llmPredictor.options,
        supportedKlasses: pipeline.llmPredictor.supportedKlasses,
        blacklistedKlassIds: pipeline.llmPredictor.blacklistedKlasses,
      },
      llmConfig
    );
  }

  public id() {
    return this._id;
  }

  private async loadFromCache(): Promise<NonNullable<typeof this.content>> {
    if (this.content) return this.content;
    if (!this._id) {
      throw new Error("Must configure ID");
    }
    this._metadata = await prisma.predictor.findUniqueOrThrow({
      where: {
        id: this._id,
      },
    });
    if (this._metadata.type !== "LLM") {
      throw new Error("Invalid predictor type");
    }
    if (!this._metadata.llmOptions || !this._metadata.supportedKlasses) {
      throw new Error("Invalid predictor options");
    }
    const options = Types.zLLMClassifierOptionsSchema.parse(
      this._metadata.llmOptions
    );
    const supportedKlasses = Types.zSupportedKlasses.parse(
      this._metadata.supportedKlasses
    );
    const blacklistedKlassIds = this._metadata.blacklistedKlassIds;
    this.content = {
      options,
      supportedKlasses,
      blacklistedKlassIds,
    };
    return this.content;
  }

  public async options(): Promise<NonNullable<typeof this.content>> {
    return await this.loadFromCache();
  }

  public async run(
    input: Input,
    normalizedInput: NormalizationResult | null,
    klassManager: IKlassManager,
    priors: Promise<IPredictionResult>[],
    _startTime?: number
  ): Promise<IPredictionResult> {
    try {
      // Be as greedy as possible and see if we can find a normalizedInputText
      const [text, config] = await Promise.all([
        normalizedInput ? normalizedInput.text() : input.data(),
        this.options(),
      ]);

      const priorAttempts =
        config.options.skipPriorAvailableKlasses ||
        config.options.addPriorSelectedKlasses
          ? (await Promise.all(priors)).flatMap((p) => p?.predictions ?? [])
          : [];

      const klassesToSkip = new Set<string>();
      const klassesToInclude = new Set<string>();
      if (config.options.skipPriorAvailableKlasses) {
        priorAttempts.forEach((p) => {
          klassesToSkip.add(p.id);
        });
      }
      if (config.options.addPriorSelectedKlasses) {
        priorAttempts.forEach((p) => {
          if (p.selected) {
            klassesToInclude.add(p.id);
            klassesToSkip.delete(p.id);
          }
        });
      }
      const selectedKlasses = await klassManager.all(
        config.supportedKlasses
          .map((k) => {
            if (klassesToSkip.has(k.id)) return null;
            return k;
          })
          .filter(notEmpty)
      );

      const now = new Date().getTime();
      const llmResponse = await llmClassification(
        this.llmConfig,
        {
          ...config.options,
          failureMode: "IGNORE",
        },
        selectedKlasses,
        text
      );
      const selectedIds = new Set(llmResponse.selectedIds);

      const latencyMs = new Date().getTime() - now;

      // We actually need to compute the result here.
      return new LLMPredictionResult(
        null,
        this,
        llmResponse.success ? "PASS" : "FAIL",
        selectedKlasses.map((k) => ({
          ...k,
          selected:
            selectedIds.has(k.id) && !config.blacklistedKlassIds.includes(k.id),
          confidence: selectedIds.has(k.id) ? 1 : 0,
        })),
        latencyMs,
        llmResponse.hallucinations.map((h) => ({
          klassName: h,
        })),
        {
          reasoning: llmResponse.reasoning,
          clues: llmResponse.clues,
          tokenUsage: llmResponse.meta?.tokenUsage,
        }
      );
    } catch (e) {
      return new LLMPredictionResult(null, this, "FAIL_PARENT", [], 0, [], {
        reasoning: "",
        clues: "",
      });
    }
  }
}

class LLMPredictionResult implements IPredictionResult {
  constructor(
    public id: string | null,
    private predictor: LLMPredictor,
    public status: PrismaBase.Status,
    public predictions: Types.PredictionResult,
    public latencyMs: number,
    public hallucinations: Types.Hallucinations,
    public llmMeta: Types.LLMClassificationResponse
  ) {}

  static fromPrediction(
    p: PrismaBase.Prediction,
    predictor: LLMPredictor
  ): IPredictionResult {
    if (p.predictorType !== "LLM") {
      throw new Error("Invalid predictor type");
    }

    return new LLMPredictionResult(
      p.id,
      predictor,
      p.status,
      Types.zPredictionResult.parse(p.prediction),
      p.latencyMs,
      Types.zHallucinations.parse(p.hallucination),
      Types.zLLMClassificationResponseSchema.parse(p.llmMeta)
    );
  }

  public get type(): "LLM" {
    return "LLM";
  }

  public getId(): string {
    if (!this.id) {
      this.id = uuidGen("prediction");
    }
    return this.id;
  }

  public async details(klassManager: IKlassManager): Promise<DetailsUnion[]> {
    const klasses = await klassManager.all(this.predictions);
    return [
      {
        type: "llm",
        predictorId: this.predictor.id() ?? "local_llm_predictor",
        latencyMs: this.latencyMs,
        predictorType: this.type,
        tokensUsed: this.llmMeta.tokenUsage?.totalTokens ?? 0,
        hallucinations: this.hallucinations.map(({ klassName }) => klassName),
        reasoning: this.llmMeta.reasoning,
        status: this.status,
        classes: this.predictions
          .map((p) => {
            const found = klasses.find(
              (k) => k.id === p.id && k.version === p.version
            );
            if (!found) return null;
            return {
              klassId: p.id,
              klassVersion: p.version,
              klassName: found.name,
              klassDescription: found.description,
              confidence: p.confidence,
              selected: p.selected,
            };
          })
          .filter(notEmpty),
      },
    ];
  }

  public get predictorId(): string {
    const id = this.predictor.id();
    if (!id) {
      throw new Error("Id not configured");
    }
    return id;
  }
}

export { LLMPredictor, LLMPredictionResult };
