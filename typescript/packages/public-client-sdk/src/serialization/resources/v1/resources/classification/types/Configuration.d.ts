/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as Gloo from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const Configuration: core.serialization.ObjectSchema<serializers.v1.Configuration.Raw, Gloo.v1.Configuration>;
export declare namespace Configuration {
    interface Raw {
        id: string;
        version: number;
    }
}
