import type { PrismaBase } from "@gloo/database";
import { uuidGen } from "@gloo/database";
import { prisma, Types } from "@gloo/database";
import { InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";

import { sagemakerClient } from "../../../../dao/AWSClient";
import type { Pipeline } from "../types";
import { notEmpty } from "../../parsers";

import type { Input } from "./input";
import type { NormalizationResult } from "./normalizer";
import type { IPredictionResult, IPredictor } from "./predictorBase";
import type { IKlassManager } from "./klassBase";
import { DetailsUnion } from "@/api/generated/api/resources/v1";

class FineTunedPredictor implements IPredictor {
  private _metadata: PrismaBase.Predictor | null = null;

  constructor(
    public _id: string | null,
    private content: {
      options: Types.TraditionalClassifierOptions;
      supportedKlasses: Types.SupportedKlasses;
      blacklistedKlassIds: string[];
    } | null
  ) {}

  static fromPipeline(pipeline: Pipeline): IPredictor | null {
    if (!pipeline.fineTunedPredictor) return null;

    if ("predictorId" in pipeline.fineTunedPredictor) {
      return new FineTunedPredictor(
        pipeline.fineTunedPredictor.predictorId,
        null
      );
    }
    return new FineTunedPredictor(null, {
      options: pipeline.fineTunedPredictor.options,
      supportedKlasses: pipeline.fineTunedPredictor.supportedKlasses,
      blacklistedKlassIds: pipeline.fineTunedPredictor.blacklistedKlasses,
    });
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
    if (this._metadata.type !== "FT") {
      throw new Error("Invalid predictor type");
    }
    if (!this._metadata.ftOptions || !this._metadata.supportedKlasses) {
      throw new Error("Invalid predictor options");
    }
    const options = Types.zTraditionalClassifierOptionsSchema.parse(
      this._metadata.ftOptions
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
    _klassManager: IKlassManager,
    _priors: Promise<IPredictionResult>[],
    _startTime?: number
  ): Promise<IPredictionResult> {
    try {
      // Be as greedy as possible and see if we can find a normalizedInputText
      const [text, config] = await Promise.all([
        normalizedInput ? normalizedInput.text() : input.data(),
        this.options(),
      ]);

      const body = new TextEncoder().encode(
        JSON.stringify({
          inputs: text,
        })
      );

      const command = new InvokeEndpointCommand({
        EndpointName: config.options.endpoint,
        Body: body,
        ContentType: "application/json",
      });

      const now = new Date().getTime();
      try {
        const response = await sagemakerClient.send(command);
        const responseBody = new TextDecoder().decode(response.Body);

        const probabilities: number[] = JSON.parse(responseBody) as number[];
        const latencyMs = new Date().getTime() - now;
        return new FineTunedPredictionResult(
          null,
          this,
          "PASS",
          config.supportedKlasses.map((k, idx) => ({
            ...k,
            selected:
              probabilities[idx]! >= 0.5 &&
              !config.blacklistedKlassIds.includes(k.id),
            confidence: probabilities[idx]!,
          })),
          latencyMs
        );
      } catch (e) {
        const latencyMs = new Date().getTime() - now;
        return new FineTunedPredictionResult(null, this, "FAIL", [], latencyMs);
      }
    } catch (e) {
      // In this case theres no latency either.
      return new FineTunedPredictionResult(null, this, "FAIL_PARENT", [], 0);
    }
  }
}

class FineTunedPredictionResult implements IPredictionResult {
  constructor(
    public id: string | null,
    private predictor: FineTunedPredictor,
    public status: PrismaBase.Status,
    public predictions: Types.PredictionResult,
    public latencyMs: number
  ) {}

  static fromPrediction(
    p: PrismaBase.Prediction,
    predictor: FineTunedPredictor
  ): IPredictionResult {
    if (p.predictorType !== "FT") {
      throw new Error("Invalid predictor type");
    }

    return new FineTunedPredictionResult(
      p.id,
      predictor,
      p.status,
      Types.zPredictionResult.parse(p.prediction),
      p.latencyMs
    );
  }

  public get type(): "FT" {
    return "FT";
  }

  public getId(): string {
    if (!this.id) {
      this.id = uuidGen("prediction");
    }
    return this.id;
  }

  public get predictorId(): string {
    const id = this.predictor.id();
    if (!id) {
      throw new Error("Id not configured");
    }
    return id;
  }

  public async details(klassManager: IKlassManager): Promise<DetailsUnion[]> {
    const klasses = await klassManager.all(this.predictions);
    return [
      {
        type: "base",
        predictorId: this.predictor.id() ?? "local_ft_predictor",
        latencyMs: this.latencyMs,
        predictorType: this.type,
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
}

export { FineTunedPredictor, FineTunedPredictionResult };
