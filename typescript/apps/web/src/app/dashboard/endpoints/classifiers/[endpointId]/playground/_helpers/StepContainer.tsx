"user client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRecoilState } from "recoil";
import { useMemo } from "react";

import { enabledAtom } from "./atoms";

import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PropsWithClassNames } from "@/app/_utils/utils";
import { Card, CardContent } from "@/components/ui/card";

const StepContainer = ({
  title,
  children,
  className,
  param,
  settingAvailable = true,
}: {
  title: string;
  children: React.ReactNode;
  settingAvailable?: boolean;
  defaultEnabled?: boolean;
  param: "llm" | "normalizer" | "ft";
} & PropsWithClassNames) => {
  const [enabled, setEnabled] = useRecoilState(enabledAtom(param));
  const showBox = useMemo(
    () => settingAvailable && enabled,
    [settingAvailable, enabled]
  );

  return (
    <div className="w-full px-4">
      <Card
        className={clsx(
          "flex w-full flex-col rounded-md bg-background p-4",
          {
            "bg-muted/20": !showBox,
            "text-primary/50": !showBox,
          },
          className
        )}
      >
        <BoxTitle
          title={title}
          disabled={!showBox}
          settingAvailable={settingAvailable}
          setDisabled={(checked) => {
            if (settingAvailable) {
              setEnabled(checked);
            }
          }}
        />
        <CardContent className={clsx([enabled ? "" : "p-0 px-0 py-0"])}>
          {(enabled || !settingAvailable) && children}
        </CardContent>
      </Card>
    </div>
  );
};
const BoxTitle = ({
  title,
  disabled,
  setDisabled,
  settingAvailable,
}: {
  title: string;
  disabled: boolean;
  settingAvailable: boolean;
  setDisabled: (disabled: boolean) => void;
}) => (
  <div className="mb-2 flex flex-row items-center justify-between gap-x-2">
    <div className="flex items-center">
      <h2
        className={clsx("font-semibold", {
          "text-lg": !disabled,
        })}
      >
        {title}
      </h2>
      <QuestionMarkCircleIcon className="ml-2 h-5 w-5 text-foreground/80" />
    </div>
    {
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild={settingAvailable}>
          <Switch
            className={clsx({
              "bg-green-700": !disabled,
              "bg-destructive/50": disabled,
              "bg-muted": !settingAvailable,
            })}
            disabled={!settingAvailable}
            checked={!disabled}
            onCheckedChange={setDisabled}
          />
        </TooltipTrigger>
        <TooltipContent>
          {disabled
            ? settingAvailable
              ? "Disabled"
              : "Please contact us to enable this feature for your account"
            : "Enabled"}
        </TooltipContent>
      </Tooltip>
    }
  </div>
);

export default StepContainer;
