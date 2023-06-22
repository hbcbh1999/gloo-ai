/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as GlooApi from "../../../../api";
import * as core from "../../../../core";
export declare const ClassificationResponse: core.serialization.ObjectSchema<serializers.ClassificationResponse.Raw, GlooApi.ClassificationResponse>;
export declare namespace ClassificationResponse {
    interface Raw {
        request_token: string;
        classes: string[];
    }
}