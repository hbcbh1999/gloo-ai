/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as Gloo from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const PredictionResponse: core.serialization.ObjectSchema<serializers.v1.PredictionResponse.Raw, Gloo.v1.PredictionResponse>;
export declare namespace PredictionResponse {
    interface Raw extends serializers.v1.InternalPredictResponseBase.Raw {
        id: string;
    }
}
