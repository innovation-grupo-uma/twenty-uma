# Dependent Fields System - Implementation Summary

## Overview

This document describes the implementation of Extension 1: Dependent Fields System for Agni CRM. This extension enables dependent picklists and conditional field visibility in Twenty CRM.

**Status:** Phase 1 Complete (Core Backend & Frontend Infrastructure)

**Branch:** `feat/INN-21-dependent-field-system`

---

## What Has Been Implemented

### ✅ Phase 1: Core Infrastructure (COMPLETED)

#### 1. Type Definitions (TASK-101)
**File:** `agni-extensions/dependent-fields/shared/types.ts`

Comprehensive TypeScript definitions including:
- `DependentFieldRule` - Core rule definition
- `DependentFieldMapping` - Mapping between controlling and dependent values
- `DependentFieldRuleInput` - Input types for creating rules
- `DependentFieldEvaluationResult` - Result types for runtime evaluation
- `DependentFieldConfig` - Configuration options
- `DependentFieldStats` - Statistics and monitoring types

#### 2. Database Schema (TASK-102)
**Files:**
- `packages/twenty-server/src/engine/core-modules/dependent-field/dependent-field-rule.entity.ts`
- `packages/twenty-server/src/database/typeorm/core/migrations/common/1738454400000-addDependentFieldRuleTable.ts`

Features:
- TypeORM entity extending `WorkspaceRelatedEntity` for multi-tenancy
- PostgreSQL table with JSONB column for flexible mappings
- Comprehensive indexes for query performance:
  - `IDX_DEPENDENT_FIELD_RULE_WORKSPACE_ID`
  - `IDX_DEPENDENT_FIELD_RULE_OBJECT_NAME`
  - `IDX_DEPENDENT_FIELD_RULE_CONTROLLING_FIELD`
  - `IDX_DEPENDENT_FIELD_RULE_DEPENDENT_FIELD`
  - Composite index for `(workspaceId, objectName, dependentField)`
- Foreign key constraint to `workspace` table with CASCADE delete

#### 3. Backend Services (TASK-102, TASK-104)
**Files:**
- `agni-extensions/dependent-fields/backend/dependent-field-metadata.service.ts`
- `agni-extensions/dependent-fields/backend/dependent-field-evaluator.service.ts`

**DependentFieldMetadataService** - Handles CRUD operations:
- `createRule()` - Create new dependent field rules
- `updateRule()` - Update existing rules
- `deleteRule()` - Delete rules
- `getRule()` - Get single rule by ID
- `getRules()` - Query rules with filters
- `getRulesByObject()` - Get all rules for an object
- `getRulesByField()` - Get rules by field name
- `getStats()` - Get statistics for monitoring
- `ruleExists()` - Check if rule exists

**DependentFieldEvaluatorService** - Runtime evaluation engine:
- `evaluateValues()` - Evaluate values-type rules (filtered options)
- `evaluateVisibility()` - Evaluate visibility-type rules (show/hide)
- `evaluate()` - Unified evaluation method
- `invalidateCache()` - Invalidate field-specific cache
- `invalidateWorkspaceCache()` - Invalidate all workspace cache
- Redis caching with 5-minute TTL
- Graceful degradation (fail-open) on errors
- Support for single and array-based controlling values

#### 4. GraphQL API (TASK-103)
**Files:**
- `agni-extensions/dependent-fields/backend/dependent-field.resolver.ts`
- `agni-extensions/dependent-fields/backend/dtos/*.dto.ts`

**Queries:**
- `dependentFieldRules` - Get all rules (with optional filters)
- `dependentFieldRule` - Get single rule by ID

**Mutations:**
- `createDependentFieldRule` - Create new rule (admin only)
- `updateDependentFieldRule` - Update existing rule (admin only)
- `deleteDependentFieldRule` - Delete rule (admin only)

**Security:**
- Uses `WorkspaceAuthGuard` for authentication
- Uses `SettingsPermissionGuard(DATA_MODEL_SETTINGS)` for admin-only mutations
- All queries scoped to workspace (multi-tenant isolation)

