/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const FailureMode: core.serialization.Schema<serializers.v1.FailureMode.Raw, GlooApi.v1.FailureMode>;
export declare namespace FailureMode {
    type Raw = "IGNORE" | "THROW";
}
