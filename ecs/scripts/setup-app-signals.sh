#!/bin/bash

# Setup Application Signals CloudWatch Agent Configuration
# This script uploads the CloudWatch agent configuration to SSM Parameter Store

set -e

REGION=${AWS_DEFAULT_REGION:-us-east-1}
CONFIG_FILE="$(dirname "$0")/ecs-cwagent.json"

echo "Setting up Application Signals CloudWatch Agent configuration..."
echo "Region: $REGION"
echo "Config file: $CONFIG_FILE"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file $CONFIG_FILE not found"
    exit 1
fi

# Upload configuration to SSM Parameter Store
aws ssm put-parameter \
    --name "ecs-cwagent" \
    --type "String" \
    --value "$(cat "$CONFIG_FILE")" \
    --region "$REGION" \
    --no-cli-pager \
    --overwrite

echo "✅ CloudWatch agent configuration uploaded to SSM Parameter Store"
echo "Parameter name: ecs-cwagent"
echo "Region: $REGION"
