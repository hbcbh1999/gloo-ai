/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as GlooApi from "../../../../..";
export interface InternalPredictRequest {
    input: GlooApi.v1.InternalPredictInput;
    llmTarget?: string;
    configuration?: GlooApi.v1.Configuration;
    override?: GlooApi.v1.ConfigurationOverride;
}