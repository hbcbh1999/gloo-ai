"use server";

import type { PrismaBase } from "@gloo/database";
import { Types, prisma } from "@gloo/database";
import { cache } from "react";
import { sub } from "date-fns";

import { notEmpty } from "../_utils/utils";

function parseISODuration(duration: string) {
  const regex =
    /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;

  const matches = duration.match(regex);

  // Note: The indices are off by one due to the way the match function groups the results
  return {
    years: parseInt(matches?.at(1) ?? "0"),
    months: parseInt(matches?.at(2) ?? "0"),
    days: parseInt(matches?.at(3) ?? "0"),
    hours: parseInt(matches?.at(4) ?? "0"),
    minutes: parseInt(matches?.at(5) ?? "0"),
    seconds: parseInt(matches?.at(6) ?? "0"),
  };
}

export type PredictionCountPlotData = {
  time: number;
  [classifierConfigId: string]: number;
}[];
export type ErrorRatePlotData = {
  time: number;
  [classifierConfigId: string]: number;
}[];
export type LatencyPlotData = {
  percentile: number;
  // Number of ms.
  [classifierConfigId: string]: number;
}[];

export type HallucinationPlotData = {
  time: number;
  // Percentage of requests with hallucinations.
  [classifierConfigId: string]: number;
}[];
// type HallucinationItemPlotData = {
//   hallucination: string;
//   count: number;
// }[];

type TypedKeys<T, U> = Extract<
  {
    [K in keyof T]: T[K] extends U ? K : never;
  }[keyof T],
  U
>;

export const latencyPlotData = cache(
  async (classifierId: string, durationString: string) => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    const latencyResult: {
      classifierConfigId: string;
      p50_latency: number;
      p75_latency: number;
      p90_latency: number;
      p95_latency: number;
      p99_latency: number;
    }[] = await prisma.$queryRaw`SELECT
                "classifierConfigId",
                percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") as p50_latency,
                percentile_cont(0.75) WITHIN GROUP (ORDER BY "latencyMs") as p75_latency,
                percentile_cont(0.90) WITHIN GROUP (ORDER BY "latencyMs")  as p90_latency,
                percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs")  as p95_latency,
                percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs")  as p99_latency
                FROM
                prediction_requests
                WHERE
                "createdAt" BETWEEN ${startDate} AND ${endDate}
                AND "classifierId" = ${classifierId}
                GROUP BY
                "classifierConfigId"
                `;

    const latencyMap = new Map<number, Omit<LatencyPlotData[0], "percentile">>([
      [50, {}],
      [75, {}],
      [90, {}],
      [95, {}],
      [99, {}],
    ]);
    const configs = new Set<string>();
    for (const result of latencyResult) {
      for (const percentile of [50, 75, 90, 95, 99]) {
        const latency =
          result[`p${percentile}_latency` as TypedKeys<typeof result, number>];
        const configName =
          result.classifierConfigId.split("_", 3)[2] ?? "Unknown";
        configs.add(configName);
        latencyMap.set(percentile, {
          ...latencyMap.get(percentile),
          [configName]: latency,
        });
      }
    }
    const latencyPlotData = Array.from(latencyMap.entries()).map(
      ([percentile, data]): LatencyPlotData[0] => ({
        percentile,
        ...data,
      })
    );

    return { latency: latencyPlotData, configNames: Array.from(configs) };
  }
);

const loadPredictors = async (classifierId: string, predictorIds: string[]) => {
  return (
    await prisma.predictor.findMany({
      where: {
        classifierId,
        id: {
          in: predictorIds,
        },
      },
    })
  ).reduce(
    (
      acc: {
        ft: (PrismaBase.Predictor & {
          ftOptions: Types.TraditionalClassifierOptions;
          supportedKlasses: Types.SupportedKlasses;
        })[];
        llm: (PrismaBase.Predictor & {
          llmOptions: Types.LLMClassifierOptions;
          supportedKlasses: Types.SupportedKlasses;
        })[];
      },
      curr
    ) => {
      if (curr.type === "FT") {
        acc.ft.push({
          ...curr,
          ftOptions: Types.zTraditionalClassifierOptionsSchema.parse(
            curr.ftOptions
          ),
          supportedKlasses: Types.zSupportedKlasses.parse(
            curr.supportedKlasses
          ),
        });
      } else if (curr.type === "LLM") {
        const llmOptions = Types.zLLMClassifierOptionsSchema.parse(
          curr.llmOptions
        );
        acc.llm.push({
          ...curr,
          llmOptions,
          supportedKlasses: Types.zSupportedKlasses.parse(
            curr.supportedKlasses
          ),
        });
      }
      return acc;
    },
    { ft: [], llm: [] }
  );
};

