# Dependent Fields Extension

## Overview

This extension implements **Dependent Picklists** and **Conditional Field Visibility** for Twenty CRM, allowing fields to dynamically filter their available options or show/hide based on the values of other controlling fields.

## Purpose

Twenty CRM does not natively support:
- Dependent picklists (e.g., Country → State → City cascading dropdowns)
- Conditional field visibility (e.g., show "Financial Institution" only when "Payment Method" = "Financed")

This extension fills that gap by providing a configurable system for defining controlling-dependent field relationships.

## Architecture

### Components

```
dependent-fields/
├── backend/              # NestJS services, resolvers, and interceptors
│   ├── dependent-field-metadata.service.ts
│   ├── dependent-field-evaluator.service.ts
│   └── dependent-field.resolver.ts
├── frontend/             # React components and hooks
│   ├── hooks/
│   │   └── useDependentFields.ts
│   └── components/
│       └── DependentFieldsConfig.tsx
├── shared/               # Shared TypeScript types
│   └── types.ts
└── tests/                # Jest unit and integration tests
    ├── evaluator.test.ts
    ├── resolver.test.ts
    └── e2e/
```

### Key Features

1. **Controlling-Dependent Relationships**
   - Define fields that control the values of other fields
   - Support for multi-level cascades (e.g., Country → State → City)
   - Configurable via declarative rules

2. **Conditional Visibility**
   - Show/hide fields based on controlling field values
   - Use case: Show "Financial Institution" only when "Payment Method" = "Financed"

3. **Multi-tenant Support**
   - Rules are scoped to workspaces (each dealer has independent configurations)
   - Supports 50+ workspaces simultaneously

## Data Model

### DependentFieldRule

```typescript
interface DependentFieldRule {
  id: string;
  objectName: string;           // e.g., "Opportunity"
  controllingField: string;     // e.g., "paymentMethod"
  dependentField: string;       // e.g., "financialInstitution"
  type: 'values' | 'visibility';
  mappings: DependentFieldMapping[];
  workspaceId: string;          // Multi-tenant isolation
}
```

### DependentFieldMapping

```typescript
interface DependentFieldMapping {
  controllingValue: string | string[];
  dependentValues?: string[];   // For type='values'
  visible?: boolean;            // For type='visibility'
}
```

## Implementation Details

### Backend

1. **Metadata Storage**
   - Rules stored in PostgreSQL via TypeORM entity
   - Cached in Redis for fast lookup (key: `workspace:object:field`)
   - TTL: 5 minutes, invalidated on rule changes

2. **Evaluation Engine**
   - `DependentFieldEvaluatorService` evaluates rules at runtime
   - Methods:
     - `evaluateValues(rule, controllingValue)`: Returns filtered options
     - `evaluateVisibility(rule, controllingValue)`: Returns visibility boolean

3. **GraphQL API**
   - Mutations: `createDependentFieldRule`, `updateDependentFieldRule`, `deleteDependentFieldRule`
   - Queries: `getDependentFieldRules(objectName)`
   - Admin-only access via permissions guards

### Frontend

1. **useDependentFields Hook**
   - Custom React hook for consuming dependent field rules
   - Caches rules in Recoil atoms to minimize GraphQL queries
   - Returns: `{ availableOptions, isVisible }`

2. **Configuration UI**
   - Admin panel at Settings → Data Model → Dependent Fields
   - Visual form builder for creating rules
   - Live preview of behavior

### Core Modifications

This extension requires minimal modifications to Twenty's core:

- `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.resolver.ts`
  - Inject `DependentFieldEvaluatorService`
  - Filter field options based on rules

- `packages/twenty-front/src/modules/ui/field/input/components/FieldInput.tsx`
  - Use `useDependentFields` hook
  - Apply visibility and value filtering

**All modifications are documented in `AGNI_CUSTOMIZATIONS.md`**

## Usage Examples

### Example 1: Country → State Cascade

```typescript
// Rule Configuration
{
  objectName: "Contact",
  controllingField: "country",
  dependentField: "state",
  type: "values",
  mappings: [
    {
      controllingValue: "Colombia",
      dependentValues: ["Antioquia", "Cundinamarca", "Valle del Cauca"]
    },
    {
      controllingValue: "Mexico",
      dependentValues: ["Jalisco", "Nuevo León", "CDMX"]
    }
  ]
}
```

### Example 2: Conditional Visibility

```typescript
// Rule Configuration
{
  objectName: "Opportunity",
  controllingField: "paymentMethod",
  dependentField: "financialInstitution",
  type: "visibility",
  mappings: [
    {
      controllingValue: "Financed",
      visible: true
    },
    {
      controllingValue: ["Cash", "Bank Transfer"],
      visible: false
    }
  ]
}
```

## Testing

### Unit Tests
- `evaluator.test.ts`: 100+ test cases for value filtering logic
- `resolver.test.ts`: GraphQL API CRUD operations

### Integration Tests
- Field metadata queries return filtered options
- Multi-workspace isolation

### E2E Tests
- Country → State → City cascade flow in UI
- Payment Method → Financial Institution visibility toggle

**Coverage Target: 85%+**

## Performance Considerations

- **Redis Caching**: All rules cached with 5-minute TTL
- **Query Optimization**: Rules loaded once per form, not per field
- **Graceful Degradation**: If evaluation fails, show all options (fail-open for UX)

## Configuration

### Admin UI

Navigate to: **Settings → Data Model → Dependent Fields**

1. Select object (e.g., "Opportunity")
2. Choose controlling field (e.g., "Payment Method")
3. Choose dependent field (e.g., "Financial Institution")
4. Select type: Values or Visibility
5. Define mappings
6. Preview and save

### Permissions

- Only workspace **owners** and **admins** can configure rules
- All workspace members see the effects of configured rules

## Troubleshooting

### Issue: Dependent field not updating
- **Check**: Is the controlling field value set?
- **Check**: Is there a rule defined for that controlling value?
- **Solution**: Clear Redis cache and reload page

### Issue: All options showing instead of filtered
- **Check**: Rule configured correctly in admin UI?
- **Check**: Field names match exactly (case-sensitive)?
- **Solution**: Review rule configuration, check browser console for errors

## Migration Notes

When upgrading from Twenty upstream:
1. Check if `field-metadata.resolver.ts` changed (potential merge conflict)
2. Check if `FieldInput.tsx` changed (potential merge conflict)
3. Run tests to ensure no regressions
4. Review `AGNI_CUSTOMIZATIONS.md` for update instructions

## Related Documentation

- [Technical Specification](../../_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- [AGNI Customizations](../../AGNI_CUSTOMIZATIONS.md)
- [Project Context](../../docs/project-context.md)

## Support

For issues or questions about this extension, contact the Agni CRM development team.
