import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { BlockDeviceVolume } from "aws-cdk-lib/aws-autoscaling";
import type { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import type { Ec2Service } from "aws-cdk-lib/aws-ecs";
import {
  AmiHardwareType,
  ContainerImage,
  NetworkMode,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationProtocol,
  ListenerAction,
  ListenerCondition,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { IRole } from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

import { DynamoDBStack } from "./dynamodb";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

interface GlooStackProps extends cdk.StackProps {
  stage: "prod" | "dev";
}

export class GlooInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GlooStackProps) {
    super(scope, id, props);

    const capitalizedStage = props?.stage.toUpperCase();

    // create bucket for our documents
    const docsBucket = new s3.Bucket(this, "GlooDocs", {
      removalPolicy: RemovalPolicy.RETAIN,
      bucketName: "prod-gloo-documents",
    });
    const classifierModelsBucket = new s3.Bucket(this, "GlooModels", {
      removalPolicy: RemovalPolicy.RETAIN,
      bucketName: "prod-gloo-ml-models",
    });
    const docsBucketDev = new s3.Bucket(this, "DevGlooDocs", {
      removalPolicy: RemovalPolicy.RETAIN,
      bucketName: "dev-gloo-documents",
    });
    const classifierModelsBucketDev = new s3.Bucket(this, "DevGlooModels", {
      removalPolicy: RemovalPolicy.RETAIN,
      bucketName: "dev-gloo-ml-models",
    });

    const ddbStackName = props.stage === "prod" ? "DynamoDB" : "DynamoDBTest";
    const ddbStack = new DynamoDBStack(this, "DynamoDB", {
      stage: "prod",
    });
    const ddbStackDev = new DynamoDBStack(this, "DynamoDBTest", {
      stage: "dev",
    });

    const glooServiceRepo = ecr.Repository.fromRepositoryName(
      this,
      "GlooServiceRepo",
      "gloo-service"
    );
    const embeddingServiceRepo = ecr.Repository.fromRepositoryName(
      this,
      "EmbeddingServiceRepo",
      "embedding-service"
    );
    // repository.addLifecycleRule({ maxImageAge: Duration.days(30) });
    const user = new iam.User(this, "GlooRepoReader");
    ecr.AuthorizationToken.grantRead(user);
    ecr.PublicGalleryAuthorizationToken.grantRead(user);
    const executionRole = this.createEcsRole(
      "ServiceTaskExecutionRole",
      "ServiceTaskExecutionRole"
    );
    glooServiceRepo.grantPull(executionRole);
    embeddingServiceRepo.grantPull(executionRole);

    // The code that defines your stack goes here
    // new sqs.Queue(this, 'embedding-task-queue');

    const vpc = new ec2.Vpc(this, "GlooVpc", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private with NAT",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const albSecurityGroup = new ec2.SecurityGroup(
      this,
      "GlooServiceALBPublic",
      {
        vpc,
      }
    );
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing());

    const ecsSecurityGroup = new ec2.SecurityGroup(this, "SGAllOutbound", {
      vpc,
      allowAllOutbound: true,
    });
    ecsSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    // we use dynamic ports on containers so we need to allow lots of ports from the alb
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.allTraffic(),
      "ALB traffic"
    );
    ecsSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.allTraffic(),
      "Internal traffic"
    );
    ecsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "SSH traffic"
    );

    const asg = new autoscaling.AutoScalingGroup(this, "GlooService", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.LARGE
      ),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(AmiHardwareType.ARM),
      keyName: "gloo-ai-keys", // this is manually created in AWS console in the region we want.
      maxCapacity: 1,
      vpc,
      securityGroup: ecsSecurityGroup,
      minCapacity: 1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
    const cluster = new ecs.Cluster(this, "GlooServiceEcsCluster", {
      vpc,
      // clusterName: "GlooServiceCluster"
    });
    const capacityProvider = new ecs.AsgCapacityProvider(
      this,
      "AsgCapacityProvider",
      { autoScalingGroup: asg }
    );
    cluster.addAsgCapacityProvider(capacityProvider);

    const containerName = "GlooService";

    // Create Task Definition
    // can choose network mode here: networkMode: ecs.NetworkMode.BRIDGE,
    const glooServiceTaskDefinition = new ecs.Ec2TaskDefinition(
      this,
      "GlooECSTask",
      {
        networkMode: NetworkMode.BRIDGE,
        executionRole: executionRole,
      }
    );

    ddbStack.grantPermissions(glooServiceTaskDefinition.taskRole);
    ddbStackDev.grantPermissions(glooServiceTaskDefinition.taskRole);
    docsBucket.grantReadWrite(glooServiceTaskDefinition.taskRole);
    docsBucketDev.grantReadWrite(glooServiceTaskDefinition.taskRole);
    classifierModelsBucketDev.grantReadWrite(
      glooServiceTaskDefinition.taskRole
    );
    classifierModelsBucket.grantReadWrite(glooServiceTaskDefinition.taskRole);
    glooServiceTaskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
    );
    glooServiceTaskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );
    glooServiceTaskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess")
    );
    glooServiceTaskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );
    // secret from secrets manager by arn
    const infisicalSecret = Secret.fromSecretCompleteArn(
      this,
      "prod-infisical-54HKeL",
      "arn:aws:secretsmanager:us-east-1:404337120808:secret:prod-infisical-54HKeL"
    );

    const _container = glooServiceTaskDefinition.addContainer(containerName, {
      image: ContainerImage.fromRegistry(
        "404337120808.dkr.ecr.us-east-1.amazonaws.com/gloo-service:latest"
      ),
      memoryReservationMiB: 2048,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "GlooServiceLogs" }),
      startTimeout: Duration.seconds(300),
      stopTimeout: Duration.seconds(10),
      secrets: {
        INFISICAL_TOKEN: ecs.Secret.fromSecretsManager(
          infisicalSecret,
          "PROD_INFISICAL_TOKEN"
        ),
      },
      portMappings: [
        {
          containerPort: 8080,
          hostPort: 0, // dynamic port mapping
        },
      ],
    });

    const service = new ecs.Ec2Service(this, "GlooServiceECS", {
      cluster,
      taskDefinition: glooServiceTaskDefinition,
      desiredCount: 2,
    });

    // for api.gloo.chat
    const certificate = elbv2.ListenerCertificate.fromArn(
      "arn:aws:acm:us-east-1:404337120808:certificate/251b175b-da55-411d-b98a-e55faa70b623"
    );
    // api.trygloo.com
    const cert2ApiTryGloo = elbv2.ListenerCertificate.fromArn(
      "arn:aws:acm:us-east-1:404337120808:certificate/608cda48-78af-4450-b099-3cea30922654"
    );

    const loadbalancer = new elbv2.ApplicationLoadBalancer(this, "PublicALB", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });
    const glooServiceTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "GlooServiceTarget",
      {
        vpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [service],
        //  [service.loadBalancerTarget({
        //   containerName: containerName,
        //   containerPort: 80,
        // })],
      }
    );
    const listener = loadbalancer.addListener("PublicALBListener", {
      port: 443,
      open: true,
      certificates: [certificate, cert2ApiTryGloo],
      protocol: ApplicationProtocol.HTTPS,
      defaultTargetGroups: [glooServiceTargetGroup],
    });

    listener.addAction("ALBAction", {
      conditions: [ListenerCondition.pathPatterns(["*"])],
      action: ListenerAction.forward([glooServiceTargetGroup]),
      priority: 1,
    });

    // this is really for local dev
    const appUser = new iam.User(this, "AppUser", {
      userName: "dev",
    });
    appUser.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
    );
    appUser.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
    );
    appUser.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryFullAccess"
      )
    );
    appUser.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess")
    );
    appUser.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );
    classifierModelsBucket.grantReadWrite(appUser);
    docsBucket.grantReadWrite(appUser);
    classifierModelsBucketDev.grantReadWrite(appUser);
    docsBucketDev.grantReadWrite(appUser);
    ecr.AuthorizationToken.grantRead(appUser);
    ecr.PublicGalleryAuthorizationToken.grantRead(appUser);
  }

  private createEcsRole(id: string, roleName: string): iam.IRole {
    const ecsRole = new iam.Role(this, id, {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: roleName,
    });
    return ecsRole;
  }
}
