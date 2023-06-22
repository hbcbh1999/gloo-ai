import { Clock9 } from "lucide-react";
import { useMemo } from "react";
import clsx from "clsx";
import type {
  LlmPredictorDetails,
  PredictorDetails,
} from "@gloo/client-internal/src/fern/api/resources/v1";

import { KlassBadge } from "../../../_components/PipelineView";
import { TokensUsed } from "../../_components/TokensUsed";

import type { TestCaseOutput } from "./atoms";

import { VersionString } from "@/app/_utils/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTextBlock } from "@/components/ui/custom/detail-text-block";

export const SectionTitle: React.FC<{
  title: string;
  latencyMs?: number;
  tokens?: number;
}> = ({ title, latencyMs, tokens }) => {
  return (
    <div className="flex w-full flex-row items-start gap-x-2 justify-between pb-3">
      <div className="flex flex-col">
        <div className="text-base font-semibold">{title}</div>
      </div>
      <div className="flex flex-row items-center h-full gap-x-3 text-sm text-muted-foreground/75 pt-1">
        {tokens !== undefined && <TokensUsed tokens={tokens} />}
        {latencyMs !== undefined && (
          <div className="flex flex-row items-center gap-x-1">
            <Clock9 strokeWidth={1} className="h-4 w-4" /> {latencyMs}ms
          </div>
        )}
      </div>
    </div>
  );
};

