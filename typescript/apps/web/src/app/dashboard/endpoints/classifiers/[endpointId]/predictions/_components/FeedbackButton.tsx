"use client";

import {
  HandThumbDownIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import type { PredictorKlassDetails } from "@gloo/client-internal/src/fern/api/resources/v1";

import { KlassBadge } from "../../_components/PipelineView";

import type { ClientGetPredictionsResponse } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function _FeedbackButtonSoon({
  prediction,
}: {
  prediction: ClientGetPredictionsResponse["predictions"][0];
}) {
  const [showModal, setShowModal] = useState(false);

  const classMap = useMemo(() => {
    const map = new Map<string, PredictorKlassDetails>();
    prediction.predictorDetails.flatMap((details) => {
      details.classes.forEach((klass) => {
        map.set(klass.klassId, klass);
      });
    });
    return map;
  }, [prediction.predictorDetails]);

  const [selectedItems, setSelectedItems] = useState<PredictorKlassDetails[]>(
    () => {
      return Array.from(classMap.values()).filter((klass) => klass.selected);
    }
  );

  const handleSelection = (item: PredictorKlassDetails) => {
    setSelectedItems((prevSelectedItems) => {
      if (
        prevSelectedItems.some((selected) => selected.klassId === item.klassId)
      ) {
        return prevSelectedItems.filter(
          (selected) => selected.klassId !== item.klassId
        );
      } else {
        return [...prevSelectedItems, item];
      }
    });
  };

  const isItemSelected = (item: PredictorKlassDetails) =>
    selectedItems.some((selected) => selected.klassId === item.klassId);

  return (
    <Dialog onOpenChange={setShowModal} open={showModal}>
      <DialogTrigger asChild>
        <div
          className="group h-fit w-fit p-1 hover:cursor-pointer"
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            // e.preventDefault();
            e.stopPropagation();
          }}
        >
          <HandThumbUpIcon className="h-5 w-5 group-hover:text-green-500" />
          <HandThumbDownIcon className="h-5 w-5 group-hover:text-red-500" />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit feedback</DialogTitle>
          <div className="w-full border-none p-2">
            <CardTitle className="pb-2">Input</CardTitle>
            <Textarea className="flex w-full" value={prediction.inputText} />
          </div>
          {prediction.normalizer && (
            <div className="w-full border-none p-2">
              <CardTitle className="pb-2">Normalized Output</CardTitle>
              <Textarea
                className="flex w-full"
                value={prediction.normalizer.text}
              />
            </div>
          )}
          <>
            <Card className="w-full border-none p-2 shadow-none">
              <CardTitle className="pb-2">Predictions</CardTitle>
              <div>Select the correct classes for this input</div>
              <CardContent className="">
                <div className="flex w-full flex-row flex-wrap items-center justify-center gap-2 p-2">
                  {Array.from(classMap.values()).map((c) => (
                    <div
                      key={c.klassId}
                      onClick={() => handleSelection(c)}
                      className={
                        isItemSelected(c)
                          ? "rounded-full border-4 border-indigo-500"
                          : ""
                      }
                    >
                      <KlassBadge
                        description={c.klassDescription}
                        id={c.klassId}
                        name={c.klassName}
                        suppressed={false}
                        version={c.klassVersion}
                        isLatestVersion={false}
                        key={c.klassId}
                        className={
                          isItemSelected(c) ? "bg-indigo-400" : "bg-opacity-30"
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div></div>
          </>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowModal(false);
              }}
              type="submit"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function FeedbackButton({
  _prediction,
}: {
  _prediction: ClientGetPredictionsResponse["predictions"][0];
}) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div
          className="group h-fit w-fit p-1 hover:cursor-pointer text-muted-foreground"
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            // e.preventDefault();
            e.stopPropagation();
          }}
        >
          <HandThumbUpIcon className="h-5 w-5 group-hover:text-green-500" />
          <HandThumbDownIcon className="h-5 w-5 group-hover:text-red-500" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div>Coming soon</div>
      </TooltipContent>
    </Tooltip>
  );
}
