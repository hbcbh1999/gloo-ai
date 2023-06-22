"use client";

import type { ConfigurationOverride } from "@gloo/client-internal";
import { useState } from "react";
import { atom, atomFamily, useRecoilCallback, useRecoilValue } from "recoil";
import type { InternalPredictResponse } from "@gloo/client-internal/src/fern/api/resources/v1";

import type { ClientKlassDetails } from "../atoms";
import {
  LocalKlassVersion,
  classifierAtom,
  orgIdAtom,
  pipelineViewAtom,
} from "../atoms";

import { notEmpty } from "@/app/_utils/utils";
import { generateLLMTestCase } from "@/app/actions/classifiers";

export const testCaseAtom = atomFamily<
  { id: string; text: string; enabled: boolean } | null,
  string
>({
  key: "testCaseAtom",
  default: null,
});

export const pipelineStatusAtom = atom<"idle" | "running">({
  key: "pipelineStatusAtom",
  default: "idle",
});

export const testCaseIdsAtom = atom<string[]>({
  key: "testCaseIdsAtom",
  default: [],
});

export const currentRunAtom = atom<number>({
  key: "currentRunAtom",
  default: -1,
});

export type TestCaseOutput =
  | {
    status: "queued" | "running" | "canceled";
  }
  | {
    status: "success";
    output: InternalPredictResponse;
    selected: ClientKlassDetails[];
    hallucinations: string[];
    latency: number;
  }
  | {
    status: "error";
    error: string;
  };

export const testCaseOutputAtom = atomFamily<
  TestCaseOutput | null,
  { id: string; runId: number }
>({
  key: "testCaseOutputAtom",
  default: null,
});