const TestCasePredictorBase: React.FC<PredictorDetails> = ({
  classes,
  latencyMs,
  status,
}) => {
  const { selected, other } = useMemo(() => {
    const { selected, other } = classes.reduce<{
      selected: typeof classes;
      other: typeof classes;
    }>(
      (acc, c) => {
        if (c.selected) {
          acc.selected.push(c);
        } else {
          acc.other.push(c);
        }
        return acc;
      },
      { selected: [], other: [] }
    );
    return {
      selected: selected.sort((a, b) => b.confidence - a.confidence),
      other: other.sort((a, b) => b.confidence - a.confidence),
    };
  }, [classes]);

  if (status !== "PASS") {
    return (
      <Card className="flex w-full flex-col gap-1 p-4">
        <SectionTitle title="Finetuned Predictor" latencyMs={latencyMs} />
        <div className="flex flex-row flex-wrap gap-2">
          {status === "FAIL" && (
            <Badge variant="destructive-outline">FAILED</Badge>
          )}
          {status === "FAIL_PARENT" && (
            <>
              <Badge variant="destructive-outline">NOT RUN</Badge>
              <span>A step prior to this failed</span>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex w-full flex-col gap-1 p-4">
      <SectionTitle title="Finetuned Predictor" latencyMs={latencyMs} />
      <div className="flex flex-row flex-wrap gap-2">
        {selected.map((c) => (
          <span
            key={c.klassId}
            className="flex flex-row items-center gap-1 text-xs"
          >
            {c.confidence.toFixed(3)}
            <KlassBadge
              description={c.klassDescription ?? "u"}
              id={c.klassId}
              isLatestVersion
              name={c.klassName ?? "i"}
              version={c.klassVersion}
              key={c.klassId}
            />
          </span>
        ))}
        {selected.length === 0 && (
          <div className="pb-2 text-xs text-foreground/50">
            No classes were selected.
          </div>
        )}
      </div>
      {other.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="py-1 text-xs font-light">
              Unselected Classes ({other.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {other.map((c) => (
                  <span
                    key={c.klassId}
                    className="flex flex-row items-center gap-1 text-xs"
                  >
                    {c.confidence.toFixed(3)}
                    <KlassBadge
                      description={c.klassDescription}
                      id={c.klassId}
                      isLatestVersion
                      name={c.klassName}
                      version={c.klassVersion}
                      suppressed={c.confidence >= 0.5}
                    />
                  </span>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Card>
  );
};

const TestCasePredictorLLM: React.FC<LlmPredictorDetails> = ({
  classes,
  reasoning,
  latencyMs,
  tokensUsed,
  hallucinations,
  status,
}) => {
  const { selected, other } = classes.reduce<{
    selected: typeof classes;
    other: typeof classes;
  }>(
    (acc, c) => {
      if (c.selected) {
        acc.selected.push(c);
      } else {
        acc.other.push(c);
      }
      return acc;
    },
    { selected: [], other: [] }
  );
  if (status !== "PASS") {
    return (
      <Card className="flex w-full flex-col gap-1 p-4">
        <SectionTitle
          title="LLM Predictor"
          latencyMs={status === "FAIL" ? latencyMs : undefined}
          tokens={status === "FAIL" ? tokensUsed : undefined}
        />
        <div className="flex flex-row flex-wrap gap-2">
          {status === "FAIL" && (
            <Badge variant="destructive-outline">FAILED</Badge>
          )}
          {status === "FAIL_PARENT" && (
            <>
              <Badge variant="destructive-outline">NOT RUN</Badge>
              <span>A step prior to this failed</span>
            </>
          )}
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex w-full flex-col gap-1 p-4">
      <SectionTitle
        title="LLM Predictor"
        latencyMs={latencyMs}
        tokens={tokensUsed}
      />
      <div className="flex flex-row flex-wrap gap-2">
        {selected.map((c) => (
          <KlassBadge
            description={c.klassDescription}
            id={c.klassId}
            isLatestVersion
            name={c.klassName}
            version={c.klassVersion}
            key={c.klassId}
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
        {(selected.length + hallucinations?.length ?? 0) === 0 && (
          <div className="pb-2 text-xs text-foreground/50">
            No classes were selected.
          </div>
        )}
      </div>
      {other.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="py-1 text-xs font-light">
              Unselected Classes ({other.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-row flex-wrap gap-2">
                {other.map((c) => (
                  <KlassBadge
                    description={c.klassDescription ?? "u"}
                    id={c.klassId}
                    isLatestVersion
                    name={c.klassName ?? "i"}
                    version={c.klassVersion}
                    key={c.klassId}
                    suppressed={c.confidence >= 0.5}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <DetailTextBlock title="LLM Reason" text={reasoning} />
    </Card>
  );
};

const TestCaseDialog: React.FC<{
  output: TestCaseOutput & { status: "success" };
  inputText: string;
  title?: string;
  configId?: string;
  configVersionId?: number;
}> = ({ output, inputText, title, configId, configVersionId }) => {
  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div className="flex flex-col items-center space-y-1">
        {configId && (
          <div className="flex flex-row gap-1 text-xs text-foreground/40">
            {configId?.split("_")[2]}{" "}
            <VersionString version={configVersionId ?? -2} />
          </div>
        )}
        <div className="text-lg font-medium">
          {title ?? "Test Case - Details"}
        </div>
        <div className="flex flex-row items-center gap-x-2">
          {"output" in output ? (
            <Badge
              variant={"outline"}
              className={clsx([
                output.output.status === "PASS"
                  ? "text-green-600 border-green-600"
                  : "text-red-600 border-red-600",
              ])}
            >
              {output.output.status}
            </Badge>
          ) : (
            <Badge
              variant={"outline"}
              className={clsx(["text-red-600 border-red-600"])}
            >
              FAIL
            </Badge>
          )}
          <Clock9 strokeWidth={1} className="h-4 w-4" /> {output.latency}ms
        </div>
      </div>

      <div className="w-full rounded-md bg-muted/40 p-2 text-xs text-foreground max-h-40 overflow-y-auto break-words whitespace-pre-wrap">
        {inputText}
      </div>
      {output.output.normalizer && (
        <Card className="w-full p-4">
          {/* <Separator orientation="horizontal" /> */}
          <div className="flex w-full flex-col">
            <SectionTitle
              title="Normalizer"
              latencyMs={output.output.normalizer.latencyMs}
              tokens={
                output.output.normalizer.status === "PASS"
                  ? output.output.normalizer.tokensUsed
                  : undefined
              }
            />
            {output.output.normalizer.status === "FAIL" ? (
              <div className="flex flex-row flex-wrap gap-2">
                <Badge variant="destructive-outline">FAILED</Badge>
              </div>
            ) : (
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                {output.output.normalizer.text}
              </div>
            )}
          </div>
        </Card>
      )}
      {output.output.predictorDetails.map((p) => {
        if (p.type === "llm")
          return <TestCasePredictorLLM {...p} key={p.predictorId} />;
        else if (p.type === "base") {
          return <TestCasePredictorBase {...p} key={p.predictorId} />;
        }
        return null;
      })}
    </div>
  );
};

export { TestCaseDialog };
