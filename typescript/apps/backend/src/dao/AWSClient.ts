import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SageMakerRuntimeClient } from "@aws-sdk/client-sagemaker-runtime";

import config from "../config";

const provider = defaultProvider();

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: true, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const AWSDynamoDBClient = new DynamoDBClient({
  credentials: provider,
  region: config.AWS_REGION,
});
const ddbDocClient = DynamoDBDocument.from(AWSDynamoDBClient, {
  marshallOptions,
});
const AWSS3Client = new S3Client({
  credentials: provider,
  region: config.AWS_REGION,
});
const AWSSQSClient = new SQSClient({
  credentials: provider,
  region: config.AWS_REGION,
});
const sagemakerClient = new SageMakerRuntimeClient({
  credentials: provider,
  region: config.AWS_REGION,
});

export { AWSS3Client, AWSSQSClient, ddbDocClient, sagemakerClient };
