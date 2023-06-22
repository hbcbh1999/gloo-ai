import { Plus } from "lucide-react";
import { useRecoilValue } from "recoil";

import TestCase from "./TestCase";
import { testCaseIdsAtom, useTestCases } from "./atoms";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const AddTestCaseButton = () => {
  const { addTestCase } = useTestCases();
  return (
    <TableRow>
      <TableCell colSpan={4} align="center">
        <Button
          variant="outline"
          className="h-fit p-2"
          onClick={() => {
            addTestCase();
          }}
        >
          <Plus className="h-4 w-4 pr-1" /> Add Test
        </Button>
      </TableCell>
    </TableRow>
  );
};

const TestCaseTable = () => {
  const testCases = useRecoilValue(testCaseIdsAtom);

  return (
    <Table>
      <TableBody>
        <AddTestCaseButton />
        {testCases.map((testCaseId) => (
          <TestCase key={testCaseId} inputId={testCaseId} />
        ))}

        {testCases.length > 2 && <AddTestCaseButton />}
      </TableBody>
    </Table>
  );
};

export { TestCaseTable };
