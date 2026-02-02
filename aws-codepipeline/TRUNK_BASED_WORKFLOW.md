# Trunk-Based Development Workflow with CodePipeline

This document explains how the AWS CodePipeline integrates with your trunk-based development workflow.

## Overview

**Trunk-Based Development** means:
- ✅ One main branch: `main`
- ✅ Short-lived feature branches (1-2 days)
- ✅ Frequent integration to main (multiple times per day)
- ✅ No long-lived development branches
- ✅ CI/CD runs on every commit to main

## Pipeline Trigger Strategy

### Current Configuration

The pipeline is configured to trigger on **every push to `main`**:

```yaml
# From codepipeline-template.yaml
Filters:
  - JsonPath: "$.ref"
    MatchEquals: 'refs/heads/main'
```

### When Pipeline Runs

**✅ Pipeline WILL run when:**
1. You merge a feature branch into `main`
2. You push a hotfix directly to `main`
3. You merge a pull request into `main`
4. You manually trigger the pipeline

**❌ Pipeline will NOT run when:**
1. You create a feature branch
2. You push commits to a feature branch
3. You open a pull request (before merge)

## Typical Workflow

### Development Flow

```
1. Create feature branch from main
   git checkout -b feature/add-validation-rule

2. Make changes and commit
   git add .
   git commit -m "feat: add phone validation rule"

3. Push feature branch
   git push origin feature/add-validation-rule
   # ❌ Pipeline does NOT run yet

4. Open pull request
   # ❌ Pipeline does NOT run yet

5. Review and merge PR to main
   gh pr merge --squash
   # ✅ Pipeline RUNS automatically!

6. Pipeline runs on main:
   - Lints code
   - Runs type checking
   - Runs unit tests
   - Runs integration tests
   - Builds artifacts
   - (Optional) Manual approval
```

### Timeline After Merge

```
Merge to main
  ↓ (5 seconds)
GitHub webhook triggers CodePipeline
  ↓ (10 seconds)
Source stage: Download code from main
  ↓ (2 minutes)
Build stage: Install dependencies, build shared packages
  ↓ (15-25 minutes)
Build stage: Lint, typecheck, test, build
  ↓ (10-15 minutes)
Integration Test stage: Run integration tests
  ↓ (5 minutes)
Manual Approval stage (optional)
  ↓ (when approved)
Deploy stage (if configured)
```

**Total time**: 30-50 minutes from merge to deployment-ready

## Branch Protection Strategy

To ensure code quality with trunk-based development, configure GitHub branch protection on `main`:

### Recommended Rules

```bash
# Using GitHub CLI
gh api repos/innovation-grupo-uma/twenty-uma/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=false \
  --field required_linear_history=true \
  --field allow_force_pushes=false
```

### Recommended Protection Rules:

1. **Require pull request reviews** (1 approval minimum)
2. **Require status checks to pass** (optional: wait for pipeline on feature branch)
3. **No force pushes** to main
4. **Linear history** (squash or rebase merges only)
5. **No direct pushes** to main (except for emergencies)

## Optional: CI on Feature Branches

If you want to run CI checks on feature branches **before** merging to main, you have two options:

### Option 1: GitHub Actions for Feature Branches (Lightweight)

Keep CodePipeline for `main` (deployment pipeline), but add a lightweight GitHub Action for feature branches:

**`.github/workflows/feature-branch-ci.yaml`**:
```yaml
name: Feature Branch CI
on:
  pull_request:
    branches: [main]

jobs:
  quick-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: yarn install
      - name: Lint
        run: npx nx run-many --target=lint --all --parallel=3
      - name: Typecheck
        run: npx nx run-many --target=typecheck --all --parallel=3
      - name: Unit tests
        run: npx nx run-many --target=test --all --parallel=2
```

**Benefits:**
- Fast feedback on PRs (10-15 minutes)
- Catches issues before merge
- Free for public repos
- CodePipeline only runs on main (more important, deployment-focused)

### Option 2: Multiple CodePipelines

Create a separate CodePipeline that triggers on **all branches**:

**Deployment:**
```bash
# Create PR pipeline (triggers on all branches)
aws cloudformation create-stack \
  --stack-name agni-crm-pipeline-pr \
  --template-body file://codepipeline-template-pr.yaml \
  --parameters \
    ParameterKey=TriggerOnAllBranches,ParameterValue=true \
  --capabilities CAPABILITY_NAMED_IAM
```

**Downside:** Higher costs (~$300/month instead of ~$158/month)

## Recommended: Hybrid Approach

For trunk-based development, we recommend:

1. **GitHub Actions**: Lightweight checks on pull requests
   - Linting
   - Type checking
   - Unit tests
   - Fast feedback (10-15 minutes)
   - Cost: Free (public repo) or ~$30/month (private repo)

2. **AWS CodePipeline**: Full pipeline on `main` (current setup)
   - All tests (unit + integration)
   - Build artifacts
   - Deploy to staging/production
   - Complete validation (30-50 minutes)
   - Cost: ~$158/month

**Total monthly cost:** ~$160-190/month (instead of $300+ for dual CodePipelines)

## Hotfix Workflow

For urgent production fixes:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
git add .
git commit -m "fix: resolve critical production bug"

# 3. Push and create PR
git push origin hotfix/critical-bug
gh pr create --title "Hotfix: Critical bug" --body "Fixes production issue"

# 4. Request expedited review
# Get 1 approval quickly

# 5. Merge to main
gh pr merge --squash
# ✅ Pipeline runs automatically

# 6. Monitor pipeline
aws codepipeline get-pipeline-state --name agni-crm-pipeline

# 7. If urgent, skip manual approval or approve immediately
# Pipeline deploys to production
```

## Feature Flags for Trunk-Based Development

Since you're merging incomplete features to main, consider using feature flags:

```typescript
// Example: Feature flag for new validation engine
if (featureFlags.isEnabled('validation-engine-v2')) {
  // New code path
  return validationEngineV2.validate(data);
} else {
  // Old code path
  return validationEngineV1.validate(data);
}
```

**Benefits:**
- Merge incomplete features to main safely
- Enable features for specific workspaces/users
- Gradual rollout
- Easy rollback

**Tools:**
- LaunchDarkly
- Unleash (open source)
- AWS AppConfig (native AWS)
- Custom solution

## Monitoring and Alerts

### Pipeline Health Dashboard

Monitor your trunk-based workflow:

```bash
# View recent pipeline executions
aws codepipeline list-pipeline-executions \
  --pipeline-name agni-crm-pipeline \
  --max-items 10

# Check pipeline success rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodePipeline \
  --metric-name PipelineExecutionSuccess \
  --dimensions Name=PipelineName,Value=agni-crm-pipeline \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

### Recommended Alerts

Set up alerts for:
1. **Pipeline failure** (already configured)
2. **Pipeline duration exceeds 60 minutes** (performance issue)
3. **Multiple failures in 24 hours** (code quality issue)
4. **Manual approval pending > 4 hours** (bottleneck)

## Best Practices for Trunk-Based Development

1. **Commit Frequently**
   - Multiple commits per day to main
   - Small, atomic changes
   - Each commit should be deployable

2. **Fast Pipeline**
   - Keep total time under 60 minutes
   - Optimize caching (already configured)
   - Run expensive tests in parallel

3. **Immediate Rollback**
   - If pipeline fails, fix forward or revert immediately
   - Don't let main stay broken

4. **Feature Flags**
   - Use flags for incomplete features
   - Deploy code, enable features later

5. **Branch Cleanup**
   - Delete feature branches after merge
   - Keep only main branch long-term

```bash
# Auto-delete feature branches after merge
gh pr merge --delete-branch
```

## Comparing Strategies

| Aspect | Current (Main Only) | With PR Checks | Dual Pipelines |
|--------|-------------------|----------------|----------------|
| **Feedback on PRs** | No | Yes (fast) | Yes (slow) |
| **Cost** | ~$158/month | ~$190/month | ~$300/month |
| **Main branch protection** | High | Very High | Very High |
| **Build time (PR)** | N/A | 10-15 min | 30-50 min |
| **Build time (Main)** | 30-50 min | 30-50 min | 30-50 min |
| **Complexity** | Low | Medium | High |
| **Recommended for** | Experienced teams | Most teams | Large teams |

## Current Setup Summary

**What you have now:**
- ✅ Pipeline triggers on push to `main`
- ✅ Full CI/CD on main (lint, test, build)
- ✅ Integration tests with database
- ✅ Manual approval before deployment
- ✅ Notifications on failure
- ✅ Perfect for trunk-based development

**What's NOT included:**
- ❌ CI checks on feature branches / pull requests
- ❌ Feature flags system
- ❌ Automated deployment (you have manual approval)

**Next steps (optional):**
1. Add lightweight GitHub Actions for PR checks
2. Implement feature flags for incomplete features
3. Configure branch protection on main
4. Set up automated deployment after approval

---

**Your workflow is ready!** The pipeline will run automatically every time you merge to `main`, ensuring continuous integration and deployment readiness for your trunk-based development strategy.