export const usageCharts = cache(
  async (
    classifierId: string,
    durationString: string
  ): Promise<{
    counts: PredictionCountPlotData;
    errorRate: ErrorRatePlotData;
    p75Latency: ErrorRatePlotData;
    configNames: string[];
  }> => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    const result: {
      time: Date;
      count: bigint;
      error_count: bigint;
      classifierConfigId: string;
      p75_latency: number;
    }[] = await prisma.$queryRaw`SELECT
        date_trunc('hour', "createdAt") AS time,
        "classifierConfigId",
        COUNT(*) as count,
        SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as error_count,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY "latencyMs") as p75_latency
      FROM
        prediction_requests
      WHERE
      "createdAt" BETWEEN ${startDate} AND ${endDate}
    AND "classifierId" = ${classifierId}
      GROUP BY
        time,
        "classifierConfigId"
    ORDER BY
        time ASC`;

    const parsed = result.map((r) => ({
      ...r,
      count: Number(r.count),
      error_count: Number(r.error_count),
    }));

    const configs = new Set<string>();
    const counts = new Map<number, { [classifierConfigId: string]: number }>();
    const errorCounts = new Map<
      number,
      { [classifierConfigId: string]: number }
    >();
    const p75Latency = new Map<
      number,
      { [classifierConfigId: string]: number }
    >();
    const setMap = (
      map: Map<number, { [classifierConfigId: string]: number }>,
      time: number,
      configName: string,
      value: number
    ) => {
      if (!map.has(time)) {
        map.set(time, {
          [configName]: value,
        });
      } else {
        map.set(time, {
          ...map.get(time),
          [configName]: value,
        });
      }
    };

    parsed.forEach((r) => {
      const configName = r.classifierConfigId.split("_", 3)[2] ?? "Unknown";
      configs.add(configName);

      setMap(counts, r.time.getTime(), configName, r.count);
      setMap(
        errorCounts,
        r.time.getTime(),
        configName,
        r.error_count / Math.max(1, r.count)
      );
      setMap(p75Latency, r.time.getTime(), configName, r.p75_latency);
    });

    // Find the earlier time.
    // Add all missing times.
    // Round to the nearest hour.
    const currTime = parsed.reduce((acc, curr) => {
      if (curr.time.getTime() < acc.getTime()) {
        return curr.time;
      }
      return acc;
    }, new Date(endDate.getTime() - (endDate.getTime() % 3600000)));

    while (currTime < endDate) {
      for (const m of [counts, errorCounts, p75Latency]) {
        if (!m.has(currTime.getTime())) {
          m.set(currTime.getTime(), {
            ...Object.fromEntries(
              Array.from(configs.values()).map((c) => [c, 0])
            ),
          });
        } else {
          const currData = m.get(currTime.getTime())!;
          configs.forEach((c) => {
            if (!currData[c]) {
              currData[c] = 0;
            }
          });
        }
      }
      currTime.setHours(currTime.getHours() + 1);
    }

    const countList = Array.from(counts.entries())
      .map(([time, counts]): PredictionCountPlotData[0] => ({
        time,
        ...counts,
      }))
      .sort((a, b) => a.time - b.time);

    const errorList = Array.from(errorCounts.entries())
      .map(([time, counts]): ErrorRatePlotData[0] => ({
        time,
        ...counts,
      }))
      .sort((a, b) => a.time - b.time);

    const latencyList = Array.from(p75Latency.entries())
      .map(([time, counts]): ErrorRatePlotData[0] => ({
        time,
        ...counts,
      }))
      .sort((a, b) => a.time - b.time);

    return {
      configNames: Array.from(configs),
      counts: countList,
      errorRate: errorList,
      p75Latency: latencyList,
    };
  }
);

