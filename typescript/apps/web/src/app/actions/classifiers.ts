"use server";

import {
  createGlooClient,
  type LlmPredictorOverride,
  type NormalizerOverride,
  type TraditionalPredictorOverride,
} from "@gloo/client-internal";
import { Prisma, Types, prisma, uuidGen } from "@gloo/database";
import {
  addMinutes,
  eachMinuteOfInterval,
  getUnixTime,
  parseISO,
  startOfHour,
  subDays,
} from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import type {
  DetailsUnion,
  InternalPredictResponse,
  PredictorKlassDetails,
  SelectedClass,
} from "../../../../../packages/internal-client-sdk/src/fern/api/resources/v1";

import logger from "./logger";

export const getClassifiers = cache(async (orgId: string) => {
  logger.debug("getClassifiers", { meta: { orgId } });
  return await prisma.classifier.findMany({
    where: {
      orgId,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});

export const createClassifier = async (
  orgId: string,
  params: { name: string }
): Promise<void> => {
  logger.debug("createClassifier", { orgId, params });
  const uuid = uuidGen("ep");
  await prisma.classifier.create({
    data: {
      orgId,
      id: uuid,
      name: params.name,
    },
  });
  revalidatePath("/dashboard/endpoints/classifiers");
  redirect(`/dashboard/endpoints/classifiers/${uuid}/definition`);
};

export const getNormalizer = cache(async (normalizerId: string) => {
  const n = await prisma.normalizer.findUniqueOrThrow({
    where: {
      id: normalizerId,
    },
  });
  return {
    ...n,
    llmOptions: Types.zNormalizerOptionsSchema.parse(n.llmOptions),
  };
});

export const getLLMPredictor = cache(async (predictorId: string) => {
  const predictor = await prisma.predictor.findUniqueOrThrow({
    where: {
      id: predictorId,
    },
  });

  return {
    ...predictor,
    llmOptions: Types.zLLMClassifierOptionsSchema.parse(predictor.llmOptions),
    supportedKlasses: Types.zSupportedKlasses.parse(predictor.supportedKlasses),
  };
});

export const getFTPredictor = cache(async (predictorId: string) => {
  const predictor = await prisma.predictor.findUniqueOrThrow({
    where: {
      id: predictorId,
    },
  });

  return {
    ...predictor,
    ftOptions: Types.zTraditionalClassifierOptionsSchema.parse(
      predictor.ftOptions
    ),
    supportedKlasses: Types.zSupportedKlasses.parse(predictor.supportedKlasses),
  };
});

export type ClientClassifier = Awaited<ReturnType<typeof getClassifier>>;
export type ClientKlass = ClientClassifier["klasses"][number];
export type ClientClassifierConfig =
  ClientClassifier["classifierConfig"][number];
export type ClientClassifierConfigVersion =
  ClientClassifierConfig["versions"][number];
export type ClientKlassVersion = ClientKlass["versions"][number];

export const getClassifier = cache(async (classifierId: string) => {
  try {
    logger.debug("getClassifier", { classifierId });
    const classifier = await prisma.classifier.findUniqueOrThrow({
      where: {
        id: classifierId,
      },
      include: {
        classifierConfig: {
          include: {
            versions: true,
          },
        },
        klasses: {
          include: {
            versions: true,
          },
        },
        normalizers: true,
        predictors: true,
        TrainedEndpoints: true,
      },
    });

    const normalizers = classifier.normalizers.map((n) => {
      return {
        ...n,
        llmOptions: Types.zNormalizerOptionsSchema.parse(n.llmOptions),
      };
    });
    const llmPredictors = classifier.predictors
      .filter((p) => p.type === "LLM")
      .map((p) => {
        return {
          ...p,
          llmOptions: Types.zLLMClassifierOptionsSchema.parse(p.llmOptions),
          supportedKlasses: Types.zSupportedKlasses.parse(p.supportedKlasses),
        };
      });
    const ftPredictors = classifier.predictors
      .filter((p) => p.type === "FT")
      .map((p) => {
        return {
          ...p,
          ftOptions: Types.zTraditionalClassifierOptionsSchema.parse(
            p.ftOptions
          ),
          supportedKlasses: Types.zSupportedKlasses.parse(p.supportedKlasses),
        };
      });

    const TrainedEndpoints = classifier.TrainedEndpoints.map((e) => ({
      ...e,
      supportedKlasses: Types.zSupportedKlasses.parse(e.supportedKlasses),
    }));

    logger.debug("getClassifier complete");

    return {
      ...classifier,
      normalizers,
      ftPredictors,
      llmPredictors,
      TrainedEndpoints,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        redirect("/dashboard/endpoints/create");
      }
    }
    throw e;
  }
});

export interface CreateClassifierConfigParams {
  classifierId: string;
  name: string;
  normalizationLLMOptions: Types.NormalizerOptions;
  llmPredictorLLMOptions: Types.LLMClassifierOptions;
  candidateClasses: {
    name: string;
    description: string;
  }[];
}

export const createClassifierConfigVersion = async (
  classifierId: string,
  configId: string,
  normalizerOverrides: NormalizerOverride | null,
  llmClassifierOverrides: LlmPredictorOverride | null,
  traditionalClassifierOverrides: TraditionalPredictorOverride | null,
  klasses: Types.KlassDetails[]
) => {
  if (!llmClassifierOverrides && !traditionalClassifierOverrides) {
    throw new Error("Must provide at least one classifier override");
  }

  const res = await prisma.$transaction(async (tx) => {
    const klassMap = new Map<
      string,
      Map<number, { id: string; version: number }>
    >();

    // Create all necessary klasses.
    await Promise.all(
      klasses.map(async (c) => {
        const createKlass = c.id.startsWith("local_");
        if (createKlass) {
          if (c.version !== -2) {
            throw new Error(`Invalid version for ${JSON.stringify(c)}`);
          }
          const newId = uuidGen("klass");
          klassMap.set(c.id, new Map([[c.version, { id: newId, version: 1 }]]));

          await tx.klass.create({
            data: {
              id: newId,
              classifierId,
              versions: {
                create: {
                  versionId: 1,
                  name: c.name,
                  description: c.description,
                },
              },
            },
          });
        } else {
          if (!klassMap.has(c.id)) {
            klassMap.set(c.id, new Map());
          }
          // Ensure the version is -2.
          if (c.version !== -2) {
            throw new Error(`Invalid version for ${JSON.stringify(c)}`);
          }
          const versions = await tx.klassVersion.count({
            where: {
              klassId: c.id,
            },
          });

          klassMap.set(
            c.id,
            new Map([[c.version, { id: c.id, version: versions + 1 }]])
          );
          await tx.klassVersion.create({
            data: {
              klassId: c.id,
              versionId: versions + 1,
              name: c.name,
              description: c.description,
            },
          });
        }
      })
    );

    // Create the llm Predictor
    const llmPredictor =
      llmClassifierOverrides &&
      (await tx.predictor.create({
        data: {
          id: uuidGen("llmClassifier"),
          classifierId,
          name: "LLM Predictor",
          type: "LLM",
          llmOptions: {
            ...llmClassifierOverrides.options,
            llmConfig: { ...llmClassifierOverrides.options.llmConfig },
          },
          supportedKlasses: llmClassifierOverrides.klasses.available.map(
            (c) => {
              const match = klassMap.get(c.id)?.get(c.version);
              if (!match) {
                if (c.id.startsWith("local_")) {
                  throw new Error(
                    `Could not find klass for ${JSON.stringify(
                      c
                    )} in ${JSON.stringify(klassMap)}`
                  );
                }
                return { id: c.id, version: c.version };
              }
              return match;
            }
          ),
          blacklistedKlassIds: llmClassifierOverrides.klasses.supressed.map(
            (c) => {
              const match = Array.from(klassMap.get(c)?.values() ?? []).at(
                0
              )?.id;
              if (!match) {
                return c;
              }
              return match;
            }
          ),
        },
      }));

    const ftPredictor =
      traditionalClassifierOverrides &&
      (await tx.predictor.create({
        data: {
          id: uuidGen("ftClassifier"),
          classifierId,
          name: "FT Predictor",
          type: "FT",
          ftOptions: {
            ...traditionalClassifierOverrides.options,
          },
          supportedKlasses:
            traditionalClassifierOverrides.klasses.available.map((c) => {
              const match = klassMap.get(c.id)?.get(c.version);
              if (!match) {
                if (c.id.startsWith("local_")) {
                  throw new Error(
                    `Could not find klass for ${JSON.stringify(
                      c
                    )} in ${JSON.stringify(klassMap)}`
                  );
                }
                return { id: c.id, version: c.version };
              }
              return match;
            }),
          blacklistedKlassIds:
            traditionalClassifierOverrides.klasses.supressed.map((c) => {
              const match = Array.from(klassMap.get(c)?.values() ?? []).at(
                0
              )?.id;
              if (!match) {
                return c;
              }
              return match;
            }),
        },
      }));

    const normalizer =
      normalizerOverrides &&
      (await tx.normalizer.create({
        data: {
          id: uuidGen("normalizer"),
          classifierId,
          name: "Normalizer",
          llmOptions: {
            ...normalizerOverrides,
            llmConfig: { ...normalizerOverrides.llmConfig },
          },
        },
      }));

    const counts = await tx.classifierConfigVersion.count({
      where: {
        classifierConfigId: configId,
      },
    });

    const config = await tx.classifierConfigVersion.create({
      data: {
        classifierConfigId: configId,
        versionId: counts + 1,
        normalizationId: normalizer?.id,
        llmPredictorId: llmPredictor?.id,
        ftPredictorId: ftPredictor?.id,
      },
    });
    return config;
  });

  revalidatePath("/dashboard/endpoints/classifiers/[endpointId]");
  return {
    configId: res.classifierConfigId,
    versionId: res.versionId,
  };
};

const zNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const createClassifierConfig = async (
  classifierId: string,
  name: string,
  normalizerOverrides: NormalizerOverride | null,
  llmClassifierOverrides: LlmPredictorOverride | null,
  traditionalClassifierOverrides: TraditionalPredictorOverride | null,
  klasses: Types.KlassDetails[]
): Promise<{
  configId: string;
  versionId: number;
}> => {
  if (!llmClassifierOverrides && !traditionalClassifierOverrides) {
    throw new Error("Must provide at least one classifier override");
  }

  zNameSchema.parse(name);

  const res = await prisma.$transaction(async (tx) => {
    const klassMap = new Map<
      string,
      Map<number, { id: string; version: number }>
    >();

    // Create all necessary klasses.
    await Promise.all(
      klasses.map(async (c) => {
        const createKlass = c.id.startsWith("local_");
        if (createKlass) {
          const newId = uuidGen("klass");
          klassMap.set(c.id, new Map([[c.version, { id: newId, version: 1 }]]));

          await tx.klass.create({
            data: {
              id: newId,
              classifierId,
              versions: {
                create: {
                  versionId: 1,
                  name: c.name,
                  description: c.description,
                },
              },
            },
          });
        } else {
          if (!klassMap.has(c.id)) {
            klassMap.set(c.id, new Map());
          }
          if (c.version < 0) {
            throw new Error(`Invalid version for ${JSON.stringify(c)}`);
          }
          await tx.klassVersion.create({
            data: {
              klassId: c.id,
              versionId: c.version,
              name: c.name,
              description: c.description,
            },
          });
        }
      })
    );

    // Create the llm Predictor
    const llmPredictor =
      llmClassifierOverrides &&
      (await tx.predictor.create({
        data: {
          id: uuidGen("llmClassifier"),
          classifierId,
          name: "LLM Predictor",
          type: "LLM",
          llmOptions: {
            ...llmClassifierOverrides.options,
            llmConfig: { ...llmClassifierOverrides.options.llmConfig },
          },
          supportedKlasses: llmClassifierOverrides.klasses.available.map(
            (c) => {
              const match = klassMap.get(c.id)?.get(c.version);
              if (!match) {
                if (c.id.startsWith("local_")) {
                  throw new Error(
                    `Could not find klass for ${JSON.stringify(
                      c
                    )} in ${JSON.stringify(klassMap)}`
                  );
                }
                return { id: c.id, version: c.version };
              }
              return match;
            }
          ),
          blacklistedKlassIds: llmClassifierOverrides.klasses.supressed.map(
            (c) => {
              const match = Array.from(klassMap.get(c)?.values() ?? []).at(
                0
              )?.id;
              if (!match) {
                return c;
              }
              return match;
            }
          ),
        },
      }));

    const ftPredictor =
      traditionalClassifierOverrides &&
      (await tx.predictor.create({
        data: {
          id: uuidGen("ftClassifier"),
          classifierId,
          name: "FT Predictor",
          type: "FT",
          ftOptions: {
            ...traditionalClassifierOverrides.options,
          },
          supportedKlasses:
            traditionalClassifierOverrides.klasses.available.map((c) => {
              const match = klassMap.get(c.id)?.get(c.version);
              if (!match) {
                if (c.id.startsWith("local_")) {
                  throw new Error(
                    `Could not find klass for ${JSON.stringify(
                      c
                    )} in ${JSON.stringify(klassMap)}`
                  );
                }
                return { id: c.id, version: c.version };
              }
              return match;
            }),
          blacklistedKlassIds:
            traditionalClassifierOverrides.klasses.supressed.map((c) => {
              const match = Array.from(klassMap.get(c)?.values() ?? []).at(
                0
              )?.id;
              if (!match) {
                return c;
              }
              return match;
            }),
        },
      }));

    const normalizer =
      normalizerOverrides &&
      (await tx.normalizer.create({
        data: {
          id: uuidGen("normalizer"),
          classifierId,
          name: "Normalizer",
          llmOptions: {
            ...normalizerOverrides,
            llmConfig: { ...normalizerOverrides.llmConfig },
          },
        },
      }));

    const config = await tx.classifierConfig.create({
      data: {
        classifierId,
        id: `${classifierId}_${name}`,
        name,
        versions: {
          create: {
            versionId: 1,
            normalizationId: normalizer?.id,
            llmPredictorId: llmPredictor?.id,
            ftPredictorId: ftPredictor?.id,
          },
        },
      },
    });
    return config;
  });

  revalidatePath("/dashboard/endpoints/classifiers");
  logger.debug("res", { meta: { res } });
  return {
    configId: res.id,
    versionId: 1,
  };
};

export const deleteClassifierConfig = async (configId: string) => {
  logger.debug("deleteClassifierConfig", { configId });

  await prisma.$transaction(async (tx) => {
    await tx.classifierConfigVersion.deleteMany({
      where: {
        classifierConfigId: configId,
      },
    });
    await tx.classifierConfig.delete({
      where: {
        id: configId,
      },
    });
  });
  revalidatePath("/dashboard/endpoints/classifiers");
};

export const makeDefaultConfig = async (
  classifierId: string,
  configId: string,
  versionId: number
) => {
  logger.debug("makeDefaultConfig", { configId, versionId });

  await prisma.classifier.update({
    where: {
      id: classifierId,
    },
    data: {
      defaultConfig: {
        connect: {
          classifierConfigId_versionId: {
            classifierConfigId: configId,
            versionId: versionId,
          },
        },
      },
    },
  });

  revalidatePath(`/dashboard/endpoints/classifiers/[endpointId]`);
};

export type ClientGetPredictionsRequest = {
  classifierId: string;
  searchParams?: {
    createdAt?: string;
    direction?: "next" | "prev";
  };
};

type InternalPredictResponseWithMetadata = InternalPredictResponse & {
  createdAt: string;
  inputText: string;
  id: string;
  classifierConfig: {
    id: string;
    version: number;
  };
};

export type ClientGetPredictionsResponse = {
  predictions: InternalPredictResponseWithMetadata[];
  pagination: {
    cursors: {
      nextCursor: string | undefined;
      prevCursor: string | undefined;
    };
  };
};

export const getPredictions = async ({
  classifierId,
  searchParams,
}: ClientGetPredictionsRequest): Promise<ClientGetPredictionsResponse> => {
  const recordsPerPage = 20;
  const cursor = searchParams?.createdAt
    ? {
      createdAt: parseISO(searchParams.createdAt),
    }
    : undefined;
  const direction = searchParams?.direction || "next";
  const take = direction === "next" ? recordsPerPage : -recordsPerPage;
  const responses = await prisma.predictionRequest.findMany({
    take: take,
    cursor: cursor,
    // skip,
    orderBy: {
      createdAt: "desc",
    },
    where: {
      classifierId: {
        equals: classifierId,
      },
    },
    include: {
      inputText: true,
      normalizedInputText: true,
      predictions: true,
      classifierConfigVersion: true,
    },
  });
  let nextCursor: string | undefined, prevCursor: string | undefined;

  // Prepare next and previous page check queries
  if (responses.length > 0) {
    const nextPageCheckQuery = prisma.predictionRequest.findMany({
      cursor: {
        createdAt: responses[responses.length - 1]?.createdAt,
      },
      skip: 1,
      take: 1,
      orderBy: {
        createdAt: "desc",
      },
      where: {
        classifierId: {
          equals: classifierId,
        },
      },
    });

    const prevPageCheckQuery = prisma.predictionRequest.findMany({
      cursor: {
        createdAt: responses[0]?.createdAt,
      },
      skip: 1,
      take: -1,
      orderBy: {
        createdAt: "desc",
      },
      where: {
        classifierId: {
          equals: classifierId,
        },
      },
    });

    // Run next and previous page check queries in parallel
    const [nextCheck, prevCheck] = await Promise.all([
      nextPageCheckQuery,
      prevPageCheckQuery,
    ]);

    if (nextCheck.length > 0) {
      nextCursor = nextCheck[0]?.createdAt.toISOString();
    }
    if (prevCheck.length > 0) {
      prevCursor = prevCheck[0]?.createdAt.toISOString();
    }
  }

  const internalResponses: InternalPredictResponseWithMetadata[] = [];

  // get the classIds for all predictions
  const classIdWithVersionSet = new Set<{ id: string; version: number }>();
  responses?.forEach((r) => {
    r.predictions.forEach((pred) => {
      if (pred.predictorType === "LLM" || pred.predictorType === "FT") {
        const savedPredictedClasses = Types.zPredictionResult.parse(
          pred.prediction
        );
        savedPredictedClasses.forEach((p) => {
          classIdWithVersionSet.add({ id: p.id, version: p.version });
        });
      }
    });
  });

  const klasses = await prisma.klassVersion.findMany({
    where: {
      OR: Array.from(classIdWithVersionSet).map((c) => ({
        klassId: c.id,
        versionId: c.version,
      })),
    },
  });

  const klassMap = new Map<string, (typeof klasses)[0]>();
  klasses.forEach((klass) => {
    klassMap.set(`${klass.klassId}-${klass.versionId}`, klass);
  });
  const getClass = (klassId: string, versionId: number) => {
    const klass = klassMap.get(`${klassId}-${versionId}`);
    if (!klass) {
      throw new Error(`Could not find klass ${klassId}-${versionId}`);
    }
    return klass;
  };

  responses?.forEach((r) => {
    const predDetails: DetailsUnion[] = [];
    r.predictions.forEach((pred) => {
      const predClassDetails: PredictorKlassDetails[] = [];

      if (pred.predictorType === "LLM" || pred.predictorType === "FT") {
        const savedPredictedClasses = Types.zPredictionResult.parse(
          pred.prediction
        );
        savedPredictedClasses.forEach((p) => {
          predClassDetails.push({
            confidence: p.confidence,
            klassId: p.id,
            klassVersion: p.version,
            selected: p.selected,
            klassName: getClass(p.id, p.version).name,
            klassDescription: getClass(p.id, p.version).description,
          });
        });

        if (pred.predictorType === "LLM") {
          const hallucinations = Types.zHallucinations.parse(
            pred.hallucination
          );
          const llmMeta = Types.zLLMClassificationResponseSchema.parse(
            pred.llmMeta
          );
          if (!llmMeta) {
            throw new Error("Missing LLM Metadata");
          }
          if (!llmMeta.tokenUsage) {
            throw new Error("Missing LLM Metadata tokens");
          }

          predDetails.push({
            predictorId: pred.predictorId,
            predictorType: pred.predictorType,
            classes: predClassDetails,
            latencyMs: pred.latencyMs,
            type: "llm",
            hallucinations: hallucinations.map((c) => c.klassName),
            tokensUsed: llmMeta.tokenUsage.totalTokens,
            reasoning: llmMeta.reasoning,
            status: pred.status,
          });
        } else {
          predDetails.push({
            predictorId: pred.predictorId,
            predictorType: pred.predictorType,
            classes: predClassDetails,
            latencyMs: pred.latencyMs,
            status: pred.status,
            type: "base",
          });
        }
      }
    });

    const selectedKlasses = predDetails
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
      .reduce((acc: Map<string, SelectedClass>, cur) => {
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

    internalResponses.push({
      selectedClasses: Array.from(selectedKlasses.values()),
      predictorDetails: predDetails,
      createdAt: r.createdAt.toISOString(),
      inputText: r.inputText.text,
      id: r.id,
      classifierConfig: {
        id: r.classifierConfigVersion.classifierConfigId,
        version: r.classifierConfigVersion.versionId,
      },
      latencyMs: r.latencyMs,
      status: r.status,
      normalizer: r.normalizedInputText
        ? {
          status: "PASS",
          text: r.normalizedInputText.normalizedText,
          latencyMs: r.normalizedInputText.latencyMs,
          tokensUsed: Types.zLLMResponseSchema
            .nullable()
            .optional()
            .parse(r.normalizedInputText?.llmMeta)?.tokenUsage?.totalTokens,
        }
        : undefined,
    });
  });

  return {
    predictions: internalResponses,
    pagination: {
      cursors: {
        nextCursor: nextCursor,
        prevCursor: prevCursor,
      },
    },
  };
};

function startOfInterval(date: Date, step: number): Date {
  const m = date.getMinutes();
  const lowerBoundMinute = m - (m % step);
  return addMinutes(startOfHour(date), lowerBoundMinute);
}

type TimeFrame = "24h" | "7d" | "14d";
export async function getPredictionCounts(
  timeFrame: TimeFrame,
  classifierId: string
) {
  let daysBack: number;
  const step = 60;

  switch (timeFrame) {
    case "24h":
      daysBack = 1;
      break;
    case "7d":
      daysBack = 7;
      break;
    case "14d":
      daysBack = 14;
      break;
    default:
      throw new Error(`Invalid time frame`);
  }

  const start = subDays(new Date(), daysBack);
  const end = new Date();

  const predictionRequests = await prisma.predictionRequest.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      classifierId: {
        equals: classifierId,
      },
    },
  });

  const grouped: { [key: string]: number } = {};

  for (const req of predictionRequests) {
    const time = getUnixTime(startOfInterval(req.createdAt, step));
    if (!grouped[time]) {
      grouped[time] = 0;
    }
    grouped[time]++;
  }

  const interval = { start, end };
  const timeIntervals = eachMinuteOfInterval(interval, { step });

  // Transform the grouped data into the required format
  const chartData = timeIntervals.map((timestamp) => {
    const unixTime = getUnixTime(startOfInterval(timestamp, step));
    return {
      name: timestamp.toISOString(),
      "Number of Predictions": grouped[unixTime] || 0,
    };
  });

  return chartData;
}

export async function getLatencyPercentiles(
  timeFrame: TimeFrame,
  classifierId: string
) {
  let daysBack: number;

  switch (timeFrame) {
    case "24h":
      daysBack = 1;
      break;
    case "7d":
      daysBack = 7;
      break;
    case "14d":
      daysBack = 14;
      break;
    default:
      throw new Error(`Invalid time frame`);
  }

  const start = subDays(new Date(), daysBack);
  const end = new Date();

  const predictionRequests = await prisma.predictionRequest.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      classifierId: {
        equals: classifierId,
      },
    },
    include: {
      classifierConfig: {
        select: {
          name: true,
        },
      },
    },
  });

  const latencyValues = predictionRequests.reduce((acc, req) => {
    if (!acc.has(req.classifierConfig.name)) {
      acc.set(req.classifierConfig.name, [req.latencyMs]);
    } else {
      acc.get(req.classifierConfig.name)?.push(req.latencyMs);
    }
    return acc;
  }, new Map<string, number[]>());

  const result = Array.from(latencyValues.entries()).map(([key, values]) => {
    const sorted = values.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { configId: key, p50, p90, p95 };
  });

  return result;
}

