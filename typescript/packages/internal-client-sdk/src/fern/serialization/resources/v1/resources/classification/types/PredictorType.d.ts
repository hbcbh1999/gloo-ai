/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const PredictorType: core.serialization.Schema<serializers.v1.PredictorType.Raw, GlooApi.v1.PredictorType>;
export declare namespace PredictorType {
    type Raw = "FT" | "LLM";
}
