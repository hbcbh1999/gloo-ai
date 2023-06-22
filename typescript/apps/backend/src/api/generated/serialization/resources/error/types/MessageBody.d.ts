/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as GlooApi from "../../../../api";
import * as core from "../../../../core";
export declare const MessageBody: core.serialization.ObjectSchema<serializers.MessageBody.Raw, GlooApi.MessageBody>;
export declare namespace MessageBody {
    interface Raw {
        message?: string | null;
    }
}