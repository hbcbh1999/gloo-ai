import type { LineChartProps } from "@tremor/react";
import { AreaChart, BarChart, BarList, LineChart } from "@tremor/react";
import { Suspense } from "react";
import { ClipLoader } from "react-spinners";
import type { ClassNameValue } from "tailwind-merge/dist/lib/tw-join";

import { percentileFormatter } from "./_components/formatter";

import type { PredictionCountPlotData } from "@/app/actions/analytics";
import {
  hallucinationData,
  hallucinationListData,
  latencyPlotData,
  predictionAlignmentData,
  predictionKlassData,
  usageCharts,
} from "@/app/actions/analytics";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const colors: LineChartProps["colors"] = [
  "indigo",
  "emerald",
  "amber",
  "red",
  "blue",
  "pink",
  "purple",
];

async function _LatencyChart({ endpointId }: { endpointId: string }) {
  const { latency, configNames } = await latencyPlotData(endpointId, "P7D");

  return (
    <>
      <CardTitle className="pt-2 px-2">Latency</CardTitle>
      <CardContent className="w-full h-full p-1">
        <LineChart
          className="w-full h-full bg-background"
          data={latency}
          categories={configNames}
          index={"percentile"}
          colors={colors}
        />
      </CardContent>
    </>
  );
}

async function HallucinationChart({ endpointId }: { endpointId: string }) {
  const { hallucinations, configNames } = await hallucinationData(
    endpointId,
    "P7D"
  );

  return (
    <>
      <CardTitle className="pt-2 px-2">Hallucination Counts</CardTitle>
      <CardContent className="w-full h-full p-1">
        <AreaChart
          className="w-full h-full bg-background"
          data={hallucinations.map((d) => {
            return {
              ...d,
              time: new Date(d.time).toLocaleString(),
            };
          })}
          categories={configNames}
          index={"time"}
          colors={colors}
        />
      </CardContent>
    </>
  );
}

async function HallucinationTable({ endpointId }: { endpointId: string }) {
  const hallucinationList = await hallucinationListData(endpointId, "P7D");

  return (
    <>
      <CardTitle className="pt-2 px-2">Top Hallucinated Classes</CardTitle>
      <CardContent className="w-full h-full p-2">
        {hallucinationList.length === 0 ? (
          <div className="w-full h-full items-center justify-center flex">
            <p className="text-muted-foreground/70">No hallucinations 👻!</p>
          </div>
        ) : (
          <ScrollArea className="flex w-full h-full py-4 pb-12">
            <BarList
              data={hallucinationList.map((v) => {
                return {
                  name: v[0],
                  value: v[1],
                  color: "blue",
                };
              })}
            />
          </ScrollArea>
        )}
      </CardContent>
    </>
  );
}

async function ClassAlignment({ endpointId }: { endpointId: string }) {
  const alignment = await predictionAlignmentData(endpointId, "P1D");

  if (alignment.size === 0) {
    return (
      <DashboardCard>
        <CardTitle className="pt-2 px-2">Class Alignment Rate</CardTitle>
        <div className="px-2 font-light">
          How often the LLM chooses the same classes as the fine-tuned model
        </div>
        <CardContent className="w-full h-full p-1 items-center justify-center flex">
          <div className="text-muted-foreground/70">No data</div>
        </CardContent>
      </DashboardCard>
    );
  }
  return (
    <>
      {Array.from(alignment.entries()).map(([configName, data]) => (
        <DashboardCard key={configName}>
          <CardTitle className="pt-2 px-2">
            Class Alignment Rate: {configName.split("_")[2]} (last 5k
            predictions)
          </CardTitle>
          <div className="px-2 font-light">
            How often the LLM chooses the same classes as the fine-tuned model
          </div>
          <CardContent className="w-full h-full p-1">
            At least 1 match: {data.oneMatch} (
            {((data.oneMatch / Math.max(1, data.total)) * 100).toFixed(2)}%)
            <br />
            All match: {data.allMatch} (
            {((data.allMatch / Math.max(1, data.total)) * 100).toFixed(2)}%)
          </CardContent>
        </DashboardCard>
      ))}
    </>
  );
}

