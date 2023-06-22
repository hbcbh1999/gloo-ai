import {
  Configuration,
  ConfigurationOverride,
  DetailsUnion,
  SelectedClass,
  Status,
  PredictorKlassDetails,
} from "@/api/generated/api/resources/v1/resources/classification/types";
import runPipeline from "./pipeline";
import { LLMOptionsInterface, Pipeline, PipelineInput } from "./pipeline/types";
import { PrismaBase, Types, prisma } from "@gloo/database";
import { NormalizationResult } from "./pipeline/parts/normalizer";

export const DefaultLLMConfig: LLMOptionsInterface = {
  name: "GLOO_DEFAULT_LLM",
  apiKey: process.env.OPENAI_KEY!,
  apiBaseUrl: "https://api.openai.com/v1",
  provider: PrismaBase.LLMProvider.OpenAI,
};

const getPipelineFromConfig = async (
  classifierId: string,
  config: Configuration
): Promise<{
  pipeline: Pipeline;
  config: { id: string; version: number };
}> => {
  console.log("getPipelineFromConfig", config);
  if (config.version === -1) {
    const res = await prisma.classifierConfigVersion.findFirstOrThrow({
      where: {
        classifierConfigId: config.id,
      },
      select: {
        classifierConfigId: true,
        versionId: true,
        llmPredictorId: true,
        ftPredictorId: true,
        normalizationId: true,
      },
      orderBy: {
        versionId: "desc",
      },
    });

    return {
      config: {
        id: res.classifierConfigId,
        version: res.versionId,
      },
      pipeline: {
        classifierId,
        fineTunedPredictor: res.ftPredictorId
          ? {
              predictorId: res.ftPredictorId,
            }
          : null,
        llmPredictor: res.llmPredictorId
          ? {
              predictorId: res.llmPredictorId,
            }
          : null,
        normalizer: res.normalizationId
          ? {
              normalizerId: res.normalizationId,
            }
          : null,
        klassList: [],
      },
    };
  } else {
    const res = await prisma.classifierConfigVersion.findUniqueOrThrow({
      where: {
        classifierConfigId_versionId: {
          classifierConfigId: config.id,
          versionId: config.version,
        },
      },
      select: {
        classifierConfigId: true,
        llmPredictorId: true,
        ftPredictorId: true,
        normalizationId: true,
      },
    });

    return {
      config,
      pipeline: {
        classifierId,
        fineTunedPredictor: res.ftPredictorId
          ? {
              predictorId: res.ftPredictorId,
            }
          : null,
        llmPredictor: res.llmPredictorId
          ? {
              predictorId: res.llmPredictorId,
            }
          : null,
        normalizer: res.normalizationId
          ? {
              normalizerId: res.normalizationId,
            }
          : null,
        klassList: [],
      },
    };
  }
};

const getPipelineFromOverride = (
  classifierId: string,
  override: ConfigurationOverride
): { pipeline: Pipeline; config: null } => {
  return {
    pipeline: {
      classifierId,
      normalizer:
        override.normalizer?.type === "id"
          ? {
              normalizerId: override.normalizer.value,
            }
          : override.normalizer?.type === "override"
          ? {
              options: override.normalizer,
            }
          : null,
      llmPredictor:
        override.llmPredictor?.type === "id"
          ? {
              predictorId: override.llmPredictor.value,
            }
          : override.llmPredictor?.type === "override"
          ? {
              options: override.llmPredictor.options,
              blacklistedKlasses: override.llmPredictor.klasses.supressed,
              supportedKlasses: override.llmPredictor.klasses.available,
            }
          : null,
      fineTunedPredictor:
        override.traditionalPredictor?.type === "id"
          ? {
              predictorId: override.traditionalPredictor.value,
            }
          : override.traditionalPredictor?.type === "override"
          ? {
              options: override.traditionalPredictor.options,
              blacklistedKlasses:
                override.traditionalPredictor.klasses.supressed,
              supportedKlasses: override.traditionalPredictor.klasses.available,
            }
          : null,
      klassList: override.klasses,
    },
    config: null,
  };
};

export const classify = async (
  input: PipelineInput,
  {
    classifierId,
    llmConfig,
    configuration,
    override,
    saveOptions,
    startTime,
  }: {
    classifierId: string;
    llmConfig: LLMOptionsInterface | null;
    configuration?: Configuration;
    override?: ConfigurationOverride;
    startTime?: number;
    saveOptions?: {
      save: true;
      requestMetadata: Types.RequestMetadata;
    };
  }
): Promise<{
  selectedKlasses: SelectedClass[];
  status: Status;
  requestMetadata?: Types.RequestMetadata;
  requestId: string | null;
  predictorDetails: DetailsUnion[];
  normalizer: NormalizationResult | null;
  latencyMs: number;
}> => {
  const { pipeline, config } = configuration
    ? await getPipelineFromConfig(classifierId, configuration)
    : override
    ? getPipelineFromOverride(classifierId, override)
    : { pipeline: null, config: null };
  if (!pipeline) {
    throw new Error("No pipeline specified");
  }

  const pipelineResult = await runPipeline(
    pipeline,
    llmConfig,
    input,
    startTime
  );

  const predictorDetails = await pipelineResult.outcome.details(
    pipelineResult.klassManager
  );

  const selectedKlasses = predictorDetails
    .flatMap((p) => {
      return p.classes
        .filter((c) => c.selected)
        .map((c) => {
          return {
            id: c.klassId,
            name: c.klassName,
            confidence: c.confidence,
            type: p.predictorType,
            version: c.klassVersion,
          };
        });
    })
    .reduce((acc, cur) => {
      if (acc.has(cur.id)) {
        const existing = acc.get(cur.id)!;
        acc.set(cur.id, {
          ...cur,
          latestVersion: Math.max(existing.latestVersion, cur.version),
          latestName:
            existing.latestVersion > cur.version
              ? existing.latestName
              : cur.name,
          overallConfidence: Math.max(
            existing.overallConfidence,
            cur.confidence
          ),
        });
      } else {
        acc.set(cur.id, {
          id: cur.id,
          latestVersion: cur.version,
          latestName: cur.name,
          overallConfidence: cur.confidence,
        });
      }
      return acc;
    }, new Map<string, SelectedClass>());

  let requestId: null | string = null;
  if (saveOptions?.save) {
    if (!config) {
      throw new Error("Configuration must be specified to save");
    }
    try {
      // Attempt to save the prediction, but continue if it fails.
      requestId = await pipelineResult.outcome.save(
        pipeline,
        saveOptions.requestMetadata,
        pipelineResult.input,
        pipelineResult.normalizationResult,
        config,
        llmConfig?.name,
        startTime
      );
    } catch (e) {
      requestId = "UNKNOWN";
    }
  }

  return {
    requestId,
    status: pipelineResult.outcome.status,
    selectedKlasses: Array.from(selectedKlasses.values()),
    predictorDetails,
    normalizer: pipelineResult.normalizationResult,
    latencyMs: pipelineResult.outcome.latencyMs,
  };
};
