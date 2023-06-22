"use client";

import { useUser } from "@clerk/nextjs";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { RecoilRoot, atom, useRecoilState } from "recoil";
import type { PredictorKlassDetails } from "@gloo/client-internal/src/fern/api/resources/v1";

import { KlassBadge } from "../../_components/PipelineView";
import { TestCaseDialog } from "../../playground/_helpers/TestCases/TestCaseDialog";
import type { KlassDetailsWithIsLocal } from "../_types/types";

import FeedbackButton from "./FeedbackButton";
import { PredictionChart } from "./PredictionChart";
import { RunProdPredictions } from "./RunProdPredictions";

import { VersionString } from "@/app/_utils/shared";
import { formatDate } from "@/app/_utils/utils";
import type { usageCharts } from "@/app/actions/analytics";
import type {
  ClientGetPredictionsResponse,
  getLatencyPercentiles,
} from "@/app/actions/classifiers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "allotment/dist/style.css";

const selectedPredictionAtom = atom<
  ClientGetPredictionsResponse["predictions"][0] | null
>({
  key: "selectedPredictionAtom",
  default: null,
});

export const PredictionsImpl = ({
  results,
  classifierId,
  chartData,
  latencyStats,
}: {
  results: ClientGetPredictionsResponse;
  classifierId: string;
  chartData: Awaited<ReturnType<typeof usageCharts>>;
  latencyStats: Awaited<ReturnType<typeof getLatencyPercentiles>>;
}) => {
  return (
    <>
      <RecoilRoot>
        <PredictionsContainer
          results={results}
          classifierId={classifierId}
          chartData={chartData}
          _latencyStats={latencyStats}
        />
      </RecoilRoot>
    </>
  );
};

const PredictionsContainer = ({
  results,
  classifierId,
  chartData,
  _latencyStats,
}: {
  results: ClientGetPredictionsResponse;
  classifierId: string;
  chartData: Awaited<ReturnType<typeof usageCharts>>;
  _latencyStats: Awaited<ReturnType<typeof getLatencyPercentiles>>;
}) => {
  return (
    <div className="flex h-full w-full flex-col  overflow-clip">
      <div className="flex h-fit w-full">
        <PredictionChart data={chartData} />
      </div>
      <PredictionsTable results={results} classifierId={classifierId} />
    </div>
  );
};

