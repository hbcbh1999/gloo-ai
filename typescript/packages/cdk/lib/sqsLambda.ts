import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import type { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";

interface Props {
  vpc: Vpc;
  securityGroup: SecurityGroup;
}

export class LambdaWithSQSQueueStack extends Construct {
  readonly queue;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const deadLetterQueue = new sqs.Queue(this, "dead-letter-queue", {
      retentionPeriod: cdk.Duration.minutes(30),
      queueName: "embedding-dead-letter-queue",
    });
    // Create an SQS queue
    this.queue = new sqs.Queue(this, "MyQueue", {
      queueName: "embedding-job-queue",
      visibilityTimeout: Duration.minutes(10), // default,
      receiveMessageWaitTime: Duration.seconds(5), // default
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // Create a Lambda function
    const func = new lambda.Function(this, "EmbeddingJobHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../../lambda/dist/index.zip"),
      functionName: "embedding-job-handler",
      vpc: props.vpc,
      // reservedConcurrentExecutions: 10,
      allowAllOutbound: true,
      securityGroups: [props.securityGroup],
      timeout: Duration.seconds(200),
      environment: {
        QUEUE_URL: this.queue.queueUrl, // Pass the SQS queue URL to the Lambda function
      },
    });

    func.addEventSource(
      new SqsEventSource(this.queue, {
        batchSize: 5, // default
        maxBatchingWindow: Duration.seconds(10),
        reportBatchItemFailures: true, // default to false
        maxConcurrency: 2,
      })
    );
  }
}
