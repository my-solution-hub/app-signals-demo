#!/bin/bash

function label() {
  echo
  echo "--------------------------------------"
  echo ":: $1"
  echo "--------------------------------------"
  echo
}

cd "$(dirname "$0")"
export PROJECT_NAME="appsignals-ecs-demo-app"

mvn clean install

platform=${DOCKER_PLATFORM:-amd64}
export ACCOUNT=$(aws sts get-caller-identity | jq .Account -r)
export ECR_URL=${ACCOUNT}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

label "Login to ECR"
aws ecr get-login-password --region "${AWS_DEFAULT_REGION}" | docker login --username AWS --password-stdin "$ECR_URL"

label "Build and push Docker image"
docker build --build-arg PLATFORM=$platform -t "$ECR_URL/$PROJECT_NAME":latest -f ./Dockerfile .
docker push "$ECR_URL/$PROJECT_NAME":latest
