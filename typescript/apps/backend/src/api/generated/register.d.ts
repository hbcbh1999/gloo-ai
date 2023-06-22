/**
 * This file was auto-generated by Fern from our API Definition.
 */
import express from "express";
import { ClassifiersService } from "./api/resources/classifiers/service/ClassifiersService";
import { ClassificationService as v1_ClassificationService } from "./api/resources/v1/resources/classification/service/ClassificationService";
export declare function register(expressApp: express.Express | express.Router, services: {
    classifiers: ClassifiersService;
    v1: {
        classification: v1_ClassificationService;
    };
}): void;
