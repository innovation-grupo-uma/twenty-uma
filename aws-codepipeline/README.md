# AWS CodePipeline CI/CD for Agni CRM

This directory contains the AWS CodePipeline configuration for the Agni CRM project, replacing GitHub Actions with a fully AWS-native CI/CD solution.

## Overview

The CI/CD pipeline consists of:

1. **Source Stage**: Pulls code from GitHub repository
2. **Build Stage**: Runs linting, type-checking, unit tests, and builds
3. **Integration Tests Stage**: Runs backend integration tests with database
4. **Manual Approval Stage**: (Optional) Manual approval before production deployment

## Architecture

```
GitHub (webhook)
    ↓
CodePipeline
    ├─ Source: GitHub
    ├─ Build: CodeBuild (Main CI)
    │   ├─ Lint (backend + frontend + extensions)
    │   ├─ Typecheck (backend + frontend + extensions)
    │   ├─ Unit Tests (backend + frontend + extensions)
    │   ├─ Build (backend + frontend)
    │   ├─ GraphQL Schema Validation
    │   └─ Database Migration Check
    ├─ Test: CodeBuild (Integration Tests)
    │   └─ Integration Tests (with PostgreSQL + Redis)
    └─ Approval: Manual (optional)

Artifacts stored in S3
Notifications via SNS → Email
Logs in CloudWatch
```

## Files

- **`buildspec.yml`**: Main CI buildspec for linting, testing, and building
- **`buildspec-integration-tests.yml`**: Integration tests with database setup
- **`codepipeline-template.yaml`**: CloudFormation template for pipeline infrastructure
- **`README.md`**: This documentation file

## Prerequisites

Before deploying the pipeline, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured (`aws configure`)
3. **GitHub Personal Access Token** with `repo` and `admin:repo_hook` permissions
4. **Email address** for pipeline notifications
5. **S3 bucket naming** considerations (must be globally unique)

## Setup Instructions

### Step 1: Store Secrets in AWS Systems Manager Parameter Store

Create the following parameters in AWS Systems Manager Parameter Store:

```bash
# PostgreSQL password for CI tests
aws ssm put-parameter \
  --name "/agni-crm/ci/postgres-password" \
  --value "your-secure-postgres-password" \
  --type "SecureString" \
  --description "PostgreSQL password for CI/CD"

# Redis URL for CI tests (optional, can use default)
aws ssm put-parameter \
  --name "/agni-crm/ci/redis-url" \
  --value "redis://localhost:6379" \
  --type "String" \
  --description "Redis URL for CI/CD"
```

### Step 2: Deploy the CloudFormation Stack

Deploy the pipeline infrastructure using CloudFormation:

```bash
aws cloudformation create-stack \
  --stack-name agni-crm-pipeline \
  --template-body file://codepipeline-template.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=innovation-grupo-uma \
    ParameterKey=GitHubRepo,ParameterValue=twenty-uma \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=GitHubToken,ParameterValue=ghp_your_github_token_here \
    ParameterKey=BuildComputeType,ParameterValue=BUILD_GENERAL1_LARGE \
    ParameterKey=NotificationEmail,ParameterValue=dev-team@agnicrm.com \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Important**: Replace the parameter values with your actual values.

### Step 3: Verify Stack Creation

Monitor the stack creation:

```bash
aws cloudformation describe-stacks \
  --stack-name agni-crm-pipeline \
  --query 'Stacks[0].StackStatus'
```

Wait until status is `CREATE_COMPLETE`.

### Step 4: Confirm SNS Subscription

Check your email for an SNS subscription confirmation and click the link to activate notifications.

### Step 5: Trigger the Pipeline

The pipeline will automatically trigger on push to the configured branch (`agni-dev`). You can also manually trigger it:

```bash
aws codepipeline start-pipeline-execution \
  --name agni-crm-pipeline
```

## Pipeline Stages Explained

### 1. Source Stage

- **Provider**: GitHub
- **Trigger**: Webhook on push to `agni-dev` branch
- **Output**: Source code artifact

### 2. Build Stage (Main CI)

**Compute**: `BUILD_GENERAL1_LARGE` (8 vCPUs, 15 GB RAM)

**Duration**: ~15-30 minutes

**Steps**:
1. Install dependencies (Yarn)
2. Build shared packages (`twenty-shared`, `twenty-ui`)
3. **Backend Linting & Typecheck**: All backend packages
4. **Frontend Linting & Typecheck**: All frontend packages
5. **Backend Unit Tests**: All backend packages
6. **Frontend Unit Tests**: `twenty-front` with coverage
7. **Backend Build**: `twenty-server`, `twenty-emails`
8. **Frontend Build**: `twenty-front` (production build)
9. **Extension Tests**: Custom extension tests (when implemented)
10. **GraphQL Validation**: Ensures schema is up-to-date
11. **Migration Check**: Ensures no pending migrations

**Artifacts**: Built backend, frontend, and shared packages

**Cache**: Node modules, Yarn cache, Nx cache

### 3. Integration Tests Stage

**Compute**: `BUILD_GENERAL1_LARGE` (8 vCPUs, 15 GB RAM)

**Duration**: ~10-20 minutes

**Steps**:
1. Start PostgreSQL in Docker
2. Start Redis in Docker
3. Build dependencies
4. Create test database
5. Run backend integration tests with database reset
6. Run extension integration tests (when implemented)

**Services**:
- PostgreSQL (twentycrm/twenty-postgres-spilo)
- Redis 7

**Artifacts**: Test coverage reports

### 4. Manual Approval Stage

- **Optional**: Can be removed for continuous deployment
- **Notification**: Email sent to configured address
- **Action**: Approve or reject deployment

## Monitoring and Logs

### CloudWatch Logs

All build logs are available in CloudWatch:

```bash
# View main CI build logs
aws logs tail /aws/codebuild/agni-crm-ci --follow

# View integration test logs
aws logs tail /aws/codebuild/agni-crm-integration-tests --follow
```

### Pipeline Status

Check pipeline execution status:

```bash
aws codepipeline get-pipeline-state --name agni-crm-pipeline
```

### Build History

View build history for a CodeBuild project:

```bash
aws codebuild list-builds-for-project \
  --project-name agni-crm-ci-build \
  --max-items 10
```

### CloudWatch Alarms

Two alarms are configured:
1. **Pipeline Failure Alarm**: Triggers on pipeline execution failure
2. **Build Failure Alarm**: Triggers on CodeBuild failure

View alarms:

```bash
aws cloudwatch describe-alarms --alarm-names \
  agni-crm-pipeline-failure \
  agni-crm-build-failure
```

## Cost Optimization

### Estimated Costs

Based on typical usage (10 builds per day):

| Service | Cost per Build | Monthly Cost |
|---------|---------------|--------------|
| CodeBuild (Large) | ~$0.50 | ~$150 |
| S3 (Artifacts) | ~$0.02 | ~$5 |
| CloudWatch Logs | ~$0.01 | ~$3 |
| **Total** | **~$0.53** | **~$158/month** |

### Cost Optimization Tips

1. **Use Smaller Compute Types for Branches**: Use `BUILD_GENERAL1_MEDIUM` for feature branches
2. **Enable Artifact Lifecycle**: Old artifacts are automatically deleted after 30 days
3. **Use Nx Cache**: Speeds up builds and reduces compute time
4. **Cache Node Modules**: Reduces dependency installation time

### Switch to Smaller Compute Type

For feature branches or less critical builds:

```bash
aws codebuild update-project \
  --name agni-crm-ci-build \
  --environment type=LINUX_CONTAINER,computeType=BUILD_GENERAL1_MEDIUM,image=aws/codebuild/standard:7.0
```

## Troubleshooting

### Build Fails: Out of Memory

**Issue**: Build runs out of memory during frontend build

**Solution**: Increase `NODE_OPTIONS` in buildspec:

```yaml
NODE_OPTIONS: "--max-old-space-size=12288"  # 12GB
```

Or upgrade to `BUILD_GENERAL1_2XLARGE`:

```bash
aws codebuild update-project \
  --name agni-crm-ci-build \
  --environment type=LINUX_CONTAINER,computeType=BUILD_GENERAL1_2XLARGE,image=aws/codebuild/standard:7.0
```

### Build Fails: Docker Permission Denied

**Issue**: Integration tests fail with Docker permission errors

**Solution**: Ensure `PrivilegedMode: true` is set in CodeBuild project (already configured in template)

### Pipeline Not Triggering on Push

**Issue**: Push to GitHub doesn't trigger pipeline

**Solution**: Verify webhook is registered:

```bash
aws codepipeline list-webhooks
```

If webhook is missing, recreate it by updating the CloudFormation stack.

### Slow Dependency Installation

**Issue**: `yarn install` takes too long

**Solution**: Ensure cache is working:

1. Check S3 cache location: `s3://agni-crm-pipeline-artifacts-{account-id}/build-cache`
2. Verify cache is being saved in buildspec
3. Check CodeBuild project cache settings

### GraphQL Schema Validation Fails

**Issue**: Pipeline fails with "GraphQL schema changes detected"

**Solution**: Regenerate GraphQL schema locally and commit:

