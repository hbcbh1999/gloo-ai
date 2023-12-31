/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const InternalPredictResponse: core.serialization.ObjectSchema<serializers.v1.InternalPredictResponse.Raw, GlooApi.v1.InternalPredictResponse>;
export declare namespace InternalPredictResponse {
    interface Raw extends serializers.v1.InternalPredictResponseBase.Raw {
        status: serializers.v1.Status.Raw;
        latency_ms: number;
        normalizer?: serializers.v1.NormalizerResponse.Raw | null;
    }
}