#### 5. NestJS Module (TASK-103)
**File:** `agni-extensions/dependent-fields/backend/dependent-field.module.ts`

Provides dependency injection configuration for all backend services and resolvers.

#### 6. Frontend Hook (TASK-106)
**Files:**
- `agni-extensions/dependent-fields/frontend/hooks/useDependentFields.ts`
- `agni-extensions/dependent-fields/frontend/states/dependentFieldRulesState.ts`

**useDependentFields Hook:**
```typescript
const { availableValues, isVisible, loading, refetch } = useDependentFields(
  objectName,
  fieldName,
  controllingValue
);
```

Features:
- Apollo Client integration for GraphQL queries
- Recoil state for caching rules (minimizes network requests)
- Real-time evaluation based on controlling field value
- Returns filtered values and visibility status
- Loading state and refetch capability

---

## What Needs to Be Implemented

### ✅ Phase 2: Core Integration (COMPLETED)

#### 7. Field Metadata Resolver Integration (TASK-105) - SKIPPED
**Decision:** Backend integration not needed

**Reason:** The frontend hook `useSelectFieldWithDependentRules` handles all evaluation client-side, which is:
- Less invasive to Twenty's core
- More maintainable (avoids medium-risk core modification)
- More efficient (rules are cached in Recoil state)
- Easier to test and debug

**Alternative approach taken:** Direct UI component integration (see TASK-107)

#### 8. Field Input Component Integration (TASK-107) ✅ COMPLETED
**Files modified:**
- `packages/twenty-front/src/modules/object-record/record-field/ui/meta-types/input/components/SelectFieldInput.tsx`
- `packages/twenty-front/src/modules/object-record/record-field/ui/meta-types/input/components/MultiSelectFieldInput.tsx`

**New hook created:**
- `agni-extensions/dependent-fields/frontend/hooks/useSelectFieldWithDependentRules.ts`

**Changes implemented:**
1. Created `useSelectFieldWithDependentRules` hook that:
   - Automatically queries dependent field rules for a given field
   - Extracts controlling field value from the record
   - Evaluates rules and returns filtered options + visibility status
   - Provides graceful degradation (falls back to all options on error)
2. Integrated into SelectFieldInput:
   - Uses `useFindOneRecord` to get full record data
   - Calls `useSelectFieldWithDependentRules` with record data
   - Filters SELECT field options dynamically based on controlling field value
   - Hides field when visibility rules return `false` (returns `null`)
3. Integrated into MultiSelectFieldInput:
   - Same approach as SelectFieldInput
   - Filters MULTI-SELECT field options dynamically
   - Supports visibility rules
