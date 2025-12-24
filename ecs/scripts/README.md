# Application Signals Setup Scripts

This directory contains scripts and configuration files for setting up AWS Application Signals with ECS.

## Files

- `ecs-cwagent.json` - CloudWatch agent configuration for Application Signals
- `setup-app-signals.sh` - Script to upload configuration to SSM Parameter Store

## Usage

1. Set your AWS region:

   ```bash
   export AWS_DEFAULT_REGION=your-region
   ```

2. Run the setup script:

   ```bash
   ./setup-app-signals.sh
   ```

This will upload the CloudWatch agent configuration to SSM Parameter Store with the name `ecs-cwagent`.

## Configuration Details

The CloudWatch agent configuration enables:
- Application Signals traces collection
- Application Signals metrics collection

This configuration will be used by the CloudWatch agent sidecar container in your ECS tasks.
