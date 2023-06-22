import { Clock8, Expand } from "lucide-react";
import { useRecoilValue } from "recoil";

import { KlassBadge } from "../../../_components/PipelineView";

import { currentRunAtom, testCaseAtom, testCaseOutputAtom } from "./atoms";
import { TestCaseDialog } from "./TestCaseDialog";

import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const TestCaseOutcome: React.FC<{ inputId: string }> = ({ inputId }) => {
  const runId = useRecoilValue(currentRunAtom);
  const outcome = useRecoilValue(testCaseOutputAtom({ id: inputId, runId }));
  const input = useRecoilValue(testCaseAtom(inputId));

  if (!outcome || !input) {
    return (
      <>
        <TableCell></TableCell>
        <TableCell></TableCell>
      </>
    );
  }

  if (
    outcome.status === "running" ||
    outcome.status === "queued" ||
    outcome.status === "canceled"
  ) {
    return (
      <>
        <TableCell></TableCell>
        <TableCell className="w-36 align-top">
          <div className="flex items-end">
            <Badge variant="default">{outcome.status}</Badge>
          </div>
        </TableCell>
      </>
    );
  }

  if (outcome.status === "error") {
    return (
      <>
        <TableCell></TableCell>
        <TableCell className="w-36 align-top">
          <div className="flex flex-col items-end">
            <Badge variant="destructive">Failed</Badge>
            {outcome.error}
          </div>
        </TableCell>
      </>
    );
  }

  if (outcome.status === "success") {
    return (
      <>
        <TableCell className="flex flex-col items-start gap-1">
          {outcome.selected.map((klass) => {
            return (
              <KlassBadge
                key={klass.id}
                name={klass.name}
                description={klass.description}
                id={klass.id}
                version={klass.version}
                isLatestVersion={false}
              />
            );
          })}
          {outcome.hallucinations.map((klass, idx) => {
            return (
              <KlassBadge
                key={`hallucination-${idx}`}
                name={klass}
                description={""}
                id={"hallucination"}
                version={-3}
                isLatestVersion={false}
                hallucinated
              />
            );
          })}
        </TableCell>
        <TableCell className="w-36 align-top">
          <div className="flex flex-col items-end gap-2 text-foreground/50">
            <div className="flex flex-row gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <TestCaseDialog output={outcome} inputText={input.text} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-row items-center gap-1 px-2">
              <Clock8 className="h-4 w-4" /> {outcome.latency}ms
            </div>
          </div>
        </TableCell>
      </>
    );
  }

  return null;
};

export { TestCaseOutcome };