export const predictionAlignmentData = cache(
  async (classifierId: string, durationString: string) => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    // Filter for all configs first which are hybrid.
    const configs = await prisma.classifierConfigVersion.findMany({
      where: {
        classifierConfig: {
          classifierId,
        },
        ftPredictorId: {
          not: null,
        },
        llmPredictorId: {
          not: null,
        },
      },
    });

    const predictors = await loadPredictors(
      classifierId,
      configs
        .flatMap((c) => [c.ftPredictorId, c.llmPredictorId])
        .filter(notEmpty)
    );

    const hybridConfigIds = configs
      .filter(
        (c) =>
          !!predictors.ft.find((p) => p.id === c.ftPredictorId) &&
          !!predictors.llm.find((p) => p.id === c.llmPredictorId)
      )
      .map((c) => ({
        classifierConfigId: c.classifierConfigId,
        versionId: c.versionId,
      }));

    const result = (
      await prisma.predictionRequest.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          classifierId,
          status: "PASS",
          OR: hybridConfigIds.map((c) => ({
            classifierConfigId: c.classifierConfigId,
            classifierConfigVersionId: c.versionId,
          })),
        },
        select: {
          classifierConfigId: true,
          predictions: {
            select: {
              predictorId: true,
              prediction: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        // At most get 5000 results.
        take: 5000,
      })
    ).map((r) => ({
      ...r,
      predictions: r.predictions.map((p) => ({
        ...p,
        prediction: Types.zPredictionResult.parse(p.prediction),
      })),
    }));

    const compareAgreement = (
      predictions: (typeof result)[0]["predictions"]
    ) => {
      if (predictions.length !== 2) {
        return null;
      }
      const [p0, p1] = predictions;
      const id0 = p0!.predictorId;
      const id1 = p1!.predictorId;
      const ftPredictor = predictors.ft.find(
        (p) => p.id === id0 || p.id === id1
      );
      const llmPredictor = predictors.llm.find(
        (p) => p.id === id0 || p.id === id1
      );

      if (!ftPredictor || !llmPredictor) {
        return null;
      }
      const ftPrediction = ftPredictor.id === id0 ? p0 : p1;
      const llmPrediction = llmPredictor.id === id0 ? p0 : p1;
      if (!ftPrediction || !llmPrediction) {
        return null;
      }

      // Check for every class if the prediction is the same.
      // excluding suppressed classes.
      const ftSelection = ftPrediction.prediction
        .filter((k) => k.selected)
        .map((k) => k.id);
      const llmSelection = llmPrediction.prediction
        .filter(
          (k) =>
            k.selected &&
            ftPredictor.supportedKlasses.some((s) => s.id === k.id)
        )
        .map((k) => k.id);

      return {
        bothNone: ftSelection.length === 0 && llmSelection.length === 0,
        oneMatch: ftSelection.some((k) => llmSelection.includes(k)),
        allMatch:
          ftSelection.every((k) => llmSelection.includes(k)) &&
          ftSelection.length === llmSelection.length &&
          ftSelection.length > 0,
      };
    };

    const parsedResult = result
      .map((r): [string, ReturnType<typeof compareAgreement>] => [
        r.classifierConfigId,
        compareAgreement(r.predictions),
      ])
      .filter(notEmpty)
      .reduce((acc, [configId, curr]) => {
        if (!curr) {
          return acc;
        }

        if (!acc.has(configId)) {
          acc.set(configId, {
            bothNone: curr.bothNone ? 1 : 0,
            oneMatch: curr.oneMatch ? 1 : 0,
            allMatch: curr.allMatch ? 1 : 0,
            total: 1,
          });
        } else {
          acc.get(configId)!.bothNone += curr.bothNone ? 1 : 0;
          acc.get(configId)!.oneMatch += curr.oneMatch ? 1 : 0;
          acc.get(configId)!.allMatch += curr.allMatch ? 1 : 0;
          acc.get(configId)!.total += 1;
        }
        return acc;
      }, new Map<string, { oneMatch: number; allMatch: number; bothNone: number; total: number }>());

    return parsedResult;
  }
);

