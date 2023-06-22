"use client";

import { RecoilRoot } from "recoil";
import { ArrowLongDownIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { Allotment } from "allotment";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FFContextProvider } from "@harnessio/ff-react-client-sdk";
import { useOrganization } from "@clerk/nextjs";

import ConfigTopBar from "./ConfigTopBar";
import StepContainer from "./StepContainer";
import type { Classifier, LLMTargets } from "./types";
import NormalizerEditor from "./NormalizerEditor";
import LLMPredictorEditor from "./LLMPredictorEditor";
import KlassEditor from "./LLMKlassEditor";
import { setFromClassifier } from "./atoms";
import { TestCaseTable } from "./TestCases/TestCaseTable";
import { TestCaseHeader } from "./TestCases/TestCaseHeader";
import FTPredictorEditor from "./FTPredictorEditor";

import { ScrollArea } from "@/components/ui/scroll-area";

const queryClient = new QueryClient();

const ConfigPlayground: React.FC<{
  classifier: Classifier;
  llmTargets: LLMTargets;
}> = ({ classifier, llmTargets }) => {
  const searchParams = useSearchParams();
  const org = useOrganization().organization;

  if (!org) {
    return <div>Org not present</div>;
  }

  if (!org.slug) {
    return <div>Org slug not present</div>;
  }

  return (
    <FFContextProvider
      apiKey="bad2adf3-a220-4434-83bb-5ee0df443ddd"
      target={{ name: org.slug, identifier: org.id }}
      async
    >
      <QueryClientProvider client={queryClient}>
        <RecoilRoot
          initializeState={({ set }) => {
            setFromClassifier(set, classifier, searchParams, org.id);
          }}
        >
          <PlaygroundImpl llmTargets={llmTargets} classifier={classifier} />
        </RecoilRoot>
      </QueryClientProvider>
    </FFContextProvider>
  );
};

const PlaygroundImpl: React.FC<{
  classifier: Classifier;
  llmTargets: LLMTargets;
}> = ({ classifier, llmTargets }) => {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="sticky top-0 z-20 flex h-fit w-full border-b-[1px] border-b-primary/10 bg-background">
        <ConfigTopBar />
      </div>
      <Allotment>
        <Allotment.Pane minSize={400} className="h-full bg-muted/50 py-2 pr-2">
          <ScrollArea className="mb-20 h-[93%] w-full">
            <div className="flex flex-col items-center gap-4 p-4">
              <StepContainer title="1. Normalize Input" param="normalizer">
                <NormalizerEditor history={classifier.normalizers} />
              </StepContainer>
              <ArrowLongDownIcon className="h-8 w-8 text-muted-foreground/50" />

              <StepContainer
                title="2. Classify with Fine-Tuned Model"
                param="ft"
                settingAvailable={classifier.TrainedEndpoints.length > 0}
              >
                <FTPredictorEditor
                  endpoints={classifier.TrainedEndpoints}
                  history={classifier.ftPredictors}
                />
              </StepContainer>
              <ArrowLongDownIcon className="h-8 w-8 text-muted-foreground/50" />
              <StepContainer title="3. Classify with LLM" param="llm">
                <LLMPredictorEditor history={classifier.llmPredictors}>
                  <KlassEditor />
                </LLMPredictorEditor>
              </StepContainer>
            </div>
          </ScrollArea>
        </Allotment.Pane>
        <Allotment.Pane
          minSize={300}
          className="flex flex-col gap-y-4 px-4 pl-6 py-8"
          snap
        >
          <TestCaseHeader llmTargets={llmTargets} />
          <TestCaseTable />
          {/* <EvaluatePanel classifierId={classifier.id} /> */}
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default ConfigPlayground;
