import * as cdk from "aws-cdk-lib";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import type { IRole } from "aws-cdk-lib/aws-iam";

interface DynamoDBStackProps extends cdk.StackProps {
  stage: "prod" | "dev";
}

// decided to add test at the beginning since we have all tables in one account
// and its easier to order by the name with test-
function getTableName(stage: "prod" | "dev", tableName: string) {
  return `${stage}-${tableName}`;
}
function getResourceName(stage: "prod" | "dev", resourceName: string) {
  return `${stage}${resourceName}`;
}

// TODO: at some point do a single-table design...
export class DynamoDBStack extends Construct {
  private readonly apps: Table;
  private readonly docs: Table;
  private readonly secrets: Table;
  private readonly classifiers: Table;
  private readonly datapoints: Table;
  private readonly models: Table;
  private readonly classes: Table;
  private readonly orgs: Table;
  private readonly labeling: Table;
  private readonly predictions: Table;
  private readonly feedback: Table;
  private readonly inputs: Table;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id);

    this.apps = new Table(this, getResourceName(props.stage, "IndexTable"), {
      tableName: getTableName(props.stage, "indexes"),
      partitionKey: {
        name: "indexId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.apps.addGlobalSecondaryIndex({
      indexName: "orgIdIndex",
      partitionKey: {
        name: "orgId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });
    this.classifiers = new Table(
      this,
      getResourceName(props.stage, "ClassifiersTable"),
      {
        tableName: getTableName(props.stage, "classifiers"),
        partitionKey: {
          name: "classifierId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );
    this.classifiers.addGlobalSecondaryIndex({
      indexName: "orgIdIndex",
      partitionKey: {
        name: "orgId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    const classifierTimeIndex: cdk.aws_dynamodb.GlobalSecondaryIndexProps = {
      indexName: "classifierIdIndex",
      partitionKey: {
        name: "classifierId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "createdAtMillis",
        type: AttributeType.NUMBER,
      },
    };

    this.datapoints = new Table(
      this,
      getResourceName(props.stage, "DatapointsTable"),
      {
        tableName: getTableName(props.stage, "datapoints"),
        partitionKey: {
          name: "classifierId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "datapointId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );
    this.datapoints.addGlobalSecondaryIndex({
      indexName: "classifierId-createTime-index",
      partitionKey: {
        name: "classifierId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "createdAtMillis",
        type: AttributeType.NUMBER,
      },
    });
    this.datapoints.addGlobalSecondaryIndex({
      indexName: "datapointIdIndex",
      partitionKey: {
        name: "datapointId",
        type: AttributeType.STRING,
      },
    });

    this.orgs = new Table(this, getResourceName(props.stage, "OrgsTable"), {
      tableName: getTableName(props.stage, "orgs"),
      partitionKey: {
        name: "orgId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.labeling = new Table(
      this,
      getResourceName(props.stage, "LabelSessionTable"),
      {
        tableName: getTableName(props.stage, "label-session"),
        partitionKey: {
          name: "labelSessionId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "classifierId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    this.labeling.addGlobalSecondaryIndex({
      indexName: "classifierIdIndex",
      partitionKey: {
        name: "classifierId",
        type: AttributeType.STRING,
      },
    });

    this.predictions = new Table(
      this,
      getResourceName(props.stage, "PredictionsTable"),
      {
        tableName: getTableName(props.stage, "predictions"),
        partitionKey: {
          name: "predictionId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "sk",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );
    this.predictions.addGlobalSecondaryIndex(classifierTimeIndex);

    this.inputs = new Table(this, getResourceName(props.stage, "InputsTable"), {
      tableName: getTableName(props.stage, "inputs"),
      partitionKey: {
        name: "inputId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.inputs.addGlobalSecondaryIndex(classifierTimeIndex);

    this.feedback = new Table(
      this,
      getResourceName(props.stage, "FeedbackTable"),
      {
        tableName: getTableName(props.stage, "feedback"),
        partitionKey: {
          name: "feedbackId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "sk",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    this.feedback.addGlobalSecondaryIndex(classifierTimeIndex);
    this.feedback.addGlobalSecondaryIndex({
      indexName: "labelerIdIndex",
      partitionKey: {
        name: "labelerId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: AttributeType.STRING,
      },
    });

    this.models = new Table(this, getResourceName(props.stage, "ModelsTable"), {
      tableName: getTableName(props.stage, "models"),
      partitionKey: {
        name: "modelId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.models.addGlobalSecondaryIndex({
      indexName: "classifierIdIndex",
      partitionKey: {
        name: "classifierId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "creationTimeMillis",
        type: AttributeType.NUMBER,
      },
    });
    this.classes = new Table(
      this,
      getResourceName(props.stage, "ClassesTable"),
      {
        tableName: getTableName(props.stage, "classes"),
        partitionKey: {
          name: "classifierId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "classId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );
    this.classes.addGlobalSecondaryIndex({
      indexName: "classifierLatestVersionIndex",
      partitionKey: {
        name: "classifierId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "isLatestVersion",
        type: AttributeType.NUMBER,
      },
      projectionType: ProjectionType.ALL,
    });

    this.docs = new Table(
      this,
      getResourceName(props.stage, "DocumentsTable"),
      {
        tableName: getTableName(props.stage, "documents"),
        partitionKey: {
          name: "documentId",
          type: AttributeType.STRING,
        },
        sortKey: {
          name: "indexId",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    // Add a global secondary index to the documentModelTable for querying by tags
    this.docs.addGlobalSecondaryIndex({
      indexName: "sourceIndex",
      partitionKey: {
        name: "source",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "indexId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    this.docs.addGlobalSecondaryIndex({
      indexName: "indexIdIndex",
      partitionKey: {
        name: "indexId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    this.secrets = new Table(
      this,
      getResourceName(props.stage, "SecretsTable"),
      {
        tableName: getTableName(props.stage, "secrets"),
        partitionKey: {
          name: "secretKey",
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    this.secrets.addGlobalSecondaryIndex({
      indexName: "orgIdIndex",
      partitionKey: {
        name: "orgId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });
    this.secrets.addGlobalSecondaryIndex({
      indexName: "secretIdIndex",
      partitionKey: {
        name: "secretId",
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });
  }

  grantPermissions(role: IRole) {
    this.apps.grantReadWriteData(role);
    this.docs.grantReadWriteData(role);
    this.secrets.grantReadWriteData(role);
    this.classifiers.grantReadWriteData(role);
    this.datapoints.grantReadWriteData(role);
    this.models.grantReadWriteData(role);
    this.classes.grantReadWriteData(role);
    this.orgs.grantReadWriteData(role);
    this.labeling.grantReadData(role);
    this.predictions.grantReadWriteData(role);
    this.feedback.grantReadWriteData(role);
    this.inputs.grantReadWriteData(role);
  }
}
