# Agni CRM Customizations

This document tracks all customizations made to the Twenty CRM codebase for the Agni CRM project. It serves as a reference for understanding what has been modified from the upstream Twenty CRM repository and helps maintain the fork during upstream updates.

## Table of Contents

- [Custom Extensions](#custom-extensions)
- [Core Modifications](#core-modifications)
- [Compatibility Information](#compatibility-information)
- [Maintenance Guidelines](#maintenance-guidelines)
- [Update History](#update-history)

---

## Custom Extensions

Custom extensions are isolated in the `agni-extensions/` directory to minimize conflicts with upstream updates.

### 1. Dependent Fields Extension
**Location:** `agni-extensions/dependent-fields/`

**Purpose:** Implements dependent picklists and conditional field visibility, allowing fields to dynamically filter options or show/hide based on controlling field values.

**Key Features:**
- Controlling-dependent field relationships (e.g., Country → State → City)
- Conditional field visibility rules
- Multi-tenant support (per workspace configuration)
- Redis caching for performance

**Status:** ⚠️ Not yet implemented

**Documentation:** See [README](agni-extensions/dependent-fields/README.md)

### 2. Validation Engine Extension
**Location:** `agni-extensions/validation-engine/`

**Purpose:** Provides a configurable custom validation rules engine for conditional validations, format validations, and context-aware validations.

**Key Features:**
- Conditional required fields (if-then logic)
- Format validations (regex, length constraints)
- Cross-field validations
- Context-aware validations (e.g., phone number format by country)
- Error and warning severity levels

**Status:** ⚠️ Not yet implemented

**Documentation:** See [README](agni-extensions/validation-engine/README.md)

### 3. Row-Level Security Extension
**Location:** `agni-extensions/row-level-security/`

**Purpose:** Implements policy-based row-level security for fine-grained access control at the record level.

**Key Features:**
- Policy-based access control (similar to AWS IAM)
- Query-level filtering (not post-fetch)
- Priority-based rule evaluation
- Effect composition (deny overrides allow)
- Performance optimized with aggressive caching

**Status:** ⚠️ Not yet implemented

**Documentation:** See [README](agni-extensions/row-level-security/README.md)

---

## Core Modifications

This section documents all direct modifications to Twenty's core packages (`packages/twenty-server` and `packages/twenty-front`). Each modification should include:
- File path
- Reason for modification
- Description of changes
- Integration points with custom extensions
- Risk level for upstream conflicts

### Backend Modifications (twenty-server)

#### 1. Field Metadata Resolver - Dependent Fields Integration
**File:** `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.resolver.ts`

**Status:** ⚠️ Not yet modified

**Reason:** Integrate dependent fields evaluation into field metadata queries

**Changes:** *(To be documented when implemented)*
- Inject `DependentFieldEvaluatorService`
- Modify `findMany` query to filter field options based on dependent field rules
- Add `isVisible` flag to field metadata based on visibility rules

**Risk Level:** 🟡 Medium - This file may be updated in upstream releases

**Integration Point:** `agni-extensions/dependent-fields/backend/dependent-field-evaluator.service.ts`

**Testing:** Unit tests in `agni-extensions/dependent-fields/tests/`

---

#### 2. GraphQL Query Runner - RLS Query Filtering
**File:** `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/graphql-query-runner.service.ts`

**Status:** ⚠️ Not yet modified

**Reason:** Inject row-level security filtering into all GraphQL queries

**Changes:** *(To be documented when implemented)*
- Inject `RLSEngineService` into query runner
- Modify `findMany` to apply RLS WHERE clause filters
- Modify `findOne` to apply RLS WHERE clause filters
- Add RLS evaluation before `updateOne` and `deleteOne` mutations
- Throw `NotFoundError` (not `ForbiddenException`) to prevent information disclosure

**Risk Level:** 🔴 High - This is a core file that affects ALL database queries. High probability of conflicts on upstream updates.

**Integration Point:** `agni-extensions/row-level-security/backend/rls-engine.service.ts`

**Testing:** Integration and E2E tests in `agni-extensions/row-level-security/tests/`

**⚠️ CRITICAL:** This modification is the most invasive change in the entire Agni fork. Extreme care must be taken when merging upstream updates.

---

#### 3. GraphQL Mutation Interceptor - Validation Engine
**File:** `packages/twenty-server/src/engine/core-modules/graphql/graphql-query-runner/` (new interceptor file)

**Status:** ⚠️ Not yet created

**Reason:** Execute validation rules before all mutations

**Changes:** *(To be documented when implemented)*
- Create new NestJS interceptor: `validation-engine.interceptor.ts`
- Intercept `createOne`, `updateOne`, `createMany`, `updateMany` mutations
- Execute `ValidationEngineService.validateRecord()` before database writes
- Throw GraphQL exception with validation errors if validation fails
- Include warnings in response metadata for non-blocking validations

**Risk Level:** 🟡 Medium - New file, but integrates into GraphQL pipeline

**Integration Point:** `agni-extensions/validation-engine/backend/validation-engine.service.ts`

**Testing:** Integration tests in `agni-extensions/validation-engine/tests/`

---

### Frontend Modifications (twenty-front)

#### 4. Field Input Component - Dependent Fields UI
**File:** `packages/twenty-front/src/modules/ui/field/input/components/FieldInput.tsx`

**Status:** ⚠️ Not yet modified

**Reason:** Apply dependent field rules in form inputs

**Changes:** *(To be documented when implemented)*
- Import and use `useDependentFields` hook
- Filter SELECT field options based on dependent field rules
- Apply visibility rules (show/hide fields conditionally)
- Add loading state during rule evaluation
- Implement graceful degradation on evaluation errors

**Risk Level:** 🟡 Medium - Core UI component, may have upstream changes

**Integration Point:** `agni-extensions/dependent-fields/frontend/hooks/useDependentFields.ts`

**Testing:** Component tests in `agni-extensions/dependent-fields/tests/`

---

#### 5. Record Form - Validation Error Display
**File:** `packages/twenty-front/src/modules/object-record/record-form/` (integration point)

**Status:** ⚠️ Not yet modified

**Reason:** Display validation errors and warnings from validation engine

**Changes:** *(To be documented when implemented)*
- Integrate `ValidationErrorDisplay` component
- Parse GraphQL errors to extract validation details
- Show errors inline next to fields
- Show warnings as dismissible notifications
- User-friendly error messages

**Risk Level:** 🟢 Low - Integration of custom component, minimal core changes

**Integration Point:** `agni-extensions/validation-engine/frontend/components/ValidationErrorDisplay.tsx`

**Testing:** E2E tests in `agni-extensions/validation-engine/tests/e2e/`

---

#### 6. Settings Module - Extension Configuration UIs
**File:** `packages/twenty-front/src/modules/settings/data-model/` (new pages)

**Status:** ⚠️ Not yet modified

**Reason:** Add admin configuration pages for custom extensions

**Changes:** *(To be documented when implemented)*
- Add link to "Dependent Fields" configuration page
- Add link to "Validation Rules" configuration page
- Create new "Security" section in Settings
- Add link to "Row-Level Security" configuration page

**Risk Level:** 🟢 Low - Adding new pages, minimal modification to existing settings

**Integration Points:**
- `agni-extensions/dependent-fields/frontend/components/DependentFieldsConfig.tsx`
- `agni-extensions/validation-engine/frontend/components/ValidationRulesConfig.tsx`
- `agni-extensions/row-level-security/frontend/components/RLSRulesConfig.tsx`

**Testing:** E2E tests for configuration workflows

---

### Database Schema Modifications

#### 7. New Metadata Tables
**Location:** `packages/twenty-server/src/database/typeorm/metadata/`

**Status:** ⚠️ Not yet created

**New Tables:**
1. `dependent_field_rule` - Stores dependent field configurations
2. `validation_rule` - Stores custom validation rules
3. `rls_rule` - Stores row-level security policies

**Risk Level:** 🟢 Low - New tables, no modification to existing schema

**Migrations:** *(To be documented when implemented)*
- Migration files will be created in `packages/twenty-server/src/database/typeorm/core/migrations/common/`
- Follow Twenty's migration naming convention

---

## Compatibility Information

### Base Version
- **Twenty CRM Version:** v1.15.0
- **Fork Point:** 2026-01-14
- **Upstream Repository:** https://github.com/twentyhq/twenty
- **Upstream Tag:** v1.15.0
- **Upstream Commit:** 9c9c0a7595 (backfill owner standard field check)

### Last Upstream Synchronization
- **Date:** Not yet synchronized (initial fork)
- **Upstream Version:** v1.15.0
- **Merge Strategy:** N/A - initial state

### Security Patches Applied
No security patches applied yet. This section will track cherry-picked security fixes from upstream.

**Format for future entries:**
```
- [YYYY-MM-DD] CVE-XXXX-XXXX: Description (commit: abc123)
- [YYYY-MM-DD] Security fix for XYZ (commit: def456)
```

### Known Compatibility Issues
None at this time (initial fork state).

**Future issues will be documented here with:**
- Upstream version that introduced the conflict
- Affected files
- Resolution strategy
- Status

---

## Maintenance Guidelines

### Updating from Upstream

#### Strategy
The Agni fork uses a three-branch strategy:
- `main` - Mirror of upstream Twenty (never contains Agni customizations)
- `agni-dev` - Development branch with all Agni customizations
- `agni-production` - Production-ready branch

#### Process for Security Patches
1. Cherry-pick security commits from upstream to `main`
2. Merge `main` into `agni-dev`
3. Run full test suite (Twenty tests + extension tests)
4. Resolve any conflicts in core modification files
5. Test in staging environment
6. Merge `agni-dev` into `agni-production`
7. Update this document with patch details

#### Process for Minor Releases
1. Create feature branch from `agni-dev`
2. Merge upstream minor release tag into feature branch
3. Resolve conflicts (focus on core modification files listed above)
4. Run full test suite
5. Test in staging environment for 1 week
6. If stable, merge to `agni-dev`, then to `agni-production`
7. Update this document

#### Process for Major Releases
1. Evaluate changes in upstream major release
2. Assess impact on custom extensions
3. Determine if extensions need refactoring
4. Create RFC document for major update
5. Schedule update window
6. May require significant rework of core modifications

### Testing Requirements for Updates

After any upstream merge:
- ✅ Run all Twenty unit tests: `npx nx test twenty-server && npx nx test twenty-front`
- ✅ Run all extension unit tests: `npx nx test agni-extensions`
- ✅ Run integration tests with database reset: `npx nx run twenty-server:test:integration:with-db-reset`
- ✅ Run E2E tests for all three extensions
- ✅ Manual smoke testing of:
  - Dependent fields functionality
  - Validation rules functionality
  - Row-level security functionality
  - n8n synchronization with Salesforce

### Conflict Resolution Priority

When resolving merge conflicts:

1. **Security fixes:** Always accept upstream version, then re-apply Agni logic
2. **Core modifications (High Risk 🔴):** Carefully merge both versions, extensive testing required
3. **Core modifications (Medium Risk 🟡):** Review changes, may need adaptation of Agni logic
4. **Core modifications (Low Risk 🟢):** Usually safe to keep Agni version

### Documentation Requirements

Every time a core file is modified:
1. Update the relevant section in this document
2. Document the exact changes made
3. Update the risk level if it changes
4. Add testing notes
5. Commit this document along with the code changes

---

## Update History

### 2026-01-26
- **Action:** Created AGNI_CUSTOMIZATIONS.md
- **Status:** Initial document creation
- **Changes:** Documented structure for tracking customizations
- **By:** Initial setup

### [Future entries will follow this format]
- **Action:** Description of what was modified/updated
- **Status:** Result of the action
- **Changes:** Detailed list of changes
- **By:** Who performed the update

---

## Quick Reference

### Files to Watch During Upstream Merges

**High Conflict Risk 🔴:**
- `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/graphql-query-runner.service.ts` (RLS)

**Medium Conflict Risk 🟡:**
- `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.resolver.ts` (Dependent Fields)
- `packages/twenty-front/src/modules/ui/field/input/components/FieldInput.tsx` (Dependent Fields UI)

**Low Conflict Risk 🟢:**
- `agni-extensions/*` (isolated custom code)
- New tables in database schema
- Settings module additions

### Commands for Development

```bash
# Run all tests (Twenty + extensions)
npx nx run-many --target=test --all

# Lint only files changed vs main
npx nx lint:diff-with-main twenty-front
npx nx lint:diff-with-main twenty-server

# Build the entire monorepo
npx nx run-many --target=build --all

# Check for upstream changes
git fetch upstream
git log HEAD..upstream/main --oneline

# Cherry-pick a security patch
git cherry-pick <commit-hash>
```

---

## Support and Questions

For questions about this document or the customization strategy:
- Review the [Technical Specification](_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- Consult the extension READMEs in `agni-extensions/*/README.md`
- Contact the Agni CRM development team

---

**Last Updated:** 2026-01-26
**Document Version:** 1.0.0
**Maintained By:** Agni CRM Development Team