```bash
npx nx run twenty-front:graphql:generate
npx nx run twenty-front:graphql:generate --configuration=metadata
git add packages/twenty-front/src/generated*
git commit -m "chore: update GraphQL schema"
git push
```

### Integration Tests Timeout

**Issue**: Integration tests time out waiting for database

**Solution**: Increase timeout in buildspec:

```yaml
# In buildspec-integration-tests.yml
- |
  for i in {1..60}; do  # Increase from 30 to 60
    if docker exec postgres-test pg_isready -U postgres; then
      echo "PostgreSQL is ready!"
      break
    fi
    sleep 2
  done
```

## Updating the Pipeline

### Update Buildspec Only

If you only need to change the build commands:

1. Edit `buildspec.yml` or `buildspec-integration-tests.yml`
2. Commit and push changes
3. Pipeline will automatically use the updated buildspec on next run

### Update Pipeline Infrastructure

If you need to change pipeline structure, IAM roles, or other infrastructure:

1. Edit `codepipeline-template.yaml`
2. Update the CloudFormation stack:

```bash
aws cloudformation update-stack \
  --stack-name agni-crm-pipeline \
  --template-body file://codepipeline-template.yaml \
  --parameters \
    ParameterKey=GitHubOwner,UsePreviousValue=true \
    ParameterKey=GitHubRepo,UsePreviousValue=true \
    ParameterKey=GitHubBranch,UsePreviousValue=true \
    ParameterKey=GitHubToken,UsePreviousValue=true \
    ParameterKey=BuildComputeType,UsePreviousValue=true \
    ParameterKey=NotificationEmail,UsePreviousValue=true \
  --capabilities CAPABILITY_NAMED_IAM
```

## Integration with Existing Workflows

### Comparison: GitHub Actions vs CodePipeline

| Feature | GitHub Actions | CodePipeline |
|---------|---------------|--------------|
| **Trigger** | GitHub webhooks | GitHub webhooks |
| **Compute** | GitHub-hosted runners | AWS CodeBuild |
| **Caching** | GitHub cache | S3 + CodeBuild cache |
| **Logs** | GitHub UI | CloudWatch Logs |
| **Notifications** | GitHub | SNS + Email |
| **Cost (10 builds/day)** | ~$100/month | ~$158/month |
| **AWS Integration** | Limited | Native |

### Migrating from GitHub Actions

The CodePipeline configuration replicates the functionality of Twenty's GitHub Actions workflows:

- **`ci-front.yaml`** → `buildspec.yml` (frontend tasks)
- **`ci-server.yaml`** → `buildspec.yml` (backend tasks)
- **Integration tests** → `buildspec-integration-tests.yml`

## Advanced Configuration

### Add E2E Tests Stage

To add a stage for E2E tests with Playwright:

1. Create `buildspec-e2e-tests.yml` (similar to integration tests)
2. Add stage to `codepipeline-template.yaml`:

```yaml
- Name: E2ETests
  Actions:
    - Name: E2E-Tests
      ActionTypeId:
        Category: Build
        Owner: AWS
        Provider: CodeBuild
        Version: '1'
      Configuration:
        ProjectName: !Ref CodeBuildE2ETests
      InputArtifacts:
        - Name: SourceOutput
```

### Add Deployment Stage

To deploy to ECS/EKS after successful build:

1. Add a Deploy stage after Approval
2. Use CodeDeploy or CloudFormation action
3. Deploy artifacts from Build stage

### Branch-Specific Pipelines

Create separate pipelines for different branches:

```bash
# Pipeline for staging branch
aws cloudformation create-stack \
  --stack-name agni-crm-pipeline-staging \
  --template-body file://codepipeline-template.yaml \
  --parameters \
    ParameterKey=GitHubBranch,ParameterValue=staging \
    ...
```

## Security Best Practices

1. **Use Secrets Manager for GitHub Token**: Instead of passing token directly, store in Secrets Manager
2. **Enable S3 Bucket Encryption**: Already configured in template (AES256)
3. **Restrict IAM Roles**: Follow principle of least privilege
4. **Enable CloudTrail**: Audit all CodePipeline and CodeBuild actions
5. **Use VPC for CodeBuild**: For production, run CodeBuild in VPC with private subnets

## Related Documentation

- [AGNI_CUSTOMIZATIONS.md](../AGNI_CUSTOMIZATIONS.md) - Fork maintenance guidelines
- [Technical Specification](_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- [Extension READMEs](../agni-extensions/)

## Support

For issues with the CI/CD pipeline:
1. Check CloudWatch Logs for build errors
2. Review CloudWatch Alarms for pipeline/build failures
3. Contact the Agni CRM DevOps team

---

**Last Updated**: 2026-01-26
**Version**: 1.0.0
**Maintained By**: Agni CRM DevOps Team
