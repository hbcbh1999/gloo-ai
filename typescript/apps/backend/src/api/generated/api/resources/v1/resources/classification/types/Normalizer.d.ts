/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as GlooApi from "../../../../..";
export declare type Normalizer = GlooApi.v1.Normalizer.Id | GlooApi.v1.Normalizer.Override;
export declare namespace Normalizer {
    interface Id {
        type: "id";
        value: string;
    }
    interface Override extends GlooApi.v1.NormalizerOverride {
        type: "override";
    }
}