async function ClassFrequency({ endpointId }: { endpointId: string }) {
  const data = await predictionKlassData(endpointId, "P3D");

  if (data.length === 0) {
    return (
      <>
        <CardTitle className="pt-2 px-2">Class Selection Rate</CardTitle>
        <CardContent className="w-full h-full p-1 items-center justify-center flex">
          <div className="text-muted-foreground/70">No data</div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      {data.map(({ predictionHistogram, classUsage, configName }) => (
        <>
          <DashboardCard key={`${configName}-usage`} classNames="h-[300px]">
            <CardTitle className="pt-2 px-2">
              Class Selection Rate: {configName}
            </CardTitle>
            <div className="px-2 font-light">
              How frequently the API returns the classes below
            </div>
            <CardContent className="w-full h-full p-1">
              <ScrollArea className="flex w-full h-full py-4 pb-12">
                <BarList
                  data={classUsage.map((v) => {
                    return {
                      name: `${v.klassName} (${(v.percentage * 100).toFixed(
                        2
                      )}%)`,
                      value: v.count,
                      color: "blue",
                    };
                  })}
                />
              </ScrollArea>
            </CardContent>
          </DashboardCard>

          <DashboardCard key={`${configName}-counts`} classNames="h-[300px]">
            <CardTitle className="pt-2 px-2">
              Class Selection Distribution: {configName}
            </CardTitle>
            <CardContent className="w-full h-full p-1">
              <BarChart
                maxValue={1}
                minValue={0}
                className="w-full h-full bg-background"
                data={predictionHistogram}
                categories={["count"]}
                index="numPredictions"
                valueFormatter={percentileFormatter}
              />
            </CardContent>
          </DashboardCard>
        </>
      ))}
    </>
  );
}

const ErrorRate = async ({
  usage,
}: {
  usage: ReturnType<typeof usageCharts>;
}) => {
  const { errorRate, configNames } = await usage;
  return (
    <>
      <CardTitle className="pt-2 px-2">Error Rate</CardTitle>
      <CardContent className="w-full h-full p-1">
        <AreaChart
          className="w-full h-full bg-background"
          categories={configNames}
          data={errorRate.map((d) => {
            return {
              ...d,
              time: new Date(d.time).toLocaleString(),
            };
          })}
          valueFormatter={percentileFormatter}
          colors={colors}
          index={"time"}
        />
      </CardContent>
    </>
  );
};

const P75Latency = async ({
  usage,
}: {
  usage: ReturnType<typeof usageCharts>;
}) => {
  const { p75Latency, configNames } = await usage;
  return (
    <>
      <CardTitle className="pt-2 px-2">P75 Latency (ms)</CardTitle>
      <CardContent className="w-full h-full p-1">
        <AreaChart
          className="w-full h-full bg-background"
          categories={configNames}
          data={p75Latency.map((d) => {
            return {
              ...d,
              time: new Date(d.time).toLocaleString(),
            };
          })}
          colors={colors}
          index={"time"}
        />
      </CardContent>
    </>
  );
};

const APICalls = async ({
  usage,
}: {
  usage: ReturnType<typeof usageCharts>;
}) => {
  const { counts, configNames } = await usage;
  return (
    <>
      <CardTitle className="pt-2 px-2">API Calls</CardTitle>
      <CardContent className="w-full h-full p-1">
        <AreaChart
          className="w-full h-full bg-background"
          categories={configNames}
          data={counts.map((d) => {
            return {
              ...d,
              time: new Date(d.time).toLocaleString(),
            };
          })}
          showLegend={false}
          connectNulls={false}
          colors={colors}
          index="time"
        />
      </CardContent>
    </>
  );
};

function sumClassifierConfigIds(data: PredictionCountPlotData, keys: string[]) {
  return data.reduce((total, current) => {
    for (const key of keys) {
      const value = current[key];
      if (value) {
        total += value;
      }
    }
    return total;
  }, 0);
}

const OverviewCards = async ({
  usage,
  endpointId,
}: {
  endpointId: string;
  usage: ReturnType<typeof usageCharts>;
}) => {
  const { errorRate, configNames, counts } = await usage;

  const totalCounts = sumClassifierConfigIds(counts, configNames);
  const totalErrors =
    sumClassifierConfigIds(errorRate, configNames) / errorRate.length;
  const { latency, configNames: configNames2 } = await latencyPlotData(
    endpointId,
    "P7D"
  );

  console.log("latency", JSON.stringify(latency), configNames2);
  //find the item with 75 percentile
  const percentile75Data = latency.find((data) => data.percentile === 75);

  if (!percentile75Data) {
    return <>no data</>;
  }

  console.log(percentile75Data, configNames);

  const configIdLatencyData = configNames.map((configId) => ({
    configId: configId,
    latency: percentile75Data[configId],
  }));

  return (
    <>
      <Card className="p-4 w-[200px] h-[120px]">
        <CardTitle className="text-muted-foreground/70 text-base font-light">
          API Calls
        </CardTitle>
        <CardContent className="w-full h-full p-1">
          <div className="flex flex-col">
            <div className="font-semibold text-2xl">{totalCounts}</div>
          </div>
        </CardContent>
      </Card>
      <Card className="p-4 w-[200px] h-[120px]">
        <CardTitle className="text-muted-foreground/70 text-base font-light">
          Error Rate %
        </CardTitle>
        <CardContent className="w-full h-full p-1">
          <div className="flex flex-col">
            <div className="font-semibold text-2xl">
              {totalErrors.toFixed(2)} %
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="p-4 w-fit">
        <CardTitle className="text-muted-foreground/70 text-base font-light">
          P75 Latencies
        </CardTitle>
        <CardContent className="w-full h-full p-1 flex flex-wrap max-w-[500px] gap-x-8">
          {configIdLatencyData.map(({ configId, latency }) => (
            <div className="flex flex-col" key={configId}>
              <div className="font-semibold text-2xl">{latency} ms</div>
              <div className="font-light text-muted-foreground/70">
                {configId}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};

export default function Analytics({
  params: { endpointId },
}: {
  params: { endpointId: string };
}) {
  const usagePromise = usageCharts(endpointId, "P7D");

  return (
    <ScrollArea
      className="w-full flex flex-col bg-muted/20 px-6 h-[95%]"
      type="auto"
    >
      <h1 className="font-semibold text-2xl py-4">Analytics (7 days)</h1>
      <div className="flex w-full h-fit">
        <div className="font-semibold text-xl">Overview</div>
        <div className="flex flex-wrap items-center justify-center w-full h-full p-4 gap-5">
          <OverviewCards usage={usagePromise} endpointId={endpointId} />
        </div>
      </div>

      <div className="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-3">
        <DashboardCard>
          <APICalls usage={usagePromise} />
        </DashboardCard>
        <DashboardCard>
          <ErrorRate usage={usagePromise} />
        </DashboardCard>
        <DashboardCard>
          <P75Latency usage={usagePromise} />
        </DashboardCard>
        {/* <DashboardCard>
          <LatencyChart endpointId={endpointId} />
        </DashboardCard> */}
        <DashboardCard>
          <HallucinationChart endpointId={endpointId} />
        </DashboardCard>
        <DashboardCard classNames="h-[300px]">
          <HallucinationTable endpointId={endpointId} />
        </DashboardCard>
        <Suspense
          fallback={
            <div className="flex w-full h-full items-center justify-center">
              <ClipLoader size={12} color="gray" />
            </div>
          }
        >
          <ClassAlignment endpointId={endpointId} />
        </Suspense>
        <Suspense
          fallback={
            <div className="flex w-full h-full items-center justify-center">
              <ClipLoader size={12} color="gray" />
            </div>
          }
        >
          <ClassFrequency endpointId={endpointId} />
        </Suspense>
      </div>
    </ScrollArea>
  );
}

const DashboardCard = ({
  children,
  classNames,
}: {
  children: React.ReactNode;
  classNames?: ClassNameValue;
}) => {
  return (
    <Card
      className={cn(
        "flex w-full h-[200px] flex-col gap-y-2 pt-2 px-2 shadow-sm overflow-clip",
        classNames
      )}
    >
      <Suspense
        fallback={
          <>
            <div className="w-full h-full items-center justify-center flex">
              <ClipLoader size={12} color="gray" />
            </div>
          </>
        }
      >
        {children}
      </Suspense>
    </Card>
  );
};
