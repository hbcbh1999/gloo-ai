import { z } from "zod";

const failureMode = z.enum(["IGNORE", "THROW"]);

export const zTraditionalClassifierOptionsSchema = z.object({
  failureMode,
  endpoint: z.string(),
});

const zLLMConfigSchema = z.object({
  modelName: z.string(),
  // In the future, we can add different llm parameters here
});

export const zLLMResponseSchema = z.object({
  tokenUsage: z
    .object({
      completionTokens: z.number().int(),
      promptTokens: z.number().int(),
      totalTokens: z.number().int(),
    })
    .optional(),
});

export const zLLMClassificationResponseSchema = z
  .object({
    reasoning: z.string(),
    clues: z.string(),
  })
  .merge(zLLMResponseSchema);

export const zNormalizerOptionsSchema = z.object({
  failureMode,
  prompt: z.string(),
  llmConfig: zLLMConfigSchema,
});

export const zLLMClassifierOptionsSchema = z.object({
  failureMode,
  llmConfig: zLLMConfigSchema,
  inputDescription: z.string().min(3),
  objective: z.union([
    z.literal("intents"),
    z.literal("sentiments"),
    z.literal("topics"),
    z.literal("questions"),
    z.literal("classes"),
    z.string().min(3),
  ]),
  skipPriorAvailableKlasses: z.boolean().default(false),
  addPriorSelectedKlasses: z.boolean().default(false),
});

const zKlass = z.object({
  id: z.string(),
  version: z.number().int(),
});

const zKlassDetails = zKlass.merge(
  z.object({
    name: z.string(),
    description: z.string(),
  })
);

export const zSupportedKlasses = z.array(zKlass);

const zKlassPrediction = zKlass.merge(
  z.object({
    confidence: z.number(),
    selected: z.boolean(),
  })
);

export const zPredictionResult = z.array(zKlassPrediction);

export const zRequestMetadata = z.object({
  tags: z.array(z.string()).optional(),
  apiKeyId: z.string().optional(),
});

const zHallucination = z.object({
  klassName: z.string(),
});
export const zHallucinations = z.array(zHallucination);

export type TraditionalClassifierOptions = z.infer<
  typeof zTraditionalClassifierOptionsSchema
>;
export type Klass = z.infer<typeof zKlass>;
export type KlassDetails = z.infer<typeof zKlassDetails>;
export type LLMConfig = z.infer<typeof zLLMConfigSchema>;
export type NormalizerOptions = z.infer<typeof zNormalizerOptionsSchema>;
export type LLMClassifierOptions = z.infer<typeof zLLMClassifierOptionsSchema>;
export type SupportedKlasses = z.infer<typeof zSupportedKlasses>;
export type KlassPrediction = z.infer<typeof zKlassPrediction>;
export type PredictionResult = z.infer<typeof zPredictionResult>;
export type Hallucination = z.infer<typeof zHallucination>;
export type Hallucinations = z.infer<typeof zHallucinations>;
export type LLMResponse = z.infer<typeof zLLMResponseSchema>;
export type LLMClassificationResponse = z.infer<
  typeof zLLMClassificationResponseSchema
>;
export type RequestMetadata = z.infer<typeof zRequestMetadata>;