const PredictionsTable = ({
  results,
  classifierId,
}: {
  results: ClientGetPredictionsResponse;
  classifierId: string;
}) => {
  const user = useUser();

  return (
    <div className="w-full items-start flex-grow h-full">
      <div className="max-w-[1600px] flex w-full h-full flex-col">
        <div className="mt-4 flex w-full flex-row gap-x-4 p-0 pb-2 text-sm text-muted-foreground">
          <div className="w-full justify-start pt-4 text-left text-lg font-bold">
            <div className="text-foreground">Latest predictions</div>
          </div>
          <div className="flex w-full flex-row items-end justify-end gap-x-2 px-4 text-xs text-muted-foreground">
            <Link
              className="rounded-md border border-border p-2"
              href={
                "/dashboard/endpoints/classifiers/" +
                classifierId +
                "/predictions" +
                // TODO: because otherwise nextjs keeps this cached and doesn't
                // refresh. I think we neeed to call some function and revalidate the path instead.
                "?refreshedAt=" +
                new Date().toISOString()
              }
            >
              <RefreshCw className="w-4 h-4" />
            </Link>
            <Link
              prefetch={true}
              className={`rounded-md border border-border p-2 ${
                results.pagination.cursors.prevCursor
                  ? "hover:bg-muted"
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                if (!results.pagination.cursors.prevCursor) {
                  e.preventDefault();
                }
              }}
              href={
                results.pagination.cursors.prevCursor
                  ? `/dashboard/endpoints/classifiers/${classifierId}/predictions/?createdAt=${results.pagination.cursors.prevCursor}&direction=prev`
                  : "/dashboard"
              }
            >
              Prev
            </Link>

            <Link
              prefetch={true}
              className={`rounded-md border border-border p-2 ${
                results.pagination.cursors.nextCursor
                  ? "hover:bg-muted"
                  : "cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                if (!results.pagination.cursors.nextCursor) {
                  e.preventDefault();
                }
              }}
              href={
                results.pagination.cursors.nextCursor
                  ? `/dashboard/endpoints/classifiers/${classifierId}/predictions/?createdAt=${results.pagination.cursors.nextCursor}&direction=next`
                  : "/dashboard"
              }
            >
              Next
            </Link>
            {user?.user?.emailAddresses.toString().endsWith("@gloo.chat") && (
              <RunProdPredictions />
            )}
          </div>
        </div>
        <Separator />

        <ScrollArea
          type="always"
          className="flex-col flex w-full"
          style={{ height: "calc(100% - 250px)" }}
        >
          <div className="gap-4 gap-y-4 px-4">
            <Table>
              <TableHeader>
                <TableRow className="px-4 text-muted-foreground">
                  <TableCell>Timestamp</TableCell>
                  <TableCell className="px-2 text-center">Input</TableCell>
                  <TableCell className="px-3 text-center">Output</TableCell>
                  <TableCell className="px-4 text-center">Latency</TableCell>
                  <TableCell className="px-4 text-center">Config</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.predictions.map((prediction, i) => (
                  <PredictionRow key={i} prediction={prediction} />
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        <SheetPanel />
      </div>
    </div>
  );
};

const PredictionRow = ({
  prediction,
}: {
  prediction: ClientGetPredictionsResponse["predictions"][0];
}) => {
  const [selectedPrediction, setSelectedPrediction] = useRecoilState(
    selectedPredictionAtom
  );

  const hallucinations =
    prediction?.predictorDetails.flatMap((p) => {
      return p.type === "llm" ? p.hallucinations : [];
    }) ?? [];

  const classMap = useMemo(() => {
    const map = new Map<string, PredictorKlassDetails>();
    prediction.predictorDetails.flatMap((details) => {
      details.classes.forEach((klass) => {
        map.set(klass.klassId, klass);
      });
    });
    return map;
  }, [prediction.predictorDetails]);

  const selectedClasses = prediction.selectedClasses
    .map(({ id }) => {
      const klass = classMap.get(id);
      if (!klass) {
        throw new Error(`Could not find klass with id ${id}`);
      }
      return klass;
    })
    .filter((klass) => klass.selected);

  return (
    <>
      <TableRow
        className={clsx({
          "hover:cursor-pointer pointer-events-auto": true,
          "bg-muted": selectedPrediction?.id === prediction.id,
        })}
        onClick={() => {
          setSelectedPrediction(prediction);
        }}
      >
        <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap w-[90px]">
          {formatDate(parseISO(prediction.createdAt))}
        </TableCell>
        <TableCell className="px-4 text-foreground">
          <div
            // disabled
            className="h-[80px] min-w-[200px] lg:max-w-[400px] whitespace-normal overflow-hidden rounded-md placeholder:text-foreground placeholder-shown:text-foreground disabled:bg-inherit disabled:text-foreground"
          >
            {prediction.inputText}
          </div>
        </TableCell>
        <TableCell className="gap-y-2 px-4 text-center">
          <div className="flex flex-row justify-start gap-x-6 text-left items-center">
            <div>
              <FeedbackButton _prediction={prediction} />
            </div>
            {prediction.status === "FAIL" ? (
              <div className="text-red-500">Failed</div>
            ) : (
              <>
                {selectedClasses.length + hallucinations.length === 0 ? (
                  <div className="text-muted-foreground">None</div>
                ) : (
                  <div className="flex flex-col gap-y-2 items-start">
                    {selectedClasses.map((klass) => (
                      <KlassBadge
                        key={klass.klassId}
                        name={klass.klassName ?? "unknown"}
                        description={klass.klassDescription ?? "unknown"}
                        id={klass.klassId}
                        version={klass.klassVersion}
                        isLatestVersion={false}
                      />
                    ))}
                    {hallucinations?.map((h, index) => (
                      <KlassBadge
                        description={""}
                        id={"hallucination"}
                        name={h}
                        version={-3}
                        key={`hallucination-${index}`}
                        isLatestVersion={false}
                        hallucinated
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TableCell>
        <TableCell className="px-4 text-center">
          {prediction.predictorDetails.reduce(
            (prev, curr) => prev + curr.latencyMs,
            0
          )}{" "}
          ms
        </TableCell>
        <TableCell className="text-muted-foreground align-middle max-w-[80px] break-words">
          <div>{prediction.classifierConfig.id.split("_")[2]}</div>
          <VersionString version={prediction.classifierConfig.version} />
        </TableCell>
      </TableRow>
    </>
  );
};

const SheetPanel = () => {
  const [prediction, setSelectedPrediction] = useRecoilState(
    selectedPredictionAtom
  );

  const klassDetails: KlassDetailsWithIsLocal[] = useMemo(() => {
    const details: KlassDetailsWithIsLocal[] = [];
    prediction?.predictorDetails.flatMap((p) => {
      p.classes.map((c) => {
        details.push({
          id: c.klassId,
          name: c.klassName,
          version: c.klassVersion,
          description: c.klassDescription,
          isLocal: false,
        });
      });
    });
    return details;
  }, [prediction]);

  const hallucinations =
    prediction?.predictorDetails.flatMap((p) => {
      return p.type === "llm" ? p.hallucinations : [];
    }) ?? [];

  return (
    <>
      <Sheet
        open={prediction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPrediction(null);
          }
        }}
      >
        <SheetContent>
          {prediction && (
            <TestCaseDialog
              output={{
                latency: prediction.latencyMs,
                output: prediction,
                selected: klassDetails,
                hallucinations: hallucinations,
                status: "success",
              }}
              configId={prediction.classifierConfig.id}
              configVersionId={prediction.classifierConfig.version}
              inputText={prediction.inputText}
              title={
                prediction.inputText.length > 30
                  ? prediction.inputText.substring(0, 30) + "..."
                  : prediction.inputText
              }
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
