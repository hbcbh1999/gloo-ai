"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlooTimeoutError = void 0;
class GlooTimeoutError extends Error {
    constructor() {
        super("Timeout");
        Object.setPrototypeOf(this, GlooTimeoutError.prototype);
    }
}
exports.GlooTimeoutError = GlooTimeoutError;