4. Documentation updated in `AGNI_CUSTOMIZATIONS.md` (sections #4 and #5)

**Risk Level:** 🟡 Medium (core UI component)

**Status:** ✅ Completed (2026-02-01) - SELECT and MULTI-SELECT fields now fully support dependent field rules

#### 9. Admin Configuration UI (TASK-108)
**Files to create:**
- `agni-extensions/dependent-fields/frontend/components/DependentFieldsConfig.tsx`
- `agni-extensions/dependent-fields/frontend/components/DependentFieldRuleForm.tsx`
- `agni-extensions/dependent-fields/frontend/components/DependentFieldRuleList.tsx`

**File to modify:**
- `packages/twenty-front/src/modules/settings/data-model/` (add navigation link)

**Features needed:**
- Table view of existing rules
- Form for creating/editing rules with:
  - Object selector
  - Controlling field selector
  - Dependent field selector
  - Type selector (values/visibility)
  - Mapping builder (add/remove mappings)
  - Live preview of behavior
- Delete confirmation dialog
- Validation and error handling

**Risk Level:** 🟢 Low (new components)

---

### ⚠️ Phase 3: Testing (PENDING)

#### 10. Comprehensive Tests (TASK-109)
**Files to create:**
- `agni-extensions/dependent-fields/tests/metadata.service.test.ts`
- `agni-extensions/dependent-fields/tests/evaluator.service.test.ts`
- `agni-extensions/dependent-fields/tests/resolver.test.ts`
- `agni-extensions/dependent-fields/tests/integration/graphql-api.test.ts`
- `agni-extensions/dependent-fields/tests/e2e/dependent-fields-flow.test.ts`

**Unit Tests:**
- Metadata service CRUD operations (50+ test cases)
- Evaluator service logic (100+ test cases):
  - Single value matching
  - Array value matching
  - Values type evaluation
  - Visibility type evaluation
  - Cache behavior
  - Error handling

**Integration Tests:**
- GraphQL API CRUD operations
- Multi-workspace isolation
- Permission guards
- Cache invalidation

**E2E Tests:**
- Country → State → City cascade
- Payment Method → Financial Institution visibility
- Form interaction with dependent fields
- Error states and graceful degradation

**Coverage Target:** 85%+

---

## Integration Instructions

### Step 1: Register the Module

Add the `DependentFieldModule` to the main application module:

**File:** `packages/twenty-server/src/engine/core-modules/core-engine.module.ts`

```typescript
import { DependentFieldModule } from 'agni-extensions/dependent-fields/backend/dependent-field.module';

@Module({
  imports: [
    // ... existing imports
    DependentFieldModule,
  ],
})
export class CoreEngineModule {}
```

### Step 2: Run Database Migration

```bash
# Run the migration
npx nx run twenty-server:database:migrate:prod

# Verify table created
psql -d twenty -c "SELECT * FROM core.\"dependentFieldRule\" LIMIT 1;"
```

### Step 3: Verify GraphQL Schema

```bash
# Start the server
npx nx start twenty-server

# Check GraphQL schema includes new types
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __type(name: \"DependentFieldRule\") { name fields { name type { name } } } }"}'
```

### Step 4: Test GraphQL API

Create a test rule:

```graphql
mutation CreateTestRule {
  createDependentFieldRule(input: {
    objectName: "Contact"
    controllingField: "country"
    dependentField: "state"
    type: "values"
    mappings: [
      {
        controllingValue: ["Colombia"]
        dependentValues: ["Antioquia", "Cundinamarca", "Valle del Cauca"]
      },
      {
        controllingValue: ["Mexico"]
        dependentValues: ["Jalisco", "Nuevo León", "CDMX"]
      }
    ]
    description: "Country to State dependency"
    isActive: true
  }) {
    id
    objectName
    controllingField
    dependentField
  }
}
```

Query rules:

```graphql
query GetRules {
  dependentFieldRules(input: {
    objectName: "Contact"
    includeInactive: false
  }) {
    id
    objectName
    controllingField
    dependentField
    type
    mappings
    isActive
  }
}
```

### Step 5: Implement Core Modifications

Complete TASK-105 and TASK-107 to integrate with Twenty's core:
1. Modify field metadata resolver
2. Modify field input components
3. Test end-to-end flow

### Step 6: Build Admin UI

Complete TASK-108 to provide configuration interface for workspace admins.

### Step 7: Create Tests

Complete TASK-109 to ensure reliability and maintainability.

---

## Example Use Cases

### Use Case 1: Country → State → City Cascade

**Rules:**
1. Country (Colombia) → State (Colombian departments)
2. Country (Mexico) → State (Mexican states)
3. State (Antioquia) → City (Cities in Antioquia)
4. State (Jalisco) → City (Cities in Jalisco)

### Use Case 2: Conditional Visibility

**Rules:**
1. Payment Method = "Financed" → Show "Financial Institution"
2. Payment Method = "Cash" or "Bank Transfer" → Hide "Financial Institution"

### Use Case 3: Product Type → Specific Fields

**Rules:**
1. Product Type = "Vehicle" → Show "VIN", "Model Year", "Color"
2. Product Type = "Service" → Hide vehicle-specific fields

---

## Performance Considerations

### Redis Caching Strategy

- **Cache Key Format:** `dependent-field:{workspaceId}:{objectName}:{fieldName}`
- **TTL:** 300 seconds (5 minutes)
- **Invalidation:** Automatic on rule create/update/delete
- **Warm-up:** Rules loaded on first query per field

### Database Indexes

All common query patterns are indexed:
- Lookup by workspace
- Lookup by object name
- Lookup by field name
- Composite lookup (workspace + object + field)

### Expected Performance

- **Cold query** (no cache): < 50ms
- **Cached query**: < 5ms
- **Evaluation overhead**: < 10ms per field

---

## Monitoring and Observability

### Key Metrics to Track

1. **Cache Hit Rate:** Should be > 90%
2. **Rule Evaluation Time:** p95 < 10ms
3. **Rule Configuration Changes:** Track frequency
4. **Evaluation Errors:** Should be < 0.1%

### Logging

The services log key events:
- Rule creation/update/deletion
- Cache invalidations
- Evaluation errors
- Rule matches/mismatches

### Statistics Endpoint

Use `getStats()` method to monitor:
- Total rules per workspace
- Active vs inactive rules
- Rules by type breakdown
- Last update timestamp

---

## Troubleshooting

### Issue: Rules not applying

**Possible causes:**
1. Cache not invalidated → Clear Redis cache
2. Rule inactive → Check `isActive` flag
3. Controlling value mismatch → Check value normalization
4. Field names mismatch → Verify exact field names (case-sensitive)

**Solution:**
```bash
# Clear cache for workspace
redis-cli DEL "dependent-field:{workspaceId}:*"

# Verify rule exists and is active
psql -c "SELECT * FROM core.\"dependentFieldRule\" WHERE \"isActive\" = true;"
```

### Issue: GraphQL errors

**Possible causes:**
1. Module not registered
2. Migration not run
3. Permission guard blocking

**Solution:**
- Check server logs for detailed error
- Verify module imported in `CoreEngineModule`
- Verify migration ran successfully
- Check user has admin permissions

---

## Security Considerations

### Multi-Tenancy

- All queries scoped to `workspaceId`
- Foreign key constraint prevents orphaned rules
- CASCADE delete ensures cleanup

### Permissions

- Only workspace admins can create/update/delete rules
- All users can query rules (needed for field rendering)
- GraphQL guards enforced at resolver level

### Input Validation

- DTOs validate all inputs
- Mapping validation ensures rule consistency
- SQL injection prevented by TypeORM parameterization

---

## Migration Strategy

### Rollback Plan

If issues arise, rollback by:

```bash
# Revert migration
npx nx run twenty-server:typeorm migration:revert

# Remove module import
# (revert changes to CoreEngineModule)

# Restart server
npx nx start twenty-server
```

### Backward Compatibility

- Extension is additive (no breaking changes to existing Twenty functionality)
- Rules are optional (fields work normally without rules)
- Graceful degradation ensures no disruption

---

## Next Steps

1. ✅ **Complete Phase 1** (DONE) - Core backend & frontend infrastructure
2. ✅ **Implement Phase 2** (DONE) - Core UI integration (TASK-107 completed, TASK-105 skipped as unnecessary)
3. ⚠️ **Build Admin UI** (TASK-108) - Configuration interface for workspace admins
4. ⚠️ **Create Tests** (TASK-109) - Comprehensive test suite
5. ⚠️ **Test with n8n Integration** - Verify field mappings work with Salesforce sync
6. ⚠️ **Load Testing** - Verify performance with 50 workspaces
7. ⚠️ **Deploy to Staging** - Test in AWS environment
8. ⚠️ **Pilot with 5 Dealers** - Real-world validation

---

## Documentation References

- [Main Tech Spec](_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- [AGNI Customizations](../../AGNI_CUSTOMIZATIONS.md)
- [README](README.md)
- [Project Context](../../docs/project-context.md)

---

**Last Updated:** 2026-02-01
**Status:** Phase 1 Complete
**Author:** Agni CRM Development Team
