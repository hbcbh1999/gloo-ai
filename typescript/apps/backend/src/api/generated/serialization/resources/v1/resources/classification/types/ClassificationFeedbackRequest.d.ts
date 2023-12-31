/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const ClassificationFeedbackRequest: core.serialization.ObjectSchema<serializers.v1.ClassificationFeedbackRequest.Raw, GlooApi.v1.ClassificationFeedbackRequest>;
export declare namespace ClassificationFeedbackRequest {
    interface Raw {
        predictionId: string;
        type: serializers.v1.FeedbackType.Raw;
        expected_classes?: string[] | null;
    }
}