export const generatePredictionTestData = async (
  orgId: string,
  classifierId: string
) => {
  await glooClient(orgId)
    .classifierClientV1()
    .predict(classifierId, {
      text: "This text is about the color blue and white.",
      tags: ["testing"],
      llmTarget: "GLOO_DEFAULT_LLM",
    });
  revalidatePath("/dashboard/endpoints/classifiers/[endpointId]/predictions");
};

const throwEnvError = (env: string) => {
  throw new Error(`Missing environment variable: ${env}`);
};

const glooClient = (orgId: string) => {
  const secretKey =
    process.env.GLOO_AUTH_SECRET ?? throwEnvError("GLOO_AUTH_SECRET");
  const baseUrl =
    process.env.GLOO_SERVICE_URL ?? throwEnvError("GLOO_SERVICE_URL");

  const gloo = createGlooClient({
    secretKey: secretKey,
    baseUrl: baseUrl,
    tag: "GLOO:NEXTJS",
    org: orgId,
  });

  return gloo;
};

export const generateLLMTestCase = async (
  llmTargetName: string,
  orgId: string,
  prompt: string
) => {
  const gloo = glooClient(orgId);

  const res = await gloo
    .classifierClientV1()
    .generateTextInternal("unknown_classifier", {
      llmTarget: llmTargetName,
      numSamples: 1,
      prompt: prompt,
    });

  return res;
};

