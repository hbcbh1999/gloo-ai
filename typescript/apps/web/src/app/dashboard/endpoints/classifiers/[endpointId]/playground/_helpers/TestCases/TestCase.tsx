import { XCircle } from "lucide-react";
import { useRecoilValue } from "recoil";

import { testCaseAtom, useTestCases } from "./atoms";
import { TestCaseOutcome } from "./TestCaseOutcome";

import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TestCase: React.FC<{ inputId: string }> = ({ inputId }) => {
  const { removeTestCase, updateTestCase } = useTestCases();
  const input = useRecoilValue(testCaseAtom(inputId));

  if (!input) {
    return null;
  }

  return (
    <TableRow>
      <TableCell className="w-8">
        <div className="flex flex-col-reverse items-center gap-2">
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <Button
                variant="ghost"
                className="p-2"
                onClick={() => removeTestCase(inputId)}
              >
                <XCircle className="h-5 w-5 text-destructive/50" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <Checkbox
                disabled={!input.text}
                checked={input.enabled && !!input.text}
                onClick={() => {
                  updateTestCase(inputId, { enabled: !input.enabled });
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {input.enabled ? "Enabled" : "Disabled"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
      <TableCell className="pl-0">
        <Textarea
          disabled={!input.enabled}
          className="min-w-[150px]"
          value={input.text}
          onChange={(e) => {
            updateTestCase(inputId, { text: e.target.value });
          }}
        />
      </TableCell>
      <TestCaseOutcome inputId={inputId} />
    </TableRow>
  );
};

export default TestCase;
