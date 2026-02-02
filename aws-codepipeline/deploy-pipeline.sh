#!/bin/bash

# Deploy Agni CRM CodePipeline to AWS
# This script deploys the CI/CD pipeline infrastructure using CloudFormation

set -e

echo "=========================================="
echo "Agni CRM - CodePipeline Deployment Script"
echo "=========================================="
echo ""

# Configuration
STACK_NAME="agni-crm-pipeline"
REGION="us-east-1"
TEMPLATE_FILE="codepipeline-template.yaml"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed. Please install it first."
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials are not configured."
    echo "Run: aws configure"
    exit 1
fi

echo "AWS Account:"
aws sts get-caller-identity --query 'Account' --output text
echo ""

# Prompt for parameters
read -p "GitHub Owner/Organization [innovation-grupo-uma]: " GITHUB_OWNER
GITHUB_OWNER=${GITHUB_OWNER:-innovation-grupo-uma}

read -p "GitHub Repository [twenty-uma]: " GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-twenty-uma}

read -p "GitHub Branch [main]: " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

read -sp "GitHub Personal Access Token (will not be echoed): " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GitHub token is required."
    exit 1
fi

read -p "Notification Email: " NOTIFICATION_EMAIL
if [ -z "$NOTIFICATION_EMAIL" ]; then
    echo "ERROR: Notification email is required."
    exit 1
fi

read -p "CodeBuild Compute Type [BUILD_GENERAL1_LARGE]: " COMPUTE_TYPE
COMPUTE_TYPE=${COMPUTE_TYPE:-BUILD_GENERAL1_LARGE}

read -p "AWS Region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "Configuration Summary:"
echo "----------------------"
echo "Stack Name: $STACK_NAME"
echo "Region: $AWS_REGION"
echo "GitHub: $GITHUB_OWNER/$GITHUB_REPO ($GITHUB_BRANCH)"
echo "Notification Email: $NOTIFICATION_EMAIL"
echo "Compute Type: $COMPUTE_TYPE"
echo ""

read -p "Proceed with deployment? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Step 1: Creating SSM Parameters..."
echo "-----------------------------------"

# Create PostgreSQL password parameter
read -sp "Enter PostgreSQL password for CI (or press Enter to use default): " PG_PASSWORD
echo ""
PG_PASSWORD=${PG_PASSWORD:-postgres}

aws ssm put-parameter \
    --name "/agni-crm/ci/postgres-password" \
    --value "$PG_PASSWORD" \
    --type "SecureString" \
    --description "PostgreSQL password for CI/CD" \
    --overwrite \
    --region $AWS_REGION \
    || echo "Warning: Failed to create PostgreSQL password parameter. It may already exist."

aws ssm put-parameter \
    --name "/agni-crm/ci/redis-url" \
    --value "redis://localhost:6379" \
    --type "String" \
    --description "Redis URL for CI/CD" \
    --overwrite \
    --region $AWS_REGION \
    || echo "Warning: Failed to create Redis URL parameter. It may already exist."

echo "✓ SSM Parameters created/updated"
echo ""

echo "Step 2: Validating CloudFormation Template..."
echo "----------------------------------------------"

aws cloudformation validate-template \
    --template-body file://$TEMPLATE_FILE \
    --region $AWS_REGION \
    > /dev/null

echo "✓ Template is valid"
echo ""

echo "Step 3: Deploying CloudFormation Stack..."
echo "------------------------------------------"

aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters \
        ParameterKey=GitHubOwner,ParameterValue=$GITHUB_OWNER \
        ParameterKey=GitHubRepo,ParameterValue=$GITHUB_REPO \
        ParameterKey=GitHubBranch,ParameterValue=$GITHUB_BRANCH \
        ParameterKey=GitHubToken,ParameterValue=$GITHUB_TOKEN \
        ParameterKey=BuildComputeType,ParameterValue=$COMPUTE_TYPE \
        ParameterKey=NotificationEmail,ParameterValue=$NOTIFICATION_EMAIL \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION

echo "✓ Stack creation initiated"
echo ""

echo "Step 4: Waiting for Stack Creation..."
echo "--------------------------------------"
echo "This may take 5-10 minutes. Please wait..."
echo ""

aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo "✓ Stack created successfully!"
    echo ""

    echo "Step 5: Retrieving Stack Outputs..."
    echo "------------------------------------"

    PIPELINE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
        --output text)

    ARTIFACT_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ArtifactBucketName`].OutputValue' \
        --output text)

    echo ""
    echo "=========================================="
    echo "Deployment Successful! 🎉"
    echo "=========================================="
    echo ""
    echo "Pipeline URL: $PIPELINE_URL"
    echo "Artifact Bucket: $ARTIFACT_BUCKET"
    echo ""
    echo "Next Steps:"
    echo "1. Check your email ($NOTIFICATION_EMAIL) and confirm SNS subscription"
    echo "2. Push a commit to $GITHUB_BRANCH branch to trigger the pipeline"
    echo "3. Monitor the pipeline at: $PIPELINE_URL"
    echo ""
    echo "To view logs:"
    echo "  aws logs tail /aws/codebuild/agni-crm-ci --follow"
    echo ""
    echo "To trigger the pipeline manually:"
    echo "  aws codepipeline start-pipeline-execution --name agni-crm-pipeline"
    echo ""
else
    echo "ERROR: Stack creation failed. Check CloudFormation console for details."
    echo ""
    echo "View stack events:"
    echo "  aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $AWS_REGION"
    exit 1
fi
