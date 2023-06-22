"user client";

import type { PrismaBase } from "@gloo/database";
import React from "react";
import { useRecoilState, useRecoilValue } from "recoil";

import { KlassBadge } from "../../_components/PipelineView";

import { ftPredictorEditorAtom, pipelineViewAtom } from "./atoms";

import type { ClientClassifier } from "@/app/actions/classifiers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const FTPredictorEditor: React.FC<{
  history: PrismaBase.Predictor[];
  endpoints: ClientClassifier["TrainedEndpoints"];
}> = ({ history: _history, endpoints }) => {
  const { klasses } = useRecoilValue(pipelineViewAtom);
  const [predictorOptions, setPredictorOptions] = useRecoilState(
    ftPredictorEditorAtom
  );

  if (endpoints.length === 0) {
    return (
      <div className="font-light text-sm whitespace-pre-wrap">
        Contact us to train your own custom model to reduce LLM costs by 99%:
        <a
          href="mailto:founders@gloo.chat"
          className="text-muted-foreground underline"
        >
          founders@gloo.chat
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-row items-center gap-1">
        <div>Endpoint</div>
        <Select
          onValueChange={(update) => {
            const match = endpoints.find((endpoint) => endpoint.id === update);
            if (!match) return;
            setPredictorOptions({
              klasses: {
                supressed: [],
                available: match.supportedKlasses,
              },
              options: {
                failureMode: "THROW",
                endpoint: match.id,
              },
            });
          }}
        >
          <SelectTrigger className="w-fit">
            {predictorOptions?.options.endpoint ?? "Select an endpoint"}
          </SelectTrigger>
          <SelectContent>
            {endpoints.map((endpoint) => (
              <SelectItem key={endpoint.id} value={endpoint.id}>
                {endpoint.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2 gap-y-3 px-2">
        {predictorOptions?.klasses.available.map((klass) => {
          const match = klasses.find(
            (k) => k.id === klass.id && k.version === klass.version
          );
          if (!match) return null;

          const isSupressed = predictorOptions.klasses.supressed.includes(
            klass.id
          );

          return (
            <div
              className="h-fit w-fit p-0"
              onClick={() => {
                setPredictorOptions((prev) => {
                  if (!prev) return prev;

                  if (isSupressed) {
                    return {
                      ...prev,
                      klasses: {
                        ...prev.klasses,
                        supressed: prev.klasses.supressed.filter(
                          (id) => id !== klass.id
                        ),
                      },
                    };
                  }
                  return {
                    ...prev,
                    klasses: {
                      ...prev.klasses,
                      supressed: [...prev.klasses.supressed, klass.id],
                    },
                  };
                });
              }}
              key={match.id}
            >
              <KlassBadge {...match} isLatestVersion suppressed={isSupressed} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FTPredictorEditor;
