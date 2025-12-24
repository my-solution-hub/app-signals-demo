#!/bin/bash

# Test script for hello and world services
set -e

STACK_NAME=${STACK_NAME:-appsignals-ecs-demo}
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "Testing ECS services..."
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo

# Get ALB DNS name for world service
echo "Getting world service ALB endpoint..."
WORLD_ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-app" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorldALBDNS`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$WORLD_ALB_DNS" ]; then
    echo "❌ Could not find world service ALB DNS name"
    echo "Make sure the app stack is deployed and has WorldALBDNS output"
else
    echo "World service ALB: http://$WORLD_ALB_DNS"
    echo "Testing world service..."
    
    if curl -s --max-time 10 "http://$WORLD_ALB_DNS" > /dev/null; then
        WORLD_RESPONSE=$(curl -s "http://$WORLD_ALB_DNS")
        echo "✅ World service response: $WORLD_RESPONSE"
    else
        echo "❌ World service not responding"
    fi
fi

echo

# Get hello service public IP (if using public subnets)
echo "Getting hello service task public IP..."
CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-infra" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
    --output text 2>/dev/null || echo "appsignals-demo")

HELLO_TASK_ARN=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --region "$REGION" \
    --query 'taskArns[0]' \
    --output text 2>/dev/null || echo "")

if [ "$HELLO_TASK_ARN" != "None" ] && [ -n "$HELLO_TASK_ARN" ]; then
    HELLO_PUBLIC_IP=$(aws ecs describe-tasks \
        --cluster "$CLUSTER_NAME" \
        --tasks "$HELLO_TASK_ARN" \
        --region "$REGION" \
        --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
        --output text | xargs -I {} aws ec2 describe-network-interfaces \
        --network-interface-ids {} \
        --region "$REGION" \
        --query 'NetworkInterfaces[0].Association.PublicIp' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$HELLO_PUBLIC_IP" ] && [ "$HELLO_PUBLIC_IP" != "None" ]; then
        echo "Hello service: http://$HELLO_PUBLIC_IP:8080"
        echo "Testing hello service..."
        
        if curl -s --max-time 10 "http://$HELLO_PUBLIC_IP:8080" > /dev/null; then
            HELLO_RESPONSE=$(curl -s "http://$HELLO_PUBLIC_IP:8080")
            echo "✅ Hello service response: $HELLO_RESPONSE"
        else
            echo "❌ Hello service not responding"
        fi
    else
        echo "❌ Could not get hello service public IP"
    fi
else
    echo "❌ Could not find hello service task"
fi

echo
echo "Service testing complete!"
