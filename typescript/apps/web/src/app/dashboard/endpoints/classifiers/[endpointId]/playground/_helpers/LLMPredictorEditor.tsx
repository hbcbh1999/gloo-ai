"user client";

import type { PrismaBase } from "@gloo/database";
import type { PropsWithChildren } from "react";
import React from "react";
// This must be imported as only a type otherwise next won't compile.
import { useRecoilState, useRecoilValue } from "recoil";
import { Info } from "lucide-react";

import { enabledAtom, llmPredictorEditorAtom } from "./atoms";

import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const LLMPredictorEditor: React.FC<
  { history: PrismaBase.Predictor[] } & PropsWithChildren
> = ({ history: _history, children }) => {
  const ftEnabled = useRecoilValue(enabledAtom("ft"));
  const [predictorOptions, setPredictorOptions] = useRecoilState(
    llmPredictorEditorAtom
  );

  if (!predictorOptions) {
    return null;
  }

  const handleInputChange = ({
    name,
    value,
  }: {
    name: string;
    value: string;
  }) => {
    if (name === "modelName") {
      setPredictorOptions({
        klasses: predictorOptions.klasses,
        options: {
          ...predictorOptions.options,
          llmConfig: {
            ...predictorOptions.options.llmConfig,
            modelName: value,
          },
        },
      });
    } else if (name === "failureMode") {
      setPredictorOptions({
        klasses: predictorOptions.klasses,
        options: {
          ...predictorOptions.options,
          failureMode:
            predictorOptions.options.failureMode === "IGNORE"
              ? "THROW"
              : "IGNORE",
        },
      });
    } else if (name === "skipPriorAvailableKlasses") {
      setPredictorOptions({
        klasses: predictorOptions.klasses,
        options: {
          ...predictorOptions.options,
          skipPriorAvailableKlasses:
            !predictorOptions.options.skipPriorAvailableKlasses,
        },
      });
    } else if (name === "addPriorSelectedKlasses") {
      setPredictorOptions({
        klasses: predictorOptions.klasses,
        options: {
          ...predictorOptions.options,
          addPriorSelectedKlasses:
            !predictorOptions.options.addPriorSelectedKlasses,
        },
      });
    } else {
      setPredictorOptions({
        ...predictorOptions,
        options: {
          ...predictorOptions.options,
          [name]: value,
        },
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-y-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block">
              <span className="font-medium text-foreground/80">Model Name</span>

              <Select
                value={predictorOptions.options.llmConfig.modelName}
                onValueChange={(v: string) =>
                  handleInputChange({
                    name: "modelName",
                    value: v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {predictorOptions.options.llmConfig.modelName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="flex-1">
            <label className="block">
              <span className="font-medium text-foreground/80">
                Ignore failures
              </span>
              <div className="mt-2">
                <Checkbox
                  checked={predictorOptions.options.failureMode === "IGNORE"}
                  onCheckedChange={(checked) => {
                    handleInputChange({
                      name: "failureMode",
                      value: checked ? "IGNORE" : "THROW",
                    });
                  }}
                />
                <span className="ml-2 italic text-gray-700">
                  On failures, return any classes that were valid
                </span>
              </div>
            </label>
          </div>
        </div>
        {ftEnabled && (
          <div>
            <div className="flex gap-1 text-xs text-foreground/75">
              <Info className="h-4 w-4 stroke-1" />
              Since you&apos;ve enabled a fine tuned model, some new settings
              are available.
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={predictorOptions.options.skipPriorAvailableKlasses}
                onCheckedChange={() => {
                  handleInputChange({
                    name: "skipPriorAvailableKlasses",
                    value: "checked",
                  });
                }}
              />
              <span className="italic">
                Exclude classes already considered by prior models.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={predictorOptions.options.addPriorSelectedKlasses}
                onCheckedChange={() => {
                  handleInputChange({
                    name: "addPriorSelectedKlasses",
                    value: "checked",
                  });
                }}
              />
              <span className="italic">Validate prior model selections</span>
            </div>
          </div>
        )}

        <hr />

        <div className="flex-1 ">
          <span className="text-gray-500">
            Complete the sentence to best suit your task.
          </span>

          <label className="block text-base">
            <div className="flex flex-row items-center gap-x-2 whitespace-pre-wrap text-base">
              This is{" "}
              {predictorOptions.options.objective &&
                predictorOptions.options.objective.length > 0 &&
                (["a", "e", "i", "o", "u"].includes(
                  predictorOptions.options.objective.at(0) as string
                )
                  ? "an"
                  : "a")}
              <Input
                placeholder="objective"
                name="objective"
                type="text"
                className="w-24"
                value={predictorOptions.options.objective}
                onChange={(event) => {
                  handleInputChange({
                    name: "objective",
                    value: event.target.value,
                  });
                }}
              />
              classifier for
              <Input
                placeholder="input description"
                name="inputDescription"
                type="text"
                value={predictorOptions.options.inputDescription}
                onChange={(event) => {
                  handleInputChange({
                    name: "inputDescription",
                    value: event.target.value,
                  });
                }}
              />
              .
            </div>
          </label>
        </div>
      </form>
      {children}
    </div>
  );
};

export default LLMPredictorEditor;