export const predictionKlassData = cache(
  async (classifierId: string, durationString: string) => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    const result = (
      await prisma.predictionRequest.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          classifierId,
          status: "PASS",
        },
        select: {
          classifierConfigId: true,
          predictions: {
            select: {
              predictorId: true,
              prediction: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        // At most get 5000 results.
        take: 5000,
      })
    ).map((r) => ({
      ...r,
      predictions: r.predictions.map((p) => ({
        ...p,
        prediction: Types.zPredictionResult.parse(p.prediction),
      })),
    }));

    const predictorSettings = Array.from(
      new Set(result.map((r) => r.predictions.map((p) => p.predictorId)).flat())
    );
    const predictors = await loadPredictors(classifierId, predictorSettings);

    const getPrediction = (predictions: (typeof result)[0]["predictions"]) => {
      if (predictions.length === 0 || predictions.length > 2) {
        return null;
      }

      if (predictions.length === 1) {
        const p0 = predictions[0]!;
        const prediction = p0.prediction
          .filter((k) => k.selected)
          .map((k) => k.id);
        const predictor =
          predictors.ft.find((p) => p.id === p0.predictorId) ||
          predictors.llm.find((p) => p.id === p0.predictorId);
        if (!predictor) {
          return null;
        }
        return {
          prediction,
          available: predictor.supportedKlasses.map((k) => k.id),
        };
      }

      const [p0, p1] = predictions;
      const id0 = p0!.predictorId;
      const id1 = p1!.predictorId;
      const ftPredictor = predictors.ft.find(
        (p) => p.id === id0 || p.id === id1
      );
      const llmPredictor = predictors.llm.find(
        (p) => p.id === id0 || p.id === id1
      );

      if (!ftPredictor || !llmPredictor) {
        return null;
      }
      const ftPrediction = ftPredictor.id === id0 ? p0 : p1;
      const llmPrediction = llmPredictor.id === id0 ? p0 : p1;
      if (!ftPrediction || !llmPrediction) {
        return null;
      }

      // Check for every class if the prediction is the same.
      // excluding suppressed classes.
      const ftSelection = ftPrediction.prediction
        .filter((k) => k.selected)
        .map((k) => k.id);
      const llmSelection = llmPrediction.prediction
        .filter((k) => k.selected)
        .map((k) => k.id);

      if (
        llmPredictor.llmOptions.skipPriorAvailableKlasses &&
        !llmPredictor.llmOptions.addPriorSelectedKlasses
      ) {
        // Also include the FT prediction if the LLM prediction is empty.
        llmSelection.push(...ftSelection);
      }

      return {
        prediction: Array.from(new Set(llmSelection)),
        available: Array.from(
          new Set([
            ...ftPredictor.supportedKlasses.map((k) => k.id),
            ...llmPredictor.supportedKlasses.map((k) => k.id),
          ])
        ),
      };
    };

    const summary = result
      .map((r): [string, ReturnType<typeof getPrediction>] => [
        r.classifierConfigId,
        getPrediction(r.predictions),
      ])
      .reduce((acc, [configId, curr]) => {
        if (!curr) {
          return acc;
        }
        if (!acc.has(configId)) {
          acc.set(configId, [curr]);
        } else {
          acc.get(configId)?.push(curr);
        }
        return acc;
      }, new Map<string, NonNullable<ReturnType<typeof getPrediction>>[]>());

    const data = Array.from(summary.entries()).map(
      ([configId, predictions]) => {
        // For every config, find out some key stats.
        const numPredictions = predictions.map((p) => p.prediction.length);
        const maxGroup = 3;
        const predictionHistogram = numPredictions.reduce(
          (acc, curr) => {
            // More than 4 gets grouped together.
            const key = Math.min(curr, maxGroup);
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
          },
          new Map<number, number>([
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
          ])
        );

        // make predictionHistogram a percentage.
        const total = numPredictions.length;
        for (const [k, v] of predictionHistogram.entries()) {
          predictionHistogram.set(k, v / Math.max(total, 1));
        }

        // Find the distribution of each class.
        const classSelection = predictions.reduce((acc, curr) => {
          for (const klass of curr.prediction) {
            acc.set(klass, (acc.get(klass) || 0) + 1);
          }
          return acc;
        }, new Map<string, number>());

        const classAvailable = predictions.reduce((acc, curr) => {
          for (const klass of curr.available) {
            acc.set(klass, (acc.get(klass) || 0) + 1);
          }
          return acc;
        }, new Map<string, number>());

        return {
          configId,
          predictionHistogram: Array.from(predictionHistogram.entries()).map(
            ([k, v]) => ({
              numPredictions: k === maxGroup ? `${maxGroup}+` : k.toString(),
              count: v,
            })
          ),
          classUsage: Array.from(classAvailable.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => ({
              klassId: k,
              count: classSelection.get(k) || 0,
              percentage: (classSelection.get(k) || 0) / Math.max(1, v),
            })),
        };
      }
    );

    const klassIds = new Set<string>();
    data.forEach((d) => {
      d.classUsage.forEach((c) => klassIds.add(c.klassId));
    });

    const latestKlassNames = await prisma.klassVersion.findMany({
      where: {
        klassId: {
          in: Array.from(klassIds),
        },
      },
      select: {
        klassId: true,
        name: true,
        versionId: true,
      },
      orderBy: {
        versionId: "desc",
      },
    });

    const klassIdToName = new Map<string, string>();
    latestKlassNames.forEach((klass) => {
      if (!klassIdToName.has(klass.klassId)) {
        klassIdToName.set(klass.klassId, klass.name);
      }
    });

    return data.map((d) => ({
      configName: d.configId.split("_", 3)[2] ?? d.configId,
      predictionHistogram: d.predictionHistogram,
      classUsage: d.classUsage
        .map((c) => ({
          ...c,
          klassName: klassIdToName.get(c.klassId) || `${c.klassId} (unknown)`,
        }))
        .sort((a, b) => b.percentage - a.percentage),
    }));
  }
);

