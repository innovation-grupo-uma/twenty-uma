# Row-Level Security (RLS) Extension

## Overview

This extension implements **Row-Level Security** for Twenty CRM, enabling fine-grained access control at the record level based on configurable rules.

## Purpose

Twenty CRM does not natively support row-level security or dynamic record filtering based on user attributes. This is a critical gap for multi-user environments where:
- Sales reps should only see their own opportunities
- Supervisors should see all opportunities in their workspace
- Different user roles need different data access scopes

This extension provides a flexible, policy-based RLS system similar to AWS IAM policies or PostgreSQL RLS.

## Architecture

### Components

```
row-level-security/
├── backend/              # NestJS services, interceptors, and guards
│   ├── rls-rule.service.ts
│   ├── rls-engine.service.ts
│   ├── rls-cache.service.ts
│   ├── rls-query-filter.interceptor.ts
│   └── rls-rule.resolver.ts
├── frontend/             # React components for configuration and debugging
│   └── components/
│       ├── RLSRulesConfig.tsx
│       └── RLSDebugPanel.tsx
├── shared/               # Shared TypeScript types
│   └── types.ts
└── tests/                # Jest unit and integration tests
    ├── engine.test.ts
    ├── query-filter.test.ts
    └── e2e/
```

### Key Features

1. **Policy-Based Access Control**
   - Define rules similar to IAM policies
   - Conditions based on user attributes and record data
   - Effect: `allow` or `deny`

2. **Operations Support**
   - Read (query filtering)
   - Update (mutation blocking)
   - Delete (mutation blocking)
   - Wildcard `*` for all operations

3. **Priority System**
   - Rules evaluated in priority order
   - Higher priority rules evaluated first
   - **Deny overrides allow** (most restrictive wins)

4. **Multi-tenant Isolation**
   - Rules scoped to workspaces
   - Per-workspace and per-role configurations

5. **Performance Optimized**
   - Aggressive Redis caching
   - Query-level filtering (not post-fetch filtering)
   - Overhead target: < 10% vs non-RLS queries

## Data Model

### RLSRule

```typescript
interface RLSRule {
  id: string;
  objectName: string;           // e.g., "Opportunity"
  ruleName: string;             // Human-readable name
  roleIds: string[];            // Roles affected by this rule
  operation: 'read' | 'update' | 'delete' | '*';
  condition: string;            // Expression: "ownerId === currentUser.id"
  priority: number;             // Higher = evaluated first
  effect: 'allow' | 'deny';
  workspaceId: string;          // Multi-tenant isolation
}
```

### RLSContext

```typescript
interface RLSContext {
  currentUserId: string;
  workspaceId: string;
  userRoles: string[];
  record?: any;                 // The record being accessed (for update/delete)
}
```

### RLSTestResult

```typescript
interface RLSTestResult {
  allowed: boolean;
  appliedRules: RLSRule[];      // Rules that matched
  finalEffect: 'allow' | 'deny';
  reasoning: string;            // Explanation of decision
}
```

## Implementation Details

### Backend

1. **RLS Rule Storage**
   - Rules stored in PostgreSQL via TypeORM entity
   - Related to workspace, object-metadata, and roles
   - Indexed by workspace, object, and role for fast lookup

2. **RLS Evaluation Engine**
   - `RLSEngineService.evaluateAccess(context, rules, operation)`
   - Evaluates conditions using safe expression library
   - Applies priority ordering
   - Effect composition: **deny wins over allow**

3. **Query Filter Injection** (CRITICAL)
   - Intercepts GraphQL `findMany` and `findOne` queries
   - Generates WHERE clause based on allowed RLS rules
   - Injects WHERE clause into TypeORM query BEFORE execution
   - Example: `WHERE (ownerId = :userId OR supervisorId = :userId)`

4. **Mutation Guard**
   - Intercepts `updateOne` and `deleteOne` mutations
   - Fetches record first
   - Evaluates RLS with record data
   - Throws `ForbiddenException` if denied
   - Returns `NotFoundError` (not `Forbidden`) to prevent information disclosure

5. **Caching Strategy**
   - Redis cache key: `rls:{workspaceId}:{objectName}:{roleIds}`
   - TTL: 5 minutes (configurable)
   - Invalidation: On rule create/update/delete
   - Warm-up: Cache loaded on workspace initialization

### Frontend

