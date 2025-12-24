# Application Signals Demo for ECS

This demo shows how to set up AWS Application Signals with ECS Fargate to trace service-to-service calls between a hello service and world service.

## Architecture

- **Hello Service**: Spring Boot app that calls the world service
- **World Service**: Spring Boot app that returns "World"
- **Application Load Balancer**: Exposes world service for hello service to call
- **Application Signals**: Traces the hello → world service calls

## Prerequisites

- AWS CLI configured
- Docker installed
- Node.js and CDK installed
- Java 17 and Maven

## Setup

### 1. Deploy Infrastructure

```shell
export STACK_NAME=appsignals-ecs-demo
export AWS_DEFAULT_REGION=your-region

cd cdk

# Deploy ECR repositories
cdk deploy ${STACK_NAME}-docker --require-approval never

# Deploy VPC and ECS cluster
cdk deploy ${STACK_NAME}-infra --require-approval never
```

### 2. Setup Application Signals Configuration

```shell
cd ../scripts
./setup-app-signals.sh
```

### 3. Build and Push Applications

```shell
cd ../app/hello
./build.sh

cd ../world
./build.sh
```

### 4. Deploy Applications

```shell
cd ../../cdk
cdk deploy ${STACK_NAME}-app --require-approval never
```

### 5. Enable Application Signals

1. Go to AWS Console → CloudWatch → Application Signals
2. Enable Application Signals for your region
3. Configure service discovery for ECS

## Testing

Once deployed, the hello service will call the world service through the ALB. You can view the service map and traces in the CloudWatch Application Signals console.

## Clean up

```shell
cd cdk
cdk destroy --all --force
```

## Directory Structure

```
ecs/
├── app/
│   ├── hello/          # Hello Spring Boot service
│   └── world/          # World Spring Boot service
├── cdk/
│   ├── lib/
│   │   ├── docker-stack.ts    # ECR repositories
│   │   ├── infra-stack.ts     # VPC, ECS cluster
│   │   └── app-stack.ts       # ECS services, ALB
│   └── bin/cdk.ts
├── scripts/
│   ├── ecs-cwagent.json       # CloudWatch agent config
│   └── setup-app-signals.sh  # Setup script
└── README.md
```