export const availableTrainedEndpoints = async (classifierId: string) => {
  const res = await prisma.trainedEndpoints.findMany({
    where: {
      classifierId,
    },
  });

  const klasses = await prisma.klass.findMany({
    where: {
      classifierId,
    },
    select: {
      id: true,
      versions: {
        select: {
          versionId: true,
          name: true,
          description: true,
        },
        orderBy: {
          versionId: "desc",
        },
        take: 1,
      },
    },
  });

  const models = res.map((r) => {
    return {
      ...r,
      supportedKlasses: Types.zSupportedKlasses.parse(r.supportedKlasses),
    };
  });

  return { models, klasses };
};

export const createTrainedEndpoint = async (
  classifierId: string,
  modelId: string,
  supportedKlasses: Types.SupportedKlasses
) => {
  try {
    await prisma.trainedEndpoints.create({
      data: {
        id: modelId,
        classifierId,
        supportedKlasses: supportedKlasses,
      },
    });
  } catch (e) {
    logger.error("error", e);
  }
};

export const removeTrainedEndpoint = async (modelId: string) => {
  await prisma.trainedEndpoints.delete({
    where: {
      id: modelId,
    },
  });
};

export type ClientFeedbackRequest = {
  hiProviderId: string;
  hiProviderName: string;
  orgId: string;
  clerkId: string;
};

export const submitFeedback = async (_feedback: ClientFeedbackRequest) => {
  // await prisma.hIPredictor.upsert({
  //   where: {
  //   }
  // })
  // await prisma.predictionFeedback.create({
  //   data: {
  //     hiProvider: {
  //       connectOrCreate: {
  //         where: {
  //           id: feedback.hiProviderId
  //         },
  //         create: {
  //           id: feedback.hiProviderId,
  //           name: feedback.hiProviderName,
  //           orgId:
  //         }
  //       }
  //     }
  //   }
  // })
};
