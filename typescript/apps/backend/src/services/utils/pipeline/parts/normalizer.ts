import type { PrismaBase } from "@gloo/database";
import { uuidGen, Prisma, prisma, Types } from "@gloo/database";

import { normalizeText } from "../../LLMApi";
import type { LLMOptionsInterface, Pipeline } from "../types";

import type { Input } from "./input";
import { NormalizerResponse } from "@/api/generated/api/resources/v1";

class Normalizer {
  private metadata: PrismaBase.Normalizer | null = null;

  constructor(
    public id: string | null,
    private options: Types.NormalizerOptions | null,
    private llmConfig: LLMOptionsInterface
  ) {}

  static fromPipeline(
    pipeline: Pipeline,
    llmConfig: LLMOptionsInterface | null
  ): Normalizer | null {
    if (!pipeline.normalizer) return null;

    if (!llmConfig) {
      throw new Error("Must configure LLM to use a normalizer");
    }

    if ("normalizerId" in pipeline.normalizer) {
      return new Normalizer(pipeline.normalizer.normalizerId, null, llmConfig);
    }
    return new Normalizer(null, pipeline.normalizer.options, llmConfig);
  }

  private async loadFromCache(): Promise<Types.NormalizerOptions> {
    if (this.options) return this.options;
    if (!this.id) {
      throw new Error("Must configure ID");
    }
    this.metadata = await prisma.normalizer.findUniqueOrThrow({
      where: {
        id: this.id,
      },
    });
    const options = this.metadata.llmOptions;
    if (!options) {
      throw new Error("Invalid normalizer options");
    }
    this.options = Types.zNormalizerOptionsSchema.parse(options);
    return this.options;
  }

  public async data(): Promise<Types.NormalizerOptions> {
    return await this.loadFromCache();
  }

  public async run(input: Input): Promise<NormalizationResult> {
    // Be as greedy as possible and see if we can find a normalizedInputText
    if (input.id && this.id) {
      const query = await prisma.normalizedInputText.findFirst({
        where: {
          inputTextId: input.id,
          normalizerId: this.id,
        },
      });
      if (query) {
        return NormalizationResult.fromMetadata(query);
      }
    }

    // We actually need to compute the result here.
    const options = await this.data();
    const now = new Date();
    try {
      const normalizedText = await normalizeText(
        this.llmConfig,
        options,
        await input.data()
      );
      // Null indicates the pipeline failed, but we should still return a result.
      if (normalizedText === null) {
        return new NormalizationResult({
          input,
          error: "Failed to normalize text",
          latencyMs: new Date().getTime() - now.getTime(),
        });
      }
      return new NormalizationResult({
        text: normalizedText.text,
        normalizerId: this.id,
        llmResponse: normalizedText.meta,
        latencyMs: new Date().getTime() - now.getTime(),
      });
    } catch (e) {
      return new NormalizationResult({
        latencyMs: new Date().getTime() - now.getTime(),
      });
    }
  }
}

class NormalizationResult {
  private _text: string | null = null;
  private _llmOutput: Types.LLMResponse | null = null;
  private _latencyMs: number | null = null;
  private _passThrough: {
    input: Input;
    error: string;
  } | null = null;
  public id: {
    inputTextId: string;
    normalizedInputTextId: string;
  } | null = null;
  private _metadata: PrismaBase.NormalizedInputText | null;
  private _normalizerId: string | null = null;

  public static fromMetadata(
    metadata: PrismaBase.NormalizedInputText
  ): NormalizationResult {
    const r = new NormalizationResult({
      text: metadata.normalizedText,
      normalizerId: metadata.normalizerId,
      llmResponse: Types.zLLMResponseSchema.nullable().parse(metadata.llmMeta),
      latencyMs: metadata.latencyMs,
    });
    r._metadata = metadata;
    r.id = {
      inputTextId: metadata.inputTextId,
      normalizedInputTextId: metadata.id,
    };
    return r;
  }

  constructor(
    value:
      | {
          normalizerId: string | null;
          text: string;
          llmResponse: Types.LLMResponse | null;
          latencyMs: number | null;
        }
      | {
          inputTextId: string;
          normalizedInputTextId: string;
        }
      | {
          input: Input;
          error: string;
          latencyMs: number | null;
        }
      | {
          latencyMs: number | null;
        }
  ) {
    if ("text" in value) {
      this._text = value.text;
      this._normalizerId = value.normalizerId;
      this._llmOutput = value.llmResponse;
      this._latencyMs = value.latencyMs;
    } else if ("inputTextId" in value) {
      this.id = {
        inputTextId: value.inputTextId,
        normalizedInputTextId: value.normalizedInputTextId,
      };
    } else if ("input" in value) {
      this._passThrough = value;
      this._latencyMs = value.latencyMs;
    } else {
      this._latencyMs = value.latencyMs;
    }
    this._metadata = null;
  }

  private async loadFromCache(): Promise<string> {
    if (this._text) return this._text;
    if (this._passThrough) {
      return await this._passThrough.input.data();
    }
    if (!this.id) {
      throw new Error("Must configure ID");
    }
    this._metadata = await prisma.normalizedInputText.findUniqueOrThrow({
      where: {
        id: this.id.normalizedInputTextId,
      },
    });
    this._text = this._metadata.normalizedText;
    this._latencyMs = this._metadata.latencyMs;
    return this._text;
  }

  public async text(): Promise<string> {
    return this.loadFromCache();
  }

  public async response(): Promise<NormalizerResponse> {
    const text = await this.text().catch(() => undefined);

    if (this._latencyMs === null) {
      throw new Error("Must configure latencyMs");
    }

    return {
      status: text ? "PASS" : "FAIL",
      text,
      latencyMs: this._latencyMs,
      tokensUsed: this._llmOutput?.tokenUsage?.totalTokens,
    };
  }

  public async save(
    pipeline: Pipeline,
    requestMetadata: Types.RequestMetadata,
    input: Input
  ): Promise<string> {
    if (!this.id) {
      if (!this._text || !this._normalizerId || !this._latencyMs) {
        throw new Error("Must configure text and normalizerId");
      }
      this.id = {
        inputTextId: await input.save(pipeline, requestMetadata),
        normalizedInputTextId: uuidGen("input_normalized"),
      };
      await prisma.normalizedInputText.create({
        data: {
          latencyMs: this._latencyMs,
          id: this.id.normalizedInputTextId,
          inputTextId: this.id.inputTextId,
          normalizerId: this._normalizerId,
          normalizedText: this._text,
          classifierId: pipeline.classifierId,
          requestMetadata: requestMetadata,
          llmMeta: this._llmOutput ?? Prisma.JsonNull,
        },
      });
    }

    return this.id.normalizedInputTextId;
  }
}

export { Normalizer, NormalizationResult };
