/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const NormalizerResponse: core.serialization.ObjectSchema<serializers.v1.NormalizerResponse.Raw, GlooApi.v1.NormalizerResponse>;
export declare namespace NormalizerResponse {
    interface Raw {
        status: serializers.v1.Status.Raw;
        text?: string | null;
        latency_ms: number;
        tokens_used?: number | null;
    }
}
