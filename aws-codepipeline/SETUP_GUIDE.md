# Quick Setup Guide - AWS CodePipeline for Agni CRM

This is a quick-start guide to get the CI/CD pipeline up and running in minutes.

## Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] GitHub Personal Access Token with `repo` and `admin:repo_hook` scopes
- [ ] Email address for notifications
- [ ] ~30 minutes for initial setup

## Option 1: Automated Setup (Recommended)

Use the provided deployment script:

```bash
cd aws-codepipeline
./deploy-pipeline.sh
```

Follow the prompts to enter:
- GitHub owner/repository/branch
- GitHub token
- Notification email
- Build compute type
- AWS region

The script will:
1. Create SSM parameters for secrets
2. Validate CloudFormation template
3. Deploy the stack
4. Wait for completion
5. Display the pipeline URL

**Time**: ~10 minutes

## Option 2: Manual Setup

### Step 1: Create SSM Parameters

```bash
aws ssm put-parameter \
  --name "/agni-crm/ci/postgres-password" \
  --value "postgres" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/agni-crm/ci/redis-url" \
  --value "redis://localhost:6379" \
  --type "String"
```

### Step 2: Deploy CloudFormation Stack

```bash
aws cloudformation create-stack \
  --stack-name agni-crm-pipeline \
  --template-body file://codepipeline-template.yaml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=YOUR_GITHUB_OWNER \
    ParameterKey=GitHubRepo,ParameterValue=YOUR_REPO \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=GitHubToken,ParameterValue=YOUR_GITHUB_TOKEN \
    ParameterKey=NotificationEmail,ParameterValue=YOUR_EMAIL \
    ParameterKey=BuildComputeType,ParameterValue=BUILD_GENERAL1_LARGE \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3: Wait for Completion

```bash
aws cloudformation wait stack-create-complete \
  --stack-name agni-crm-pipeline \
  --region us-east-1
```

### Step 4: Get Pipeline URL

```bash
aws cloudformation describe-stacks \
  --stack-name agni-crm-pipeline \
  --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
  --output text
```

**Time**: ~15 minutes

## Post-Setup Steps

### 1. Confirm SNS Subscription

Check your email and click the confirmation link to receive pipeline notifications.

### 2. Trigger First Build

Push a commit to the configured branch to trigger the pipeline:

```bash
git push origin main
```

Or trigger manually:

```bash
aws codepipeline start-pipeline-execution --name agni-crm-pipeline
```

### 3. Monitor the Build

View the pipeline:
```bash
# Open in browser (macOS/Linux)
open $(aws cloudformation describe-stacks \
  --stack-name agni-crm-pipeline \
  --query 'Stacks[0].Outputs[?OutputKey==`PipelineUrl`].OutputValue' \
  --output text)
```

View logs:
```bash
aws logs tail /aws/codebuild/agni-crm-ci --follow
```

## What the Pipeline Does

### Build Stage (~20-30 minutes)

✓ Installs dependencies (Yarn)
✓ Builds shared packages
✓ **Lints** backend and frontend
✓ **Type-checks** backend and frontend
✓ **Tests** backend and frontend (unit tests)
✓ **Builds** backend and frontend (production)
✓ Tests custom extensions
✓ Validates GraphQL schema
✓ Checks database migrations

### Integration Test Stage (~10-20 minutes)

✓ Starts PostgreSQL and Redis in Docker
✓ Runs backend integration tests with DB reset
✓ Tests custom extensions (when implemented)

### Manual Approval (Optional)

⏸️ Waits for manual approval before deployment

## Quick Commands Reference

```bash
# View pipeline status
aws codepipeline get-pipeline-state --name agni-crm-pipeline

# Start pipeline manually
aws codepipeline start-pipeline-execution --name agni-crm-pipeline

# View build logs (main CI)
aws logs tail /aws/codebuild/agni-crm-ci --follow

# View build logs (integration tests)
aws logs tail /aws/codebuild/agni-crm-integration-tests --follow

# List recent builds
aws codebuild list-builds-for-project \
  --project-name agni-crm-ci-build \
  --max-items 5

# Get build details
aws codebuild batch-get-builds --ids <build-id>
```

## Troubleshooting

### Pipeline not triggering on push

**Problem**: Push to GitHub doesn't start the pipeline

**Solution**: Verify webhook is registered
```bash
aws codepipeline list-webhooks
```

If missing, update the CloudFormation stack to recreate the webhook.

### Build fails with "Permission Denied"

**Problem**: Docker commands fail in integration tests

**Solution**: Ensure `PrivilegedMode: true` is set in CodeBuild project (already configured)

### Out of Memory Error

**Problem**: Build fails with OOM error

**Solution**: Increase compute type to `BUILD_GENERAL1_2XLARGE` or increase `NODE_OPTIONS`:

```bash
# Update compute type
aws codebuild update-project \
  --name agni-crm-ci-build \
  --environment type=LINUX_CONTAINER,computeType=BUILD_GENERAL1_2XLARGE,image=aws/codebuild/standard:7.0
```

### GraphQL Schema Validation Fails

**Problem**: "GraphQL schema changes detected"

**Solution**: Regenerate schema locally and commit:
```bash
npx nx run twenty-front:graphql:generate
npx nx run twenty-front:graphql:generate --configuration=metadata
git add packages/twenty-front/src/generated*
git commit -m "chore: update GraphQL schema"
git push
```

## Cost Estimate

Based on 10 builds per day (300 builds/month):

| Component | Cost/Build | Monthly |
|-----------|-----------|---------|
| CodeBuild (Large) | $0.50 | $150 |
| S3 Storage | $0.02 | $5 |
| CloudWatch Logs | $0.01 | $3 |
| **Total** | **$0.53** | **~$158** |

To reduce costs:
- Use `BUILD_GENERAL1_MEDIUM` for non-critical branches
- Enable aggressive caching (already configured)
- Reduce number of builds (use branch protection)

## Next Steps

After successful setup:

1. **Review Pipeline**: Visit the pipeline URL and verify all stages complete
2. **Configure Branch Protection**: Set up GitHub branch protection rules to require pipeline success
3. **Customize Notifications**: Add more SNS subscribers or integrate with Slack
4. **Add Deployment Stage**: Extend pipeline to deploy to ECS/EKS
5. **Set up Multiple Pipelines**: Create separate pipelines for staging and production branches

## Getting Help

- **AWS Console**: Check CodePipeline and CodeBuild consoles for visual status
- **CloudWatch Logs**: Detailed build logs are in CloudWatch
- **CloudFormation Events**: View stack events for infrastructure issues
- **Documentation**: See [README.md](README.md) for comprehensive guide

## Cleanup (if needed)

To delete the pipeline and all resources:

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name agni-crm-pipeline

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name agni-crm-pipeline

# Delete SSM parameters
aws ssm delete-parameter --name "/agni-crm/ci/postgres-password"
aws ssm delete-parameter --name "/agni-crm/ci/redis-url"

# Empty and delete S3 bucket (replace with actual bucket name)
aws s3 rm s3://agni-crm-pipeline-artifacts-123456789012 --recursive
aws s3 rb s3://agni-crm-pipeline-artifacts-123456789012
```

---

**Setup Time**: 10-15 minutes
**First Build Time**: 30-50 minutes
**Subsequent Builds**: 20-30 minutes (with cache)

For detailed documentation, see [README.md](README.md)
