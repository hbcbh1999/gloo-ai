/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as Gloo from "../../../../..";
export interface InternalPredictResponseBase {
    /** The predicted classes which were selected */
    selectedClasses: Gloo.v1.SelectedClass[];
    /** The sources of the predictions */
    predictorDetails: Gloo.v1.DetailsUnion[];
}