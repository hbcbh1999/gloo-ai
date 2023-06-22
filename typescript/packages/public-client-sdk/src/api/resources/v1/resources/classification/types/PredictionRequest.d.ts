/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as Gloo from "../../../../..";
export interface PredictionRequest {
    /** The associated API key that you registered to use for any LLM calls. Use target 'gloo' to use the trial version. */
    llmTarget?: string;
    /** The text to classify */
    text: string;
    /** The tags to label this input with. This is useful if you have test data that you want to label, or to distinguish between production and test data. */
    tags?: string[];
    /** Overrides for the prediction. If not provided, the default configuration will be used. */
    configuration?: Gloo.v1.Configuration;
}