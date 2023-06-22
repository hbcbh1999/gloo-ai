import { OpenAI, AzureOpenAIInput } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConsoleCallbackHandler } from "langchain/callbacks";
import type { Types, KlassDetails } from "@gloo/database";
import { z } from "zod";
import { HumanChatMessage } from "langchain/schema";

import { LLMOptionsInterface } from "./pipeline/types";
import { FailureMode } from "@/api/generated/api/resources/v1";

const getLLMModel = (
  globalOptions: LLMOptionsInterface,
  options: Types.LLMConfig,
  overrides?: {
    temperature?: number;
  }
) => {
  const wrapper = options.modelName === "gpt-3.5-turbo" ? ChatOpenAI : OpenAI;
  switch (globalOptions.provider) {
    case "OpenAI":
      return new wrapper({
        openAIApiKey: globalOptions.apiKey,
        modelName: options.modelName,
        temperature: overrides?.temperature ?? 0,
        maxRetries: 2,
      });
    case "Azure":
      // url should be of form: https://{InstanceName}.openai.azure.com/openai/deployments/{deployment}
      const parsedUrl = new URL(globalOptions.apiBaseUrl.replace(/\/$/, ""));
      const instanceName = parsedUrl.hostname.split(".").at(0);
      const deploymentName = parsedUrl.pathname.split("/").at(-1);
      const params: AzureOpenAIInput = {
        azureOpenAIApiKey: globalOptions.apiKey,
        azureOpenAIApiInstanceName: instanceName,
        azureOpenAIApiDeploymentName: deploymentName,
      };
      return new wrapper({
        ...params,
        modelName: options.modelName,
        temperature: overrides?.temperature ?? 0,
        maxRetries: 2,
      });
      throw new Error("Azure not implemented");
    default:
      throw new Error("Invalid llm provider");
  }
};

const safeModelApiWithParser = async <T extends z.ZodRawShape>(
  failureMode: FailureMode,
  globalOptions: LLMOptionsInterface,
  options: Types.LLMConfig,
  prompt: string,
  template: z.ZodObject<T>
) => {
  const response = await callModelAPI(
    failureMode,
    globalOptions,
    options,
    prompt
  );
  if (response === null) {
    return null;
  }

  const { text, meta } = response;
  try {
    const jsonResponse = JSON.parse("{" + text);
    const parsed = template.parse(jsonResponse);
    return { parsed, meta };
  } catch (e) {
    console.error(e);
    if (failureMode === "IGNORE") {
      return { parsed: null, meta };
    } else {
      throw new Error("Error while running classifier");
    }
  }
};

export const callModelAPI = async (
  failureMode: FailureMode,
  globalOptions: LLMOptionsInterface,
  options: Types.LLMConfig,
  prompt: string,
  overrides?: {
    temperature?: number;
  }
) => {
  const model = getLLMModel(globalOptions, options, overrides);
  try {
    const response = await (model instanceof ChatOpenAI
      ? model.generate([[new HumanChatMessage(prompt)]])
      : model.generate([prompt]));
    const strResponse = response.generations[0]![0]!.text;
    const meta =
      (response.llmOutput as
        | {
            tokenUsage: {
              completionTokens: number;
              promptTokens: number;
              totalTokens: number;
            };
          }
        | undefined) ?? null;
    return { text: strResponse, meta };
  } catch (e) {
    if (failureMode === "IGNORE") {
      return null;
    } else {
      throw new Error("Error while running classifier");
    }
  }
};

const normalizeText = async (
  globalOptions: LLMOptionsInterface,
  options: Types.NormalizerOptions,
  text: string
) => {
  const prompt = `${options.prompt}
INPUT:
\`\`\`
${text}
\`\`\`

OUTPUT:`;
  return await callModelAPI(
    options.failureMode,
    globalOptions,
    options.llmConfig,
    prompt
  );
};

const llmClassification = async (
  globalOptions: LLMOptionsInterface,
  options: Types.LLMClassifierOptions,
  candidates: KlassDetails[],
  text: string
): Promise<{
  success: boolean;
  selectedIds: string[];
  hallucinations: string[];
  clues: string;
  reasoning: string;
  meta: {
    tokenUsage: {
      completionTokens: number;
      promptTokens: number;
      totalTokens: number;
    };
  } | null;
}> => {
  const defaultResponse = {
    selectedIds: [],
    hallucinations: [],
    clues: "",
    reasoning: "",
    meta: {
      tokenUsage: {
        completionTokens: 0,
        promptTokens: 0,
        totalTokens: 0,
      },
    },
  };
  if (candidates.length === 0) {
    return { success: true, ...defaultResponse };
  }

  const { objective, inputDescription } = options;
  const candidateList = candidates
    .map((c) => `${c.name}: ${c.description}`)
    .join("\n");

  // TODO: Fetch examples based on text similarity of the input text.
  const examples = "";

  const prompt = `This is ${
    ["a", "e", "i", "o", "u"].includes(objective[0]!) ? "an" : "a"
  } ${objective} classifier for ${inputDescription}.

First, list CLUES (i.e., keywords, phrases, contextual information, semantic relations, semantic meaning, tones, references) that support the classification of INPUT.
Second, deduce the diagnostic REASONING process from premises (i.e., CLUES, INPUT) that supports the INPUT classification determination (Limit the number of words to 130).
Third, based on CLUES, REASONING and INPUT, determine the overall ${objective} of INPUT as any of the following or null. Only include the name, not the description given as "name: description".
${candidateList}
${examples}
Output should be the JSON format below. Do not add any additional text. 
{
    "CLUES": "string",
    "REASONING": "string",
    "${objective}": string[] | null
}

CLASSIFY THIS INPUT:
\`\`\`
${text}
\`\`\`

JSON: {
  `;

  // We early exit at the top if we have no candidates so force cast is safe.
  // const candidateNames =
  //   candidates.length > 1
  //     ? z.union(
  //         candidates.map((c) => z.literal(c.name)) as [
  //           z.ZodLiteral<string>,
  //           z.ZodLiteral<string>,
  //           ...z.ZodLiteral<string>[]
  //         ]
  //       )
  //     : z.literal(candidates[0].name);
  const schema = z.object({
    CLUES: z.string().optional(),
    REASONING: z.string().optional(),
    [objective]: z.array(z.string()).nullable().optional(),
  });

  const response = await safeModelApiWithParser(
    options.failureMode,
    globalOptions,
    options.llmConfig,
    prompt,
    schema
  );
  if (response === null) {
    return { success: false, ...defaultResponse };
  }
  const { parsed, meta } = response;

  if (!parsed) {
    return {
      success: false,
      ...defaultResponse,
      meta,
    };
  }

  const pickedKlasses = (parsed[objective] ?? []) as string[];
  const { selectedIds, selectedNames } = candidates
    .filter((k) => pickedKlasses.includes(k.name))
    .map((k): [string, string] => [k.id, k.name])
    .reduce(
      (acc: { selectedIds: string[]; selectedNames: string[] }, [id, name]) => {
        acc.selectedIds.push(id);
        acc.selectedNames.push(name);
        return acc;
      },
      { selectedIds: [], selectedNames: [] }
    );
  const hallucinations = pickedKlasses.filter(
    (k) => !selectedNames.includes(k)
  );

  return {
    success: true,
    selectedIds,
    hallucinations,
    clues: parsed.CLUES ?? "",
    reasoning: parsed.REASONING ?? "",
    meta,
  };
};

export { normalizeText, llmClassification };
