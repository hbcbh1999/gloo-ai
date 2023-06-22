import * as Sentry from "@sentry/node";

import { prisma } from "@gloo/database";
import { ClassifiersService } from "../api/generated/api/resources/classifiers/service/ClassifiersService";
import { SecretDao } from "../dao/SecretDao";
import { DefaultLLMConfig, classify } from "./utils/classify";
import { ClassificationRequest } from "@/api/generated/api";
import { ClassifyInputType, DatapointInput } from "./utils/DatapointInput";

export default new ClassifiersService({
  classify: async (req, res) => {
    const classifierId = req.params.classifier_id;
    Sentry.configureScope((scope) => {
      scope.setTag("enableLowLatency", req.body.enableLowLatency);
    });
    const [secret] = await Promise.all([SecretDao.load(req)]);

    const startTime = new Date().getTime();
    secret.auth(req, { type: "APP_READ", indexId: "" });
    const tag = req.get("X-Gloo-Tag");
    const input = getDatapointInput(req.body);

    const inputText =
      input.type === "TEXT"
        ? input.value.text
        : input.value.messages.map((m) => `${m.type}: ${m.text}`).join("\n");
    const lowLatency =
      input.value.enableLowLatency ?? req.body.enableLowLatency ?? false;
    const newClassifierID = "ep_9941f0f1787142b9b76f7e77b3f38bac";

    const llmConfig =
      (await prisma.lLMEndpoints.findUnique({
        where: {
          orgId_name: {
            orgId: secret.orgId(req),
            name: "Yuma-Default-OpenAI",
          },
        },
        select: {
          name: true,
          apiKey: true,
          apiBaseUrl: true,
          provider: true,
        },
      })) ?? DefaultLLMConfig;

    const { selectedKlasses } = await classify(
      { text: inputText },
      {
        classifierId: newClassifierID,
        configuration: lowLatency
          ? {
              id: `${newClassifierID}_low-latency`,
              version: 1,
            }
          : {
              id: `${newClassifierID}_hybrid`,
              version: 1,
            },
        saveOptions: {
          save: true,
          requestMetadata: {
            tags: tag ? [tag, "legacy-api"] : ["legacy-api"],
            apiKeyId: secret.toResponse().secretId,
          },
        },
        llmConfig,
        startTime,
      }
    );

    return res.send({
      requestToken: "DEPRECATED",
      classes: selectedKlasses.map((klass) => klass.latestName),
    });
  },
});

export function getDatapointInput(
  classifyRequest: ClassificationRequest
): DatapointInput {
  if (classifyRequest.type === "text") {
    return {
      type: ClassifyInputType.TEXT,
      version: 1,
      value: {
        enableLowLatency: classifyRequest.enableLowLatency,
        languageHint: classifyRequest.languageHint,
        text: classifyRequest.text,
      },
    };
  } else if (classifyRequest.type === "thread") {
    return {
      type: ClassifyInputType.THREAD,
      version: 1,
      value: {
        enableLowLatency: classifyRequest.enableLowLatency,
        languageHint: classifyRequest.languageHint,
        topic: classifyRequest.topic,
        summary: classifyRequest.summary,
        messages: classifyRequest.messages,
      },
    };
  } else {
    throw new Error("Invalid classifyRequest type");
  }
}
