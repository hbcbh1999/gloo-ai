"user client";

import type { PrismaBase } from "@gloo/database";
import React from "react";
import { useRecoilState } from "recoil";

import { normalizerSettingsAtom } from "./atoms";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NormalizerEditor: React.FC<{ history: PrismaBase.Normalizer[] }> = ({
  history: _history,
}) => {
  const [normalizerSettings, setNormalizerSettings] = useRecoilState(
    normalizerSettingsAtom
  );

  if (!normalizerSettings) {
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
      setNormalizerSettings({
        ...normalizerSettings,
        llmConfig: {
          ...normalizerSettings.llmConfig,
          modelName: value,
        },
      });
    } else if (name === "failureMode") {
      setNormalizerSettings({
        ...normalizerSettings,
        failureMode:
          normalizerSettings.failureMode === "IGNORE" ? "THROW" : "IGNORE",
      });
    } else {
      setNormalizerSettings({
        ...normalizerSettings,
        [name]: value,
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
                value={normalizerSettings.llmConfig.modelName}
                onValueChange={(v: string) =>
                  handleInputChange({
                    name: "modelName",
                    value: v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {normalizerSettings.llmConfig.modelName}
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
                  checked={normalizerSettings.failureMode === "IGNORE"}
                  onCheckedChange={(checked) => {
                    handleInputChange({
                      name: "failureMode",
                      value: checked ? "IGNORE" : "THROW",
                    });
                  }}
                />
                <span className="ml-2 italic text-gray-700">
                  On failure, continue to the next step
                </span>
              </div>
            </label>
          </div>
        </div>

        <label className="block">
          <span className="font-semibold text-foreground/90">Prompt</span>
          <Textarea
            name="prompt"
            className="text-base"
            value={normalizerSettings.prompt}
            onChange={(e) => {
              handleInputChange({
                name: "prompt",
                value: e.target.value,
              });
            }}
            rows={5}
          />
        </label>
      </form>
    </div>
  );
};

export default NormalizerEditor;
