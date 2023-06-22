import type { PrismaBase, Types } from "@gloo/database";
import { Prisma, uuidGen } from "@gloo/database";
import { prisma } from "@gloo/database";

import { notEmpty } from "../../parsers";
import type { LLMOptionsInterface, Pipeline } from "../types";

import type { Input } from "./input";
import type { NormalizationResult } from "./normalizer";
import type { IPredictionResult, IPredictor } from "./predictorBase";
import type { IKlassManager } from "./klassBase";
import {
  FineTunedPredictionResult,
  FineTunedPredictor,
} from "./predictorFineTuned";
import { LLMPredictionResult, LLMPredictor } from "./predictorLLM";

class CompositePredictor implements IPredictor {
  constructor(public predictors: [IPredictor, ...IPredictor[]]) {}

  public async options(): Promise<{
    options: Types.TraditionalClassifierOptions | Types.LLMClassifierOptions;
    supportedKlasses: Types.SupportedKlasses;
    blacklistedKlassIds: string[];
  }> {
    throw new Error("Composite predictor does not have options");
  }

  static fromPipeline(
    pipeline: Pipeline,
    llmConfig: LLMOptionsInterface | null
  ): CompositePredictor {
    const predictors = [
      FineTunedPredictor.fromPipeline(pipeline),
      LLMPredictor.fromPipeline(pipeline, llmConfig),
    ].filter(notEmpty);
    if (predictors.length === 0) {
      throw new Error("Composite predictor must have at least one predictor");
    }
    return new CompositePredictor(predictors as [IPredictor, ...IPredictor[]]);
  }

  // Composite predictors don't have IDs
  public id(): string | null {
    return null;
  }

  private async loadFromCache(
    input: Input,
    normalizedInput: NormalizationResult | null
  ) {
    if (
      input.id &&
      (!normalizedInput || normalizedInput.id?.normalizedInputTextId)
    ) {
      const predictorIds = this.predictors.map((p) => p.id()).filter(notEmpty);
      if (predictorIds.length === this.predictors.length) {
        return await prisma.predictionRequest.findFirst({
          where: {
            inputTextId: input.id,
            normalizedInputTextId: normalizedInput?.id?.normalizedInputTextId,
            predictorIds: {
              hasEvery: predictorIds,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            predictions: true,
          },
          take: 1,
        });
      }
    }

    return null;
  }

  public async run(
    input: Input,
    normalizedInput: NormalizationResult | null,
    klassManager: IKlassManager,
    _priors: Promise<IPredictionResult>[],
    startTime?: number
  ): Promise<CompositePredictionResult> {
    const now = startTime ?? Date.now();
    if (_priors.length) {
      throw new Error("Composite predictors cannot have priors");
    }
    const cached = await this.loadFromCache(input, normalizedInput);
    if (cached) {
      new CompositePredictionResult(
        cached.id,
        cached.status,
        cached.latencyMs,
        cached.predictions.map((p): IPredictionResult => {
          const predictor = this.predictors.find(
            (_p) => _p.id() === p.predictorId
          );

          if (!predictor) {
            throw new Error(
              `Predictor ${p.predictorId} not found for prediction ${p.id}`
            );
          }

          switch (p.predictorType) {
            case "LLM":
              return LLMPredictionResult.fromPrediction(
                p,
                predictor as LLMPredictor
              );
            case "FT":
              return FineTunedPredictionResult.fromPrediction(
                p,
                predictor as FineTunedPredictor
              );
            default:
              throw new Error(
                `Unknown predictor type ${p.predictorType} for prediction ${p.id}`
              );
          }
        })
      );
    }

    const priors: Promise<IPredictionResult>[] = [];
    this.predictors.forEach((p) => {
      const awaiter = p.run(input, normalizedInput, klassManager, [...priors]);
      priors.push(awaiter);
    });
    const result = await Promise.all(priors);
    const latencyMs = Date.now() - now;

    const shouldFail = (
      await Promise.all(
        this.predictors.map(async (p, index) => {
          const r = result[index];
          if (!r) {
            // Something is wrong.
            return true;
          }
          switch (r.status) {
            case "PASS":
              return false;
            case "FAIL_PARENT":
              return true;
            case "FAIL":
              return (await p.options()).options.failureMode == "THROW";
          }
        })
      )
    ).some((r) => r);

    return new CompositePredictionResult(
      null,
      shouldFail ? "FAIL" : "PASS",
      latencyMs,
      result
    );
  }
}

class CompositePredictionResult implements IPredictionResult {
  constructor(
    public id: string | null,
    public status: PrismaBase.Status,
    public latencyMs: number,
    private readonly results: IPredictionResult[]
  ) {}

  public getId(): string {
    if (!this.id) {
      this.id = uuidGen("prediction");
    }
    return this.id;
  }

  public get type(): PrismaBase.PredictorType {
    throw new Error("Composite predictors don't have IDs");
  }

  public get predictorId(): string {
    throw new Error("Composite predictors don't have IDs");
  }

  public forEach(
    callback: (
      result: IPredictionResult,
      prediction: NonNullable<IPredictionResult["predictions"]>[0]
    ) => void
  ): void {
    this.results.forEach((r) => {
      if (r.predictions) {
        r.predictions.forEach((p) => {
          callback(r, p);
        });
      }
    });
  }

  public get predictions() {
    return this.results
      .map((r) => r.predictions)
      .filter(notEmpty)
      .flatMap((r) => r);
  }

  public async details(klassManager: IKlassManager) {
    return (
      await Promise.all(this.results.map((r) => r.details(klassManager)))
    ).flatMap((r) => r);
  }

  public async save(
    pipeline: Pipeline,
    requestMetadata: Types.RequestMetadata,
    input: Input,
    normalizerResult: NormalizationResult | null,
    config: { id: string; version: number },
    llmTargetName?: string,
    startTime?: number
  ): Promise<string> {
    if (!this.id) {
      const predictorIds = this.results.map((r) => r.predictorId);
      const inputTextId = await input.save(pipeline, requestMetadata);
      const normalizedInputTextId = await normalizerResult?.save(
        pipeline,
        requestMetadata,
        input
      );

      // update latencyMs
      if (startTime) {
        this.latencyMs = Date.now() - startTime;
      }

      const requestId = this.getId();
      await prisma.predictionRequest.create({
        data: {
          id: requestId,
          requestMetadata: requestMetadata,
          inputTextId,
          normalizedInputTextId,
          predictorIds,
          classifierId: pipeline.classifierId,
          classifierConfigId: config.id,
          classifierConfigVersionId: config.version,
          status: this.status,
          llmTargetName,
          latencyMs: this.latencyMs,
          predictions: {
            createMany: {
              data: this.results.map((r) => {
                return {
                  id: r.getId(),
                  prediction: r.predictions ?? Prisma.JsonNull,
                  predictorType: r.type,
                  predictorId: r.predictorId,
                  status: r.status,
                  hallucination: r.hallucinations ?? Prisma.JsonNull,
                  latencyMs: r.latencyMs,
                  llmMeta: r.llmMeta ?? Prisma.JsonNull,
                };
              }),
            },
          },
        },
      });
    }

    return this.getId();
  }
}

export { CompositePredictor, CompositePredictionResult };
