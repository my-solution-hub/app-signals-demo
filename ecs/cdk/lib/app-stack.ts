import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as appsignals from '@aws-cdk/aws-applicationsignals-alpha';
import { Repository } from 'aws-cdk-lib/aws-ecr'

export class EcsFargateAppStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: any) {
    const stackName = `${id}-app`
    super(scope, stackName, props)

    const helloRepo = Repository.fromRepositoryName(this, 'AppRepository', `${id}-app`) as Repository
    const worldRepo = Repository.fromRepositoryName(this, 'WorldRepository', `${id}-world-app`) as Repository

    // Create execution role for ECS tasks
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ]
    })

    // Add SSM permissions for CloudWatch agent configuration
    executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameters', 'ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/ecs-cwagent`]
    }))

    // Create task role for Application Signals
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
      ]
    })

    // Create security group
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'Security group for hello app'
    })

    serviceSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'Allow hello app traffic')
    serviceSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow ALB traffic')

    // Create ALB for world service
    const worldAlb = new elbv2.ApplicationLoadBalancer(this, 'WorldALB', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: serviceSecurityGroup
    })

    // Create ALB for hello service  
    const helloAlb = new elbv2.ApplicationLoadBalancer(this, 'HelloALB', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: serviceSecurityGroup
    })

    const worldService = this.createWorldApp(props, serviceSecurityGroup, executionRole, taskRole, worldRepo)
    
    // Create target group for world service
    const worldTargetGroup = new elbv2.ApplicationTargetGroup(this, 'WorldTargetGroup', {
      vpc: props.vpc,
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200'
      }
    })

    // Add world service to target group
    worldService.attachToApplicationTargetGroup(worldTargetGroup)

    // Create ALB listener
    worldAlb.addListener('WorldListener', {
      port: 80,
      defaultTargetGroups: [worldTargetGroup]
    })

    // Output ALB DNS name
    new cdk.CfnOutput(this, 'WorldALBDNS', {
      value: worldAlb.loadBalancerDnsName,
      description: 'World service ALB DNS name'
    })

    const helloService = this.createHelloApp(props, serviceSecurityGroup, executionRole, taskRole, helloRepo, worldAlb.loadBalancerDnsName)

    // Create target group for hello service
    const helloTargetGroup = new elbv2.ApplicationTargetGroup(this, 'HelloTargetGroup', {
      vpc: props.vpc,
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200'
      }
    })

    // Add hello service to target group
    helloService.attachToApplicationTargetGroup(helloTargetGroup)

    // Create hello ALB listener
    helloAlb.addListener('HelloListener', {
      port: 80,
      defaultTargetGroups: [helloTargetGroup]
    })

    // Output hello ALB DNS name
    new cdk.CfnOutput(this, 'HelloALBDNS', {
      value: helloAlb.loadBalancerDnsName,
      description: 'Hello service ALB DNS name'
    })
  }

  createHelloApp (
    props: any,
    serviceSecurityGroup: ec2.SecurityGroup,
    executionRole: iam.Role,
    taskRole: iam.Role,
    appRepository: Repository,
    worldServiceUrl: string
  ): ecs.FargateService {
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'HelloTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: executionRole,
      taskRole: taskRole,
    })

    // Add hello app container
    taskDefinition.addContainer('HelloContainer', {
      image: ecs.ContainerImage.fromEcrRepository(appRepository),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'hello-app',
        logRetention: logs.RetentionDays.ONE_WEEK
      }),
      portMappings: [{ containerPort: 8080 }],
      environment: {
        SERVER_PORT: '8080',
        SPRING_APPLICATION_NAME: 'hello',
        WORLD_SERVICE_URL: `http://${worldServiceUrl}`
      }
    })

    // Create Fargate service
    const helloService = new ecs.FargateService(this, 'HelloService', {
      cluster: props.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [serviceSecurityGroup],
      minHealthyPercent: 0
    })

    return helloService
  }

  createWorldApp (
    props: any,
    serviceSecurityGroup: ec2.SecurityGroup,
    executionRole: iam.Role,
    taskRole: iam.Role,
    appRepository: Repository
  ): ecs.FargateService {
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'WorldTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: executionRole,
      taskRole: taskRole
    })

    // Add world app container
    taskDefinition.addContainer('WorldContainer', {
      image: ecs.ContainerImage.fromEcrRepository(appRepository),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'world-app',
        logRetention: logs.RetentionDays.ONE_WEEK
      }),
      portMappings: [{ containerPort: 8080 }],
      environment: {
        SERVER_PORT: '8080',
        SPRING_APPLICATION_NAME: 'world'
      }
    })

    new appsignals.ApplicationSignalsIntegration(this, 'ApplicationSignalsIntegration', {
      taskDefinition: taskDefinition,
      instrumentation: {
        sdkVersion: appsignals.JavaInstrumentationVersion.V2_10_0,
      },
      serviceName: 'world-service',
      cloudWatchAgentSidecar: {
        containerName: 'ecs-cwagent',
        enableLogging: true,
        cpu: 256,
        memoryLimitMiB: 512,
      }
    });

    // Create Fargate service
    const worldService = new ecs.FargateService(this, 'WorldService', {
      cluster: props.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [serviceSecurityGroup],
      minHealthyPercent: 0
    })

    return worldService
  }
}
