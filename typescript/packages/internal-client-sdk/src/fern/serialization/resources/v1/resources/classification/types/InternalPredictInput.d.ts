/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const InternalPredictInput: core.serialization.Schema<serializers.v1.InternalPredictInput.Raw, GlooApi.v1.InternalPredictInput>;
export declare namespace InternalPredictInput {
    type Raw = InternalPredictInput.Text | InternalPredictInput.InputId;
    interface Text {
        type: "text";
        value: string;
    }
    interface InputId {
        type: "input_id";
        value: string;
    }
}