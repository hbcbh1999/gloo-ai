"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
function register(expressApp, services) {
    expressApp.use("/classifiers", services.classifiers.toRouter());
    expressApp.use("/v1/classification", services.v1.classification.toRouter());
}
exports.register = register;
