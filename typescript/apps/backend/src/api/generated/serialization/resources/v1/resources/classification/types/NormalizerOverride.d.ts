/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const NormalizerOverride: core.serialization.ObjectSchema<serializers.v1.NormalizerOverride.Raw, GlooApi.v1.NormalizerOverride>;
export declare namespace NormalizerOverride {
    interface Raw {
        failure_mode: serializers.v1.FailureMode.Raw;
        llm_config: serializers.v1.LlmConfig.Raw;
        prompt: string;
    }
}
