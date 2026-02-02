# Dependent Fields Frontend - Admin UI

This directory contains the frontend components for the Dependent Fields admin configuration interface.

## Overview

The admin UI allows workspace administrators to create, edit, and manage dependent field rules that control:
- **Field Value Filtering**: Show only specific options in a dropdown based on another field's value
- **Field Visibility**: Show or hide fields based on another field's value

## Directory Structure

```
frontend/
├── components/
│   ├── DependentFieldsConfig.tsx         # Main page component
│   ├── DependentFieldRulesTable.tsx      # Table displaying all rules
│   ├── DependentFieldRuleForm.tsx        # Form for creating/editing rules
│   ├── DependentFieldRuleMappingEditor.tsx # Editor for rule mappings
│   └── index.ts                           # Component exports
├── graphql/
│   ├── queries/
│   │   ├── getDependentFieldRules.ts     # Query all rules
│   │   └── getDependentFieldRule.ts      # Query single rule
│   ├── mutations/
│   │   ├── createDependentFieldRule.ts   # Create new rule
│   │   ├── updateDependentFieldRule.ts   # Update existing rule
│   │   └── deleteDependentFieldRule.ts   # Delete rule
│   ├── fragments/
│   │   └── dependentFieldRuleFragment.ts # Shared GraphQL fragment
│   └── index.ts                           # GraphQL exports
├── hooks/
│   └── useDependentFields.ts             # Hook for consuming rules
└── states/
    └── dependentFieldRulesState.ts        # Recoil state for caching

```

## Usage

### Accessing the Admin UI

The admin UI is accessible at:
```
/settings/objects/dependent-fields
```

Only users with `DATA_MODEL_SETTINGS` permission can access this page.

### Creating a Rule

1. Navigate to Settings → Data Model → Dependent Fields
2. Click "Add Rule" button
3. Fill in the form:
   - **Object**: Select the object (e.g., "Opportunity")
   - **Rule Type**: Choose "Filter Values" or "Control Visibility"
   - **Controlling Field**: The field that controls the behavior
   - **Dependent Field**: The field that will be affected
   - **Mappings**: Define what happens for each controlling value
4. Click "Create Rule"

### Example Use Cases

#### Country → State Cascade
```yaml
Object: Contact
Controlling Field: country
Dependent Field: state
Type: values
Mappings:
  - controllingValue: ["USA"]
    dependentValues: ["California", "New York", "Texas"]
  - controllingValue: ["Colombia"]
    dependentValues: ["Antioquia", "Cundinamarca", "Valle"]
```

#### Conditional Field Visibility
```yaml
Object: Opportunity
Controlling Field: paymentMethod
Dependent Field: financialEntity
Type: visibility
Mappings:
  - controllingValue: ["Financed"]
    visible: true
  - controllingValue: ["Cash", "Bank Transfer"]
    visible: false
```

## Components

### DependentFieldsConfig
Main page component that orchestrates the UI. Shows either the table of rules or the create/edit form.

### DependentFieldRulesTable
Displays all rules in a searchable table with actions:
- **Toggle Active/Inactive**: Enable or disable a rule
- **Edit**: Open the rule in edit mode
- **Delete**: Remove the rule (with confirmation)

### DependentFieldRuleForm
Form for creating or editing a rule. Includes:
- Object and field selection (populated from metadata)
- Rule type selection
- Description field
- Mapping editor

### DependentFieldRuleMappingEditor
Advanced editor for defining field mappings. Supports:
- Multiple controlling values per mapping
- Tag-based input for values
- Different UI for "values" vs "visibility" rules

## GraphQL Operations

All GraphQL operations are located in `graphql/` directory:
- `GET_DEPENDENT_FIELD_RULES`: Query all rules (with optional filters)
- `CREATE_DEPENDENT_FIELD_RULE`: Create a new rule
- `UPDATE_DEPENDENT_FIELD_RULE`: Update an existing rule
- `DELETE_DEPENDENT_FIELD_RULE`: Delete a rule

## State Management

- Uses Apollo Client for GraphQL queries/mutations
- Uses Recoil for caching rules in `dependentFieldRulesState`
- Automatic cache invalidation on create/update/delete

## Styling

Components use Twenty's design system:
- Emotion for styled components
- Twenty UI components (Button, Table, etc.)
- Follows Twenty's theming patterns

## Integration Points

### Twenty Core Integration
The admin UI is integrated into Twenty's settings via:
1. Route added to `packages/twenty-front/src/modules/app/components/SettingsRoutes.tsx`
2. Path added to `packages/twenty-shared/src/types/SettingsPath.ts`
3. Wrapper page at `packages/twenty-front/src/pages/settings/data-model/SettingsDependentFields.tsx`

### Backend Integration
Connects to the backend GraphQL API:
- Resolver: `agni-extensions/dependent-fields/backend/dependent-field.resolver.ts`
- Service: `agni-extensions/dependent-fields/backend/dependent-field-metadata.service.ts`

## Permissions

Admin UI requires `PermissionFlagType.DATA_MODEL_SETTINGS` permission, enforced by:
- `SettingsProtectedRouteWrapper` in routing
- Backend guards on mutations (`SettingsPermissionGuard`)

## Future Enhancements

Potential improvements for Phase 3:
- [ ] Rule preview/testing interface
- [ ] Bulk import/export of rules
- [ ] Rule duplication
- [ ] Rule versioning/history
- [ ] Visual dependency graph
- [ ] Rule validation warnings
