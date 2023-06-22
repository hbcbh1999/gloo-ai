/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../../..";
import * as GlooApi from "../../../../../../api";
import * as core from "../../../../../../core";
export declare const KlassDetails: core.serialization.ObjectSchema<serializers.v1.KlassDetails.Raw, GlooApi.v1.KlassDetails>;
export declare namespace KlassDetails {
    interface Raw extends serializers.v1.Klass.Raw {
        name: string;
        description: string;
    }
}
