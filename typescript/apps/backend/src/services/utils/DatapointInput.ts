export type ThreadDatapointInput = {
  enableLowLatency?: boolean;
  languageHint?: string;
  topic?: string;
  summary?: string;
  // Most recent message is last
  messages: {
    type: "USER" | "AGENT";
    text: string;
  }[];
};

export enum ClassifyInputType {
  THREAD = "THREAD",
  TEXT = "TEXT",
}

export type DatapointInput =
  | {
      type: ClassifyInputType.THREAD;
      version: 1;
      value: ThreadDatapointInput;
    }
  | {
      type: ClassifyInputType.TEXT;
      version: 1;
      value: {
        enableLowLatency?: boolean;
        languageHint?: string;
        text: string;
      };
    };

// Data that was generated while making this prediction
export type IntermediateOutputs =
  | {
      inputType: ClassifyInputType.THREAD;
      version: 1;
      llmRephrase?: string;
    }
  | {
      inputType: ClassifyInputType.TEXT;
      version: 1;
      llmRephrase?: string;
    };
