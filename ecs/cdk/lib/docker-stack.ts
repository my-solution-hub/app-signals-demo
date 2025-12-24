import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'

export class DockerStack extends cdk.Stack {
  appRepoSsmName: string
  worldRepoSsmName: string
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    const stackName = `${id}-docker`
    super(scope, stackName, props)
    
    this.appRepoSsmName = `/${id}/appRepositoryName`
    this.worldRepoSsmName = `/${id}/worldRepositoryName`
    
    // Create ECR Repository for hello app
    const appRepository = new ecr.Repository(this, 'appRepository', {
      repositoryName: `${id}-app`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // Create ECR Repository for world app
    const worldRepository = new ecr.Repository(this, 'worldRepository', {
      repositoryName: `${id}-world-app`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // store the repository names in SSM Parameter Store
    new cdk.aws_ssm.StringParameter(this, 'appRepositoryName', {
      parameterName: this.appRepoSsmName,
      stringValue: appRepository.repositoryName,
      description: 'The app repository name',
      tier: cdk.aws_ssm.ParameterTier.STANDARD
    })

    new cdk.aws_ssm.StringParameter(this, 'worldRepositoryName', {
      parameterName: this.worldRepoSsmName,
      stringValue: worldRepository.repositoryName,
      description: 'The world app repository name',
      tier: cdk.aws_ssm.ParameterTier.STANDARD
    })
    
    // Output the ECR Repository URIs
    new cdk.CfnOutput(this, 'appRepositoryURI', {
      value: appRepository.repositoryUri,
      description: 'The app URI of the ECR repository'
    })

    new cdk.CfnOutput(this, 'worldRepositoryURI', {
      value: worldRepository.repositoryUri,
      description: 'The world app URI of the ECR repository'
    })
  }
}
