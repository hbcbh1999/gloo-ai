"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlooApiTimeoutError = void 0;
class GlooApiTimeoutError extends Error {
    constructor() {
        super("Timeout");
        Object.setPrototypeOf(this, GlooApiTimeoutError.prototype);
    }
}
exports.GlooApiTimeoutError = GlooApiTimeoutError;
