/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as GlooApi from "../../../../..";
export declare type DetailsUnion = GlooApi.v1.DetailsUnion.Base | GlooApi.v1.DetailsUnion.Llm;
export declare namespace DetailsUnion {
    interface Base extends GlooApi.v1.PredictorDetails {
        type: "base";
    }
    interface Llm extends GlooApi.v1.LlmPredictorDetails {
        type: "llm";
    }
}