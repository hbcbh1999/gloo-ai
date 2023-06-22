"use client";

import type {
  NormalizerOverride,
  TraditionalPredictorOverride,
  LlmPredictorOverride,
} from "@gloo/client-internal";
import { ArrowLongDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import {
  QuestionMarkCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { CircleSlash, Ghost } from "lucide-react";
import type { KlassSelection } from "@gloo/client-internal/src/fern/api/resources/v1";

import {
  KlassInfoSimple,
  getKlassColor,
} from "../definition/_components/KlassInfo";
import type { ClientKlassDetails } from "../playground/_helpers/atoms";
import { LocalKlassVersion } from "../playground/_helpers/atoms";

import { Checkbox } from "@/components/ui/checkbox";
import type { PropsWithClassNames } from "@/app/_utils/utils";
import { notEmpty } from "@/app/_utils/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { VersionString } from "@/app/_utils/shared";

const NodeTitle: React.FC<{ title: string }> = ({ title }) => {
  return <div className="flex items-center gap-1 font-semibold">{title}</div>;
};

const NormalizerView: React.FC<{
  normalizer: NormalizerOverride;
}> = ({ normalizer }) => {
  return (
    <div className="flex flex-col gap-y-5">
      <div className="flex flex-row items-center gap-x-2">
        <SparklesIcon className="h-6 w-6 text-foreground" />
        <NodeTitle title="Normalizer" />
      </div>

      <div className="flex flex-col gap-y-2 text-sm">
        <div className="flex justify-between gap-1">
          <div className="text-muted-foreground">
            {normalizer.llmConfig.modelName}
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
            <Checkbox
              checked={normalizer.failureMode === "IGNORE"}
              disabled={true}
            />
            Ignore failures
            <QuestionMarkCircleIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="pointer-events-none w-full whitespace-pre-wrap rounded-md bg-muted/60 p-2">
          {normalizer.prompt}
        </div>
      </div>
    </div>
  );
};

const BaseKlassBadge: React.FC<
  {
    id: string;
    name: string;
    version: number | null;
    description: string;
    suppressed?: boolean;
    hallucinated?: boolean;
  } & PropsWithClassNames
> = ({ id, suppressed, name, version, className, hallucinated }) => {
  const color = getKlassColor(id);

  return (
    <Badge
      className={clsx(
        hallucinated
          ? ""
          : suppressed
          ? `border-${color}`
          : `bg-${color} hover:bg-${color}/80 text-foreground`,
        className
      )}
      variant={
        hallucinated
          ? "destructive-outline"
          : suppressed
          ? "outline"
          : "default"
      }
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span
          className={clsx(
            "truncate",
            suppressed ? `line-through text-${color}` : "",
            "flex flex-row items-center gap-1"
          )}
        >
          {hallucinated && <Ghost className="h-4 w-4 stroke-1" />}{" "}
          {suppressed && <CircleSlash className="h-4 w-4 stroke-1" />} {name}
        </span>
        {!hallucinated && version !== null && (
          <VersionString version={version} />
        )}
      </div>
    </Badge>
  );
};

export const KlassBadge: React.FC<
  {
    id: string;
    name: string;
    version: number;
    description: string;
    isLatestVersion: boolean;
    noTooltip?: boolean;
    suppressed?: boolean;
    hallucinated?: boolean;
  } & PropsWithClassNames
> = ({
  name,
  version,
  description,
  id,
  isLatestVersion,
  noTooltip,
  suppressed,
  hallucinated,
  className,
}) => {
  const isLatest = isLatestVersion || version === LocalKlassVersion;

  if (noTooltip) {
    return (
      <BaseKlassBadge
        description={description}
        id={id}
        version={isLatest ? null : version}
        name={name}
        className={className}
        hallucinated={hallucinated}
        suppressed={suppressed}
      />
    );
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger>
        <BaseKlassBadge
          description={description}
          id={id}
          version={isLatest ? null : version}
          name={name}
          className={className}
          hallucinated={hallucinated}
          suppressed={suppressed}
        />
      </TooltipTrigger>
      <TooltipContent>
        <KlassInfoSimple
          name={name}
          description={description}
          id={id}
          version={version}
          isLatestVersion={isLatestVersion}
          supressed={suppressed}
          hallucinated={hallucinated}
        />
      </TooltipContent>
    </Tooltip>
  );
};

export const KlassesGroup: React.FC<{
  klasses: ClientKlassDetails[];
  selection: KlassSelection;
}> = ({ klasses, selection }) => {
  const relevantKlasses = selection.available
    .map((klass) => {
      const match = klasses.find(
        (k) => k.id === klass.id && k.version === klass.version
      );
      const isOlderVersion = !!klasses.find(
        (k) => k.id === klass.id && k.version > klass.version
      );

      if (!match) return null;

      return {
        ...match,
        isSuppressed: selection.supressed.includes(match.id),
        isLatestVersion: !isOlderVersion,
      };
    })
    .filter(notEmpty);

  return (
    <div className="flex flex-col items-center gap-2 gap-y-3">
      <div className="w-full text-muted-foreground">
        Supported classes ({relevantKlasses.length})
      </div>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {relevantKlasses.map((klass) => (
          <KlassBadge {...klass} key={klass.id} />
        ))}
        {relevantKlasses.length === 0 && (
          <div className="text-foreground/50">None selected</div>
        )}
      </div>
    </div>
  );
};

const FTPredictorView: React.FC<{
  predictor: TraditionalPredictorOverride;
  klasses: ClientKlassDetails[];
}> = ({ predictor, klasses }) => {
  return (
    <div className="border-1 flex flex-col gap-y-1">
      <NodeTitle title="Fine tuned Predictor" />
      <div className="flex flex-col gap-y-1 pl-7 text-sm">
        <div className="flex justify-between gap-1">
          {predictor.options.endpoint}
          <div className="flex items-center gap-1">
            <Checkbox
              checked={predictor.options.failureMode === "IGNORE"}
              disabled={true}
            />
            Silent Failures
          </div>
        </div>
      </div>
      <KlassesGroup klasses={klasses} selection={predictor.klasses} />
    </div>
  );
};

const LLMPredictorView: React.FC<{
  predictor: LlmPredictorOverride;
  klasses: ClientKlassDetails[];
}> = ({ predictor, klasses }) => {
  return (
    <div className="flex flex-col gap-y-5">
      <div className="flex flex-row items-center gap-x-2">
        <SparklesIcon className="h-6 w-6 text-foreground" />
        <NodeTitle title="LLM Predictor" />
      </div>
      <div className="flex flex-col gap-y-4 text-sm">
        <div className="flex justify-between gap-1">
          <div className="text-muted-foreground">
            {predictor.options.llmConfig.modelName}
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
            <Checkbox
              checked={predictor.options.failureMode === "IGNORE"}
              disabled={true}
            />
            Ignore failures
            <QuestionMarkCircleIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="pointer-events-none w-full whitespace-pre-wrap rounded-md bg-muted/60 p-2">
          This is{" "}
          {predictor.options.objective &&
            predictor.options.objective.length > 0 &&
            (["a", "e", "i", "o", "u"].includes(
              predictor.options.objective[0] as string
            )
              ? "an "
              : "a ")}
          <span className="whitespace-pre-wrap font-semibold underline">
            {predictor.options.objective}
          </span>{" "}
          classifier for{" "}
          <span className="whitespace-nowrap font-semibold underline">
            {predictor.options.inputDescription}
          </span>
          .
        </div>
        <KlassesGroup klasses={klasses} selection={predictor.klasses} />
      </div>
    </div>
  );
};

const PipelineView: React.FC<{
  normalizer: NormalizerOverride | null;
  ftPredictor: TraditionalPredictorOverride | null;
  llmPredictor: LlmPredictorOverride | null;
  klasses: ClientKlassDetails[];
}> = ({ normalizer, ftPredictor, llmPredictor, klasses }) => {
  if (!normalizer && !ftPredictor && !llmPredictor) {
    return (
      <div className="flex w-96 max-w-sm flex-col items-center gap-y-1">
        <div className="w-full rounded-md border border-blue-100 px-4 py-2">
          <p>Pipeline has no execution block</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-96 max-w-sm flex-col items-center gap-y-1">
      {normalizer && (
        <div className="w-full rounded-md border px-4 py-2">
          <NormalizerView normalizer={normalizer} />
        </div>
      )}
      {normalizer && (ftPredictor || llmPredictor) && (
        <ArrowLongDownIcon className="h-8 w-8 text-muted-foreground" />
      )}
      {ftPredictor && (
        <div className="w-full rounded-md border px-4 py-2">
          <FTPredictorView predictor={ftPredictor} klasses={klasses} />
        </div>
      )}
      {ftPredictor && llmPredictor && (
        <ArrowLongDownIcon className="h-8 w-8 text-muted-foreground" />
      )}
      {llmPredictor && (
        <div className="w-full rounded-md border px-4 py-2">
          <LLMPredictorView predictor={llmPredictor} klasses={klasses} />
        </div>
      )}
    </div>
  );
};
export default PipelineView;