1. **RLSRulesConfig Component**
   - Admin panel at Settings → Security → Row-Level Security
   - Visual rule builder:
     - Object selector
     - Role selector (multi-select)
     - Operation selector
     - Expression builder (visual + text modes)
     - Priority slider
     - Effect toggle (allow/deny)
   - Preview: Shows which records each role would see

2. **RLSDebugPanel Component** (Admin Only)
   - Toggle in developer settings
   - Shows for each query:
     - Applied RLS rules
     - Generated WHERE clause
     - Records filtered vs total
     - Performance impact
   - Essential for troubleshooting

### Core Modifications (CRITICAL)

This extension requires deep modifications to Twenty's query execution:

- `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/graphql-query-runner.service.ts`
  - Inject `RLSEngineService` into query runner
  - Modify `findMany` and `findOne` to apply RLS filters
  - Modify `updateOne` and `deleteOne` to check RLS before execution

**This is the MOST INVASIVE modification in all extensions. It affects EVERY database query.**

**All modifications are documented in `AGNI_CUSTOMIZATIONS.md`**

## Usage Examples

### Example 1: Sales Rep Sees Only Their Opportunities

```typescript
// Rule: "Sales reps can only read opportunities they own"
{
  objectName: "Opportunity",
  ruleName: "Sales Rep Ownership",
  roleIds: ["sales_rep_role_id"],
  operation: "read",
  condition: "ownerId === currentUser.id",
  priority: 100,
  effect: "allow"
}
```

This generates WHERE clause:
```sql
WHERE ownerId = :currentUserId
```

### Example 2: Supervisors See All Opportunities in Workspace

```typescript
// Rule: "Supervisors can read all opportunities"
{
  objectName: "Opportunity",
  ruleName: "Supervisor Full Access",
  roleIds: ["supervisor_role_id"],
  operation: "*",
  condition: "workspaceId === currentUser.workspaceId",
  priority: 50,
  effect: "allow"
}
```

### Example 3: Deny Updates to Closed Opportunities

```typescript
// Rule: "No one can update closed opportunities"
{
  objectName: "Opportunity",
  ruleName: "Closed Opportunities Read-Only",
  roleIds: ["*"],              // All roles
  operation: "update",
  condition: "record.stage === 'Closed Won' || record.stage === 'Closed Lost'",
  priority: 200,               // High priority (deny rules should be high)
  effect: "deny"
}
```

### Example 4: Complex Rule with OR Conditions

```typescript
// Rule: "User can read if they are owner OR supervisor OR admin"
{
  objectName: "Opportunity",
  ruleName: "Multi-Condition Access",
  roleIds: ["sales_rep_role_id"],
  operation: "read",
  condition: "ownerId === currentUser.id || supervisorId === currentUser.id || currentUser.isAdmin === true",
  priority: 100,
  effect: "allow"
}
```

## How RLS Works: End-to-End Flow

### 1. Query Execution (Read)

```
User → GraphQL Query → RLS Interceptor
                          ↓
                     Get RLS Rules (from cache)
                          ↓
                     Evaluate Conditions
                          ↓
                     Generate WHERE Clause
                          ↓
                     Inject into TypeORM Query
                          ↓
                     Execute Query → Return Filtered Results
```

### 2. Mutation Execution (Update/Delete)

```
User → GraphQL Mutation → RLS Guard
                              ↓
                         Fetch Record
                              ↓
                         Get RLS Rules (from cache)
                              ↓
                         Evaluate with Record Data
                              ↓
                         Allow or Deny?
                              ↓
                    If Allow: Execute Mutation
                    If Deny: Throw ForbiddenException
```

## Testing

### Unit Tests
- `engine.test.ts`: 300+ test cases
  - Simple condition evaluation
  - Complex OR/AND conditions
  - Priority ordering
  - Effect composition (deny wins)
  - Performance with 100+ rules

### Integration Tests
- Query filtering works automatically
- Mutations blocked correctly
- Cache invalidation works
- Multi-workspace isolation

### E2E Tests
- Sales rep A cannot see sales rep B's opportunities
- Supervisor sees all opportunities in workspace
- Admin sees all opportunities
- Update blocked on closed opportunities

### Performance Tests
- Query overhead < 10% vs non-RLS queries
- Cache hit rate > 95%

**Coverage Target: 95%+ (security critical)**

