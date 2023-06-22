import type { LLMOptionsInterface, Pipeline, PipelineInput } from "./types";
import { Input } from "./parts/input";
import { Normalizer } from "./parts/normalizer";
import { CompositePredictor } from "./parts/predictorComposite";
import { KlassManager } from "./parts/klassBase";

const runPipeline = async (
  pipeline: Pipeline,
  llmConfig: LLMOptionsInterface | null,
  pipelineIn: PipelineInput,
  startTime: number | undefined
) => {
  // First fetch results from a cache if available.
  const input = Input.fromPipelineInput(pipelineIn);
  const normalizer = Normalizer.fromPipeline(pipeline, llmConfig);
  const predictor = CompositePredictor.fromPipeline(pipeline, llmConfig);
  const klassManager = KlassManager.fromPipeline(pipeline);

  const normalizationResult = (await normalizer?.run(input)) ?? null;

  const outcome = await predictor.run(
    input,
    normalizationResult,
    klassManager,
    [],
    startTime
  );

  return {
    input,
    normalizationResult,
    outcome,
    klassManager,
  };
};

export default runPipeline;
