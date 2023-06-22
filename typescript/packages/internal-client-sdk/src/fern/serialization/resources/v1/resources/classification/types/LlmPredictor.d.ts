/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const LlmPredictor: core.serialization.Schema<serializers.v1.LlmPredictor.Raw, GlooApi.v1.LlmPredictor>;
export declare namespace LlmPredictor {
    type Raw = LlmPredictor.Id | LlmPredictor.Override;
    interface Id {
        type: "id";
        value: string;
    }
    interface Override extends serializers.v1.LlmPredictorOverride.Raw {
        type: "override";
    }
}