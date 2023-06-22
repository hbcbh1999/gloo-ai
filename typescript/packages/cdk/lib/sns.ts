// import { Construct } from "constructs";
// import * as cdk from "aws-cdk-lib";
// import * as events from "aws-cdk-lib/aws-events";
// import * as targets from "aws-cdk-lib/aws-events-targets";
// import * as ecs from "aws-cdk-lib/aws-ecs";
// import * as iam from "aws-cdk-lib/aws-iam";

// interface NotifProps {
//   cluster: ecs.Cluster;
// }

// export class SnsNotifs extends Construct {
//   constructor(scope: Construct, id: string, props: NotifProps) {
//     super(scope, id);

//     // Define your task definition and container here
//     const eventRule = new events.Rule(scope, 'EcsStateChangeRule', {
//       description: 'Rule for ECS state change events',
//       eventPattern: {
//         source: ['aws.ecs'],
//         detailType: ['ECS Task State Change'],
//         detail: {
//           clusterArn: [props.cluster.clusterArn],
//           lastStatus: ['STOPPED'],
//         },
//       },
//     });

//   }
// }
