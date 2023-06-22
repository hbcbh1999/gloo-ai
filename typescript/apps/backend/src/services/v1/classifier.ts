import { Types, prisma } from "@gloo/database";

import { ClassificationService } from "../../api/generated/api/resources/v1/resources/classification/service/ClassificationService";
import { SecretDao } from "../../dao/SecretDao";
import { callModelAPI } from "../utils/LLMApi";
import { DefaultLLMConfig, classify } from "../utils/classify";
import type { LLMOptionsInterface } from "../utils/pipeline/types";

const service = new ClassificationService({
  generateTextInternal: async (req, res) => {
    const secret = await SecretDao.load(req);
    secret.auth(req, {
      type: "GLOO_INTERNAL",
    });

    const llmConfig: LLMOptionsInterface | null =
      req.body.llmTarget === "NONE"
        ? null
        : req.body.llmTarget === "GLOO_DEFAULT_LLM"
        ? DefaultLLMConfig
        : await prisma.lLMEndpoints.findUniqueOrThrow({
            where: {
              orgId_name: {
                orgId: secret.orgId(req),
                name: req.body.llmTarget,
              },
            },
            select: {
              name: true,
              apiKey: true,
              apiBaseUrl: true,
              provider: true,
            },
          });

    if (!llmConfig) {
      throw new Error("LLM is not configured");
    }

    const answer = await callModelAPI(
      "THROW",
      llmConfig,
      { modelName: "gpt-3.5-turbo" },
      req.body.prompt,
      {
        temperature: 1.0,
      }
    );
    return res.send({
      samples: [answer?.text ?? ""],
    });
  },
  predictInternal: async (req, res) => {
    const startTime = new Date().getTime();
    // Ensure we have correct access.
    const secret = await SecretDao.load(req);
    secret.auth(req, {
      type: "GLOO_INTERNAL",
    });

    const llmTarget = req.body.llmTarget ?? "GLOO_DEFAULT_LLM";
    const llmConfig: LLMOptionsInterface | null =
      llmTarget.toUpperCase() === "NONE"
        ? null
        : llmTarget === "GLOO_DEFAULT_LLM"
        ? DefaultLLMConfig
        : await prisma.lLMEndpoints.findUniqueOrThrow({
            where: {
              orgId_name: {
                orgId: secret.orgId(req),
                name: llmTarget,
              },
            },
            select: {
              name: true,
              apiKey: true,
              apiBaseUrl: true,
              provider: true,
            },
          });

    const { input } = req.body;

    const pipelineInput =
      input.type === "input_id"
        ? { inputId: input.value }
        : {
            text: input.value,
          };

    const { status, normalizer, selectedKlasses, predictorDetails, latencyMs } =
      await classify(pipelineInput, {
        classifierId: req.params.classifier_id,
        override: req.body.override,
        configuration: req.body.configuration,
        llmConfig,
        startTime,
      });

    res.send({
      status,
      selectedClasses: Array.from(selectedKlasses.values()),
      predictorDetails,
      normalizer: await normalizer?.response(),
      latencyMs: latencyMs,
    });
  },
  predict: async (req, res) => {
    const startTime = new Date().getTime();
    // Ensure we have correct access.
    const secret = await SecretDao.load(req);
    secret.auth(req, {
      type: "CLASSIFIER_READ",
      classifierId: req.params.classifier_id,
    });

    const llmTarget = req.body.llmTarget ?? "GLOO_DEFAULT_LLM";

    const llmConfig: LLMOptionsInterface | null =
      llmTarget === "NONE"
        ? null
        : llmTarget === "GLOO_DEFAULT_LLM"
        ? DefaultLLMConfig
        : await prisma.lLMEndpoints.findUniqueOrThrow({
            where: {
              orgId_name: {
                orgId: secret.orgId(req),
                name: llmTarget,
              },
            },
            select: {
              name: true,
              apiKey: true,
              apiBaseUrl: true,
              provider: true,
            },
          });

    const classifier = await prisma.classifier.findUniqueOrThrow({
      where: {
        id: req.params.classifier_id,
      },
      select: {
        id: true,
        defaultConfigId: true,
        defaultConfigVersion: true,
      },
    });

    let configurationId: string | null = null;
    if (req.body.configuration?.id) {
      configurationId = `${req.params.classifier_id}_${req.body.configuration.id}`;
    } else {
      configurationId = classifier.defaultConfigId;
    }

    console.log("configurationId", configurationId, classifier.defaultConfigId);

    if (!configurationId) {
      throw new Error("No configuration specified");
    }

    const configurationVersion =
      req.body.configuration?.version ?? classifier.defaultConfigVersion ?? -1;

    // DB ID combines these two params
    const config = {
      id: configurationId,
      version: configurationVersion,
    };
    // Fuse the predictions.
    const tag = req.get("X-Gloo-Tag");
    const requestMetadata: Types.RequestMetadata = {
      tags: [...(tag ? [tag] : []), ...(req.body.tags ?? [])],
      apiKeyId: secret.toResponse().secretId,
    };

    const { status, requestId, selectedKlasses, predictorDetails } =
      await classify(
        { text: req.body.text },
        {
          classifierId: req.params.classifier_id,
          llmConfig,
          configuration: config,
          saveOptions: {
            save: true,
            requestMetadata,
          },
          startTime,
        }
      );
    if (!requestId) {
      throw new Error("No request id");
    }
    if (status !== "PASS") {
      throw new Error("Classifier failed");
    }

    res.send({
      id: requestId,
      selectedClasses: selectedKlasses,
      predictorDetails,
    });
  },
  feedback: async (_req, _res) => {
    throw new Error("Method not implemented.");
  },
});

export default service;
