import { InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";
import { v4 as uuid } from "uuid";

import config from "../config";
import { sagemakerClient } from "../dao/AWSClient";

enum ProviderEnum {
  CLASSIFIER = "CLASSIFIER",
}

interface ClassResult {
  provider: ProviderEnum;
  probability: number;
}

interface ClassifyResponse {
  request_id: string;
  classes: ClassResult[];
}

export async function fetchClassifyResponse(
  modelId: string,
  text: string
): Promise<ClassifyResponse> {
  const body = new TextEncoder().encode(
    JSON.stringify({
      inputs: text,
    })
  );

  const command = new InvokeEndpointCommand({
    EndpointName: `${config.STAGE}-${modelId}`,
    Body: body,
    ContentType: "application/json",
  });

  try {
    const response = await sagemakerClient.send(command);
    const responseBody = new TextDecoder().decode(response.Body);

    const probabilities: number[] = JSON.parse(responseBody) as number[];
    const classes: ClassResult[] = probabilities.map((p) => {
      return {
        provider: ProviderEnum.CLASSIFIER,
        probability: p,
      };
    });
    return {
      request_id: uuid(),
      classes,
    };
  } catch (err) {
    console.error("Classify Error", err);
    throw err;
  }
}
