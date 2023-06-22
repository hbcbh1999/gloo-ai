import { useOrganization } from "@clerk/nextjs";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { FlaskConical, X } from "lucide-react";
import { useParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import { atom, useRecoilState, useRecoilValue } from "recoil";
import { z } from "zod";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import clsx from "clsx";

import type { LLMTargets } from "../types";

import { testCaseIdsAtom, useGenerateText, useTestCases } from "./atoms";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TestCaseHeader: React.FC<{ llmTargets: LLMTargets }> = ({
  llmTargets,
}) => {
  const orgId = useOrganization().organization?.id;
  const testCases = useRecoilValue(testCaseIdsAtom);
  const { runTestCases } = useTestCases();
  const { isPending, generateTestCase, error } = useGenerateText();
  const [isTestSuiteDialogOpen, setIsTestSuiteDialogOpen] = useState(false);

  const [selectedTarget, setSelectedTarget] = useState<LLMTargets[0]>(
    llmTargets.at(0)!
  );

  if (!orgId) {
    throw new Error("Org id not present");
  }

  return (
    <div className="flex flex-col gap-y-2 pr-2">
      <div className="flex flex-row gap-x-8 items-center">
        <div className="text-lg font-semibold text-foreground">Test cases</div>
        <Dialog
          open={isTestSuiteDialogOpen}
          onOpenChange={setIsTestSuiteDialogOpen}
        >
          <DialogTrigger>
            <Button variant={"outline"}>Load Test Suite</Button>
          </DialogTrigger>
          <DialogContent>
            <TestSuiteLoader setOpen={setIsTestSuiteDialogOpen} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-row justify-between gap-x-2 items-center">
        <div className="flex flex-col gap-1 items-start text-xs">
          <span className="text-muted-foreground/60">LLM API Config</span>
          <Select
            onValueChange={(value) =>
              setSelectedTarget(
                (prev) => llmTargets.find((v) => v.name === value) ?? prev
              )
            }
            value={selectedTarget.name}
          >
            <SelectTrigger className="w-fit text-muted-foreground/90">
              <SelectValue>
                {selectedTarget.name === "GLOO_DEFAULT_LLM"
                  ? "FreeTrial API Key"
                  : selectedTarget.name}{" "}
                ({selectedTarget.provider})
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {llmTargets.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name} ({t.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-y-1">
          <div className="relative">
            <div className="absolute -top-10 w-[250px]">
              {error && <span className="text-xs text-red-500">{error}</span>}
            </div>
            <Button
              className="flex flex-row gap-1 bg-indigo-600 disabled:bg-gray-400 gap-x-2 hover:bg-indigo-500"
              disabled={isPending}
              onClick={async () => {
                await generateTestCase(selectedTarget.name);
              }}
            >
              {isPending ? (
                <ClipLoader size={16} color={"white"} className="mr-1" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              Generate Tests
            </Button>
          </div>
          <Button
            className="flex flex-row gap-1"
            disabled={testCases.length === 0}
            onClick={() => runTestCases(selectedTarget.name)}
          >
            <FlaskConical className="h-4 w-4" /> Run Pipeline
          </Button>{" "}
        </div>
      </div>
    </div>
  );
};

interface TestSuites {
  [key: string]: { input: string }[];
}

const testSuitesSchema = z.record(
  z.array(
    z.object({
      input: z.string(),
    })
  )
);

const testSuitesAtom = atom<TestSuites>({
  key: "testSuites",
  default: {},
});

const selectedSuiteAtom = atom<string | null>({
  key: "selectedSuite",
  default: null,
});

const TestSuiteLoader = ({ setOpen }: { setOpen: (open: boolean) => void }) => {
  const endpointId = useParams().endpointId ?? "unknown";

  const [testSuites, setTestSuites] = useRecoilState(testSuitesAtom);
  const [selectedSuite, setSelectedSuite] = useRecoilState(selectedSuiteAtom);
  const [error, setError] = useState<string | null>(null);
  const keyPrefix = `test_${endpointId}_`;
  const { addTestCase } = useTestCases();

  useEffect(() => {
    if (!endpointId) {
      throw new Error("Endpoint id not present");
    }
    const savedSuites = Object.keys(localStorage).reduce<TestSuites>(
      (testCaseFileMap, key) => {
        if (key.startsWith(keyPrefix)) {
          const name = key.split("_")[3]; // test_ep_uuid_name
          console.log("name", name, key);
          if (!name) {
            return testCaseFileMap;
          }
          const value = localStorage.getItem(key);
          if (!value) {
            return testCaseFileMap;
          }
          try {
            const cases = testSuitesSchema.element.safeParse(JSON.parse(value));
            if (cases.success) {
              console.log("cases", cases.data);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              testCaseFileMap[name] = cases.data;
            } else {
              console.error(`Error parsing test suite ${name}: `, cases.error);
            }
          } catch (error) {
            console.error(`Error parsing JSON for test suite ${name}: `, error);
          }
        }
        return testCaseFileMap;
      },
      {}
    );
    setTestSuites(savedSuites);
  }, [setTestSuites, endpointId]);

  // useEffect(() => {
  //   Object.keys(testSuites).forEach((name) => {
  //     const key = `${keyPrefix}${name}`;
  //     localStorage.setItem(key, JSON.stringify(testSuites[name]));
  //   });
  // }, [testSuites, endpointId]);

  const loadSuite = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        console.log(text);
        const parsedData = JSON.parse(text) as TestSuites;
        const data = testSuitesSchema.element.parse(parsedData);
        if (data.length > 10000)
          throw new Error("Test suite is too large (max 10k words)");
        const displayName = file.name.replace(/\s+/g, "-");
        const localStorageKey = `test_${endpointId}_${displayName}`;
        console.log("saving test suite with name", localStorageKey);
        setTestSuites({ ...testSuites, [displayName]: data });
        setSelectedSuite(displayName);
        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (e) {
        alert(e);
      }
    };
    reader.readAsText(file);
  };

  const selectSuite = (name: string) => {
    setSelectedSuite(name);
  };

  const _validateName = (inputName: string) => {
    const isValid = /^[^\s]+$/.test(inputName); // valid if it does not contain spaces
    // setName(inputName);
    setError(!isValid ? "Name cannot contain spaces" : null);
  };

  if (!endpointId) {
    throw new Error("Endpoint id not present");
  }

  return (
    <>
      <DialogHeader className="font-semibold">Load Test Suite</DialogHeader>
      <div className="font-light">
        The filename should be in JSON, with an array that contains the input to
        test like below:
      </div>
      <code className="text-xs p-2 bg-muted">
        {JSON.stringify(
          [
            {
              input: "this is test case 1",
            },
            {
              input: "this is test case 2",
            },
          ],
          null,
          2
        )}
      </code>
      <div className="font-light text-sm text-muted-foreground/80">
        {JSON.stringify(testSuitesSchema._type, null, 2)}
      </div>
      <div className="flex flex-col gap-y-6">
        <Input
          type="file"
          id="fileInput"
          className="hover:bg-muted/40 hover:cursor-pointer"
          accept=".json"
          onChange={loadSuite}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="font-light">Select a test suite</div>
        {Object.keys(testSuites).length === 0 && (
          <div className="font-light text-sm text-muted-foreground/80">
            No test suites loaded
          </div>
        )}
        {Object.keys(testSuites).map((name) => (
          <div className="flex flex-row items-center" key={name}>
            <Button
              className={clsx([selectedSuite === name && "bg-primary/10"])}
              variant={"ghost"}
              key={name}
              onClick={() => selectSuite(name)}
            >
              {name}
            </Button>
            <Button
              className="w-fit"
              variant={"ghost"}
              onClick={() => {
                const newSuites = { ...testSuites };
                delete newSuites[name];
                setTestSuites(newSuites);
                localStorage.removeItem(`${keyPrefix}${name}`);
              }}
            >
              <X className="h-6 w-6 text-destructive" />
            </Button>
          </div>
        ))}
        {selectedSuite !== null && (
          <div className="flex h-[150px] overflow-hidden bg-muted/20 rounded-md border-border border">
            <ScrollArea
              type="always"
              className="whitespace-pre-wrap overflow-y-auto w-full"
            >
              {testSuites[selectedSuite ?? ""] && (
                <>{JSON.stringify(testSuites[selectedSuite ?? ""], null, 2)}</>
              )}
            </ScrollArea>
          </div>
        )}

        <div className="w-full flex items-center justify-center">
          <Button
            disabled={selectedSuite === null}
            className="w-fit"
            onClick={() => {
              if (!selectedSuite) return;
              const cases = testSuites[selectedSuite];
              if (!cases) return;
              cases.forEach((testCase) => {
                addTestCase(testCase.input);
              });
              setSelectedSuite(null);
              setOpen(false);
            }}
          >
            Load selected
          </Button>
        </div>
      </div>
    </>
  );
};

export { TestCaseHeader };
