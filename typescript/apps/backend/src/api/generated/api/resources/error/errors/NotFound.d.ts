/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as errors from "../../../../errors";
import * as GlooApi from "../../..";
import express from "express";
export declare class NotFound extends errors.GlooApiError {
    private readonly body;
    constructor(body: GlooApi.MessageBody);
    send(res: express.Response): Promise<void>;
}
