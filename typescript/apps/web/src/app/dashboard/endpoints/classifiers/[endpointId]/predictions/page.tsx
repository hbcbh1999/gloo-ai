import { PredictionsImpl } from "./_components/predictionsImpl";

import { usageCharts } from "@/app/actions/analytics";
import type { ClientGetPredictionsRequest } from "@/app/actions/classifiers";
import { getLatencyPercentiles } from "@/app/actions/classifiers";
import { getPredictionCounts, getPredictions } from "@/app/actions/classifiers";

export const dynamic = "force-dynamic";

export default async function Predictions({
  params,
  searchParams,
}: {
  params: { endpointId: string };
  searchParams: ClientGetPredictionsRequest["searchParams"];
}) {
  const classifierId = params.endpointId;
  const [results, _, latencyStats, metrics] = await Promise.all([
    getPredictions({ classifierId, searchParams }),
    getPredictionCounts("7d", classifierId),
    getLatencyPercentiles("7d", classifierId),
    usageCharts(classifierId, "P7D"),
  ]);

  return (
    <div className="flex h-[95%] w-full flex-col gap-y-4 p-4 pb-0">
      {/* <h1 className="text-lg font-bold">Predictions</h1> */}
      {/* <PredictionChart data={chartData} /> */}
      {/* <div className="flex h-full w-full"> */}
      <PredictionsImpl
        results={results}
        classifierId={classifierId}
        chartData={metrics}
        latencyStats={latencyStats}
      />
      {/* </div> */}
    </div>
  );
}