export const useTestCases = () => {
  const runTestCases = useRecoilCallback(
    ({ snapshot, set }) =>
      async (llmTarget: string) => {
        const classifierId = (await snapshot.getPromise(classifierAtom))?.id;
        if (!classifierId) {
          return;
        }

        const status = await snapshot.getPromise(pipelineStatusAtom);
        if (status === "running") {
          return;
        }
        set(pipelineStatusAtom, "running");
        const previousRun = await snapshot.getPromise(currentRunAtom);
        const { normalizer, ftPredictor, llmPredictor, klasses } =
          await snapshot.getPromise(pipelineViewAtom);
        const pipeline: ConfigurationOverride = {
          normalizer: normalizer
            ? {
              type: "override",
              ...normalizer,
            }
            : undefined,
          traditionalPredictor: ftPredictor
            ? {
              type: "override",
              ...ftPredictor,
            }
            : undefined,
          llmPredictor: llmPredictor
            ? {
              type: "override",
              ...llmPredictor,
            }
            : undefined,
          klasses,
        };
        const testCaseIds = await snapshot.getPromise(testCaseIdsAtom);
        const newRunId = previousRun + 1;
        const testCases = (
          await Promise.all(
            testCaseIds.map(async (id) => {
              const testCase = await snapshot.getPromise(testCaseAtom(id));
              if (!testCase) {
                return null;
              }
              if (!testCase.enabled || !testCase.text) {
                return null;
              }
              return testCase;
            })
          )
        ).filter(notEmpty);

        testCases.forEach((testCase) => {
          // Initialize every test case.
          set(testCaseOutputAtom({ id: testCase.id, runId: newRunId }), {
            status: "queued",
          });
        });
        set(currentRunAtom, newRunId);

        // Now run the test cases.
        const orgId = await snapshot.getPromise(orgIdAtom);
        const runTestCase = async (testCase: (typeof testCases)[number]) => {
          set(testCaseOutputAtom({ id: testCase.id, runId: newRunId }), {
            status: "running",
          });
          const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/pipeline`;
          try {
            const res = await fetch(url, {
              method: "POST",
              body: JSON.stringify({
                orgId,
                classifierId,
                input: testCase.text,
                config: pipeline,
                llmTarget,
              }),
            });
            console.log("API RESPONSE", res);
            if (res.status !== 200) {
              throw new Error(`Status ${res.status}: ${await res.text()}`);
            }
            const response = (await res.json()) as InternalPredictResponse;

            // Given the pipeline find the matching klasses.
            const selected: ClientKlassDetails[] = response.predictorDetails
              .flatMap((predictor) => {
                return predictor.classes
                  .filter((k) => k.selected)
                  .map((klass): ClientKlassDetails => {
                    return {
                      description: klass.klassDescription,
                      name: klass.klassName,
                      id: klass.klassId,
                      version: klass.klassVersion,
                      isLocal: klass.klassVersion === LocalKlassVersion,
                    };
                  });
              })
              .sort((a, b) => {
                if (a.id === b.id) {
                  if (a.version === LocalKlassVersion) {
                    return -1;
                  }
                  if (b.version === LocalKlassVersion) {
                    return 1;
                  }
                  return b.version - a.version;
                }
                return a.id.localeCompare(b.id);
              })
              .filter((klass, index, array) => {
                if (index === 0) {
                  return true;
                }
                return array.findIndex((k) => k.id === klass.id) === index;
              });
            const hallucinations = response.predictorDetails.flatMap(
              (predictor) => {
                if (predictor.type === "llm") {
                  return predictor.hallucinations;
                }
                return [];
              }
            );

            set(testCaseOutputAtom({ id: testCase.id, runId: newRunId }), {
              status: "success",
              output: response,
              selected,
              hallucinations,
              latency: response.latencyMs,
            });
          } catch (e) {
            console.log("test1", e);
            if (e instanceof Error) {
              console.log("test", e.message);
              set(testCaseOutputAtom({ id: testCase.id, runId: newRunId }), {
                status: "error",
                error: e.message,
              });
            } else {
              console.log("test2", e);
              set(testCaseOutputAtom({ id: testCase.id, runId: newRunId }), {
                status: "error",
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                error: `Unknown Error: ${JSON.stringify(e)}`,
              });
            }
          }
        };

        // Create groups of batchSize test cases to run in parallel.
        const batchSize = 3;
        for (let i = 0; i < testCases.length; i += batchSize) {
          await Promise.all(testCases.slice(i, i + batchSize).map(runTestCase));
        }
        set(pipelineStatusAtom, "idle");
      }
  );

  const addTestCase = useRecoilCallback(({ set }) => (inputText?: string) => {
    const id = "local_input_" + Math.random().toString(36).substr(2, 9);
    set(testCaseAtom(id), { id, text: inputText ?? "", enabled: true });
    set(testCaseIdsAtom, (ids) => [...ids, id]);
  });

  const removeTestCase = useRecoilCallback(
    ({ reset, set, snapshot }) =>
      async (id: string) => {
        const runId = await snapshot.getPromise(currentRunAtom);
        for (let i = 0; i <= runId; i++) {
          reset(testCaseOutputAtom({ id, runId: i }));
        }
        set(testCaseAtom(id), null);
        set(testCaseIdsAtom, (ids) => ids.filter((i) => i !== id));
      }
  );

  const updateTestCase = useRecoilCallback(
    ({ set }) =>
      (id: string, update: { text: string } | { enabled: boolean }) => {
        set(testCaseAtom(id), (prev) => {
          if (!prev) {
            return null;
          }
          return {
            ...prev,
            ...update,
          };
        });
      }
  );

  return {
    addTestCase,
    removeTestCase,
    updateTestCase,
    runTestCases,
  };
};

export const useGenerateText = () => {
  const { addTestCase } = useTestCases();

  const [isPending, setPending] = useState(false);
  const orgId = useRecoilValue(orgIdAtom);
  const [error, setError] = useState<string | null>(null);
  const generateTestCase = useRecoilCallback(
    ({ snapshot }) =>
      async (selectedTarget: string) => {
        const { klasses, llmPredictor } = await snapshot.getPromise(
          pipelineViewAtom
        );
        setError(null);

        if (klasses.length === 0) {
          setError("Define classes first to autogenerate cases");
          return;
        }

        if (
          !llmPredictor ||
          llmPredictor.options.objective.length === 0 ||
          llmPredictor.options.inputDescription.length === 0
        ) {
          setError(
            "Describe the goal of the llm predictor first to autogenerate cases"
          );
          return;
        }

        const randomClass = klasses[Math.floor(Math.random() * klasses.length)];
        if (!randomClass) {
          setError("No classes defined");
          return;
        }

        const prompt = `Generate ONE sample text for a classifier model with the given goal, that matches the given class and description. The generated text should be as realistic as possible, but not too obvious. The classifier model should be able to learn from the generated text.

        ###
        GOAL STATEMENT:
        \`\`\`
        This is ${["a", "e", "i", "o", "u"].includes(llmPredictor.options.objective[0]!)
            ? "an"
            : "a"
          } ${llmPredictor.options.objective} classifier for ${llmPredictor.options.inputDescription
          }.
        \`\`\`
        
        CLASS: \`${randomClass.name}\`
        DESCRIPTION: \`${randomClass.description}\`.

        Use the following format:
        1. Use first person, unless the classifier is for a different kind of text input.
        2. Be creative. Generate a persona for the text that is being written. You can add some invented backstory if the classifier is for customer data.
        3. Only output the actual sample text. Do not add any other text like these instructions.
        4. Only list 1 sample text
        `;
        setPending(true);
        try {
          const r = await generateLLMTestCase(selectedTarget, orgId, prompt);
          const inputText = r.samples[0] ?? "";
          addTestCase(inputText);
        } finally {
          setPending(false);
        }
      },
    [addTestCase, orgId, setError]
  );

  return {
    generateTestCase,
    isPending,
    error,
  };
};