## Performance Considerations

### Caching Strategy

- **Rule Cache**: `rls:{workspaceId}:{objectName}:{roleIds}` (TTL: 5min)
- **Warm-up**: On workspace initialization
- **Invalidation**: On rule changes

### Query Optimization

- RLS filters injected at SQL level (not post-fetch filtering)
- Indexed columns for common RLS conditions (`ownerId`, `supervisorId`)
- Avoid complex expressions that can't be optimized by PostgreSQL

### Monitoring

- Track query execution time (with vs without RLS)
- Alert if overhead exceeds 10%
- Monitor cache hit rates

## Configuration

### Admin UI

Navigate to: **Settings → Security → Row-Level Security**

1. Select object (e.g., "Opportunity")
2. Enter rule name
3. Select affected roles
4. Select operation (read, update, delete, or *)
5. Build condition expression
   - Visual mode: Click to build (e.g., "Owner equals Current User")
   - Text mode: Write expression directly
6. Set priority (higher = evaluated first)
7. Choose effect (allow or deny)
8. **Test the rule** with sample context
9. Preview impact (what records each role would see)
10. Save and activate

### Testing Rules

Use the **Test** feature before activation:
1. Enter test context (user ID, roles, record data)
2. Click "Test Rule"
3. See evaluation result and reasoning
4. Iterate until rule works correctly

### Permissions

- Only workspace **owners** can configure RLS rules
- RLS configuration is a security-critical operation

## Debugging

### Enable RLS Debug Mode

1. Navigate to Settings → Developer → RLS Debug Mode
2. Toggle ON
3. Open any object list view
4. See debug panel showing:
   - Applied RLS rules
   - Generated WHERE clause
   - Filtered records vs total
   - Performance metrics

### Common Issues

**Issue: User sees no records**
- **Cause**: No "allow" rules match, or "deny" rule blocking
- **Solution**: Check rules for user's roles, verify conditions

**Issue: User sees too many records**
- **Cause**: "Allow" rule too permissive
- **Solution**: Tighten condition, add "deny" rules

**Issue: Performance degradation**
- **Cause**: Complex conditions, cache misses
- **Solution**: Simplify expressions, check cache hit rate

## Security Considerations

### Information Disclosure Prevention

- Use `NotFoundError` instead of `ForbiddenException` for records user can't access
- Prevents attackers from inferring existence of records

### Expression Safety

- All expressions evaluated using safe library (no `eval()`)
- Sandboxed context
- Input sanitization

### Audit Logging

- Log all RLS rule changes
- Log access denials
- Track who configured rules

## Best Practices

1. **Use High Priority for Deny Rules**
   - Deny rules should evaluate first (priority 200+)
   - Prevents allow rules from accidentally overriding

2. **Test Before Activating**
   - Always use Test feature with real data
   - Preview impact on different roles

3. **Keep Conditions Simple**
   - Complex conditions hurt performance
   - Use indexed fields in conditions when possible

4. **Monitor Performance**
   - Track query overhead
   - Alert if > 10% degradation

5. **Document Rules**
   - Use descriptive rule names
   - Comment why each rule exists

## Migration Notes

When upgrading from Twenty upstream:
1. **HIGH RISK**: Check if `graphql-query-runner.service.ts` changed
2. Review TypeORM query execution pipeline changes
3. Run full test suite (especially E2E)
4. Test with production-like data volumes
5. Review `AGNI_CUSTOMIZATIONS.md` for update instructions

## Comparison: RLS vs. Object-Level Permissions

| Feature | Object-Level Permissions | Row-Level Security |
|---------|-------------------------|---------------------|
| Granularity | All records or none | Per-record |
| Use Case | "Can user access Opportunities?" | "Can user access THIS opportunity?" |
| Performance | Fast | Slight overhead (< 10%) |
| Configuration | Simple | More complex |
| Twenty Native | Yes | No (this extension) |

Use both together:
- Object-level permissions: Broad access control
- Row-level security: Fine-grained filtering

## Related Documentation

- [Technical Specification](../../_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- [AGNI Customizations](../../AGNI_CUSTOMIZATIONS.md)
- [Project Context](../../docs/project-context.md)

## Support

For issues or questions about this extension, contact the Agni CRM development team.

---

**⚠️ WARNING**: This extension modifies core query execution logic. Thoroughly test before deploying to production.
