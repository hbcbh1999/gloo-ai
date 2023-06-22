"use client";

import { AreaChart } from "@tremor/react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { usageCharts } from "@/app/actions/analytics";

// const dataFormatter = (number: number) => {
//   return "$ " + Intl.NumberFormat("us").format(number).toString();
// };

export const PredictionChart = ({
  data: { counts, configNames },
}: {
  data: Awaited<ReturnType<typeof usageCharts>>;
}) => {
  const chartData = useMemo(() => {
    return counts.map((d) => {
      return {
        ...d,
        time: new Date(d.time).toLocaleString(),
      };
    });
  }, [counts]);

  return (
    <Card className="w-full flex-grow flex-col">
      <CardHeader>
        <CardTitle>Number of Predictions (7 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-[100px] w-full"
          data={chartData}
          showLegend={false}
          showXAxis={false}
          connectNulls={false}
          index="time"
          categories={configNames}
          yAxisWidth={48}
        />
      </CardContent>
    </Card>
  );
};