export const hallucinationListData = cache(
  async (classifierId: string, durationString: string) => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    const result: {
      hallucination: string;
    }[] = await prisma.$queryRaw`
    SELECT
    hallucination
FROM predictions
        LEFT JOIN prediction_requests ON predictions."requestId" = prediction_requests.id
WHERE
        predictions."createdAt" BETWEEN ${startDate} AND ${endDate}
        AND prediction_requests."classifierId" = ${classifierId}
        AND predictions."predictorType" = 'LLM'
        AND predictions.status = 'PASS'
        AND json_array_length(hallucination::json) > 0
        `;
    const hallucinatedText = result.flatMap((r) =>
      Types.zHallucinations.parse(r.hallucination)
    );
    const textFreq = new Map<string, number>();
    hallucinatedText.forEach(({ klassName: t }) => {
      textFreq.set(t, (textFreq.get(t) ?? 0) + 1);
    });

    return Array.from(textFreq.entries()).sort((a, b) => b[1] - a[1]);
  }
);

export const hallucinationData = cache(
  async (
    classifierId: string,
    durationString: string
  ): Promise<{
    hallucinations: HallucinationPlotData;
    configNames: string[];
  }> => {
    const duration = parseISODuration(durationString);
    const endDate = new Date();
    const startDate = sub(endDate, duration);

    const result: {
      classifierConfigId: string;
      time: Date;
      hallucination_count: bigint;
    }[] = await prisma.$queryRaw`
    SELECT
        date_trunc('hour', predictions."createdAt") AS time,
        prediction_requests."classifierConfigId" as "classifierConfigId",
        COUNT(*) as hallucination_count
FROM predictions
        LEFT JOIN prediction_requests ON predictions."requestId" = prediction_requests.id
WHERE
        predictions."createdAt" BETWEEN ${startDate} AND ${endDate}
        AND prediction_requests."classifierId" = ${classifierId}
        AND predictions."predictorType" = 'LLM'
        AND predictions.status = 'PASS'
        AND json_array_length(hallucination::json) > 0
GROUP BY
        time,
        prediction_requests."classifierConfigId"
ORDER BY
        time ASC
        `;

    const parsed = result.map((r) => ({
      ...r,
      hallucination_count: Number(r.hallucination_count),
    }));

    const configs = new Set<string>();
    const hallucinations = new Map<
      number,
      { [classifierConfigId: string]: number }
    >();

    parsed.forEach((r) => {
      const configName = r.classifierConfigId.split("_", 3)[2] ?? "Unknown";
      configs.add(configName);

      if (!hallucinations.has(r.time.getTime())) {
        hallucinations.set(r.time.getTime(), {
          [configName]: r.hallucination_count,
        });
      } else {
        hallucinations.set(r.time.getTime(), {
          ...hallucinations.get(r.time.getTime()),
          [configName]: r.hallucination_count,
        });
      }
    });

    // Find the earlier time.
    // Add all missing times.
    // Round to the nearest hour.
    const currTime = parsed.reduce((acc, curr) => {
      if (curr.time.getTime() < acc.getTime()) {
        return curr.time;
      }
      return acc;
    }, new Date(endDate.getTime() - (endDate.getTime() % 3600000)));

    while (currTime < endDate) {
      for (const m of [hallucinations]) {
        if (!m.has(currTime.getTime())) {
          m.set(currTime.getTime(), {
            ...Object.fromEntries(
              Array.from(configs.values()).map((c) => [c, 0])
            ),
          });
        } else {
          const currData = m.get(currTime.getTime())!;
          configs.forEach((c) => {
            if (!currData[c]) {
              currData[c] = 0;
            }
          });
        }
      }
      currTime.setHours(currTime.getHours() + 1);
    }

    const hallucinationList = Array.from(hallucinations.entries())
      .map(([time, counts]): HallucinationPlotData[0] => ({
        time,
        ...counts,
      }))
      .sort((a, b) => a.time - b.time);

    return {
      hallucinations: hallucinationList,
      configNames: Array.from(configs),
    };
  }
);
