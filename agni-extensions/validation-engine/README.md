# Validation Engine Extension

## Overview

This extension implements a **Custom Validation Rules Engine** for Twenty CRM, enabling configurable, conditional validation rules that go beyond Twenty's native field-level validation.

## Purpose

Twenty CRM does not natively support:
- Conditional required fields (e.g., "if stage = 'Closed Lost', then lossReason is required")
- Cross-field validations (e.g., "endDate must be after startDate")
- Context-aware format validations (e.g., phone number format varies by country)
- Complex business rule validations

This extension provides a flexible, declarative validation engine that addresses these limitations.

## Architecture

### Components

```
validation-engine/
├── backend/              # NestJS services, interceptors, and resolvers
│   ├── validation-rule.service.ts
│   ├── validation-engine.service.ts
│   ├── context-validator.service.ts
│   ├── validation-interceptor.ts
│   └── validation-rule.resolver.ts
├── frontend/             # React components for error display and configuration
│   └── components/
│       ├── ValidationErrorDisplay.tsx
│       └── ValidationRulesConfig.tsx
├── shared/               # Shared TypeScript types
│   └── types.ts
└── tests/                # Jest unit and integration tests
    ├── engine.test.ts
    ├── context-validator.test.ts
    └── e2e/
```

### Key Features

1. **Conditional Validations**
   - If-then rules: "if stage = X, then field Y is required"
   - Expression-based conditions using safe evaluation

2. **Format Validations**
   - Regex patterns
   - Length constraints (min/max)
   - Data type validations

3. **Cross-Field Validations**
   - Compare values between fields
   - Ensure referential integrity

4. **Context-Aware Validations**
   - Phone number format by country
   - Tax ID format by country
   - Date/time formats by locale

5. **Severity Levels**
   - **Errors**: Block save operation
   - **Warnings**: Allow save but show notification

## Data Model

### ValidationRule

```typescript
interface ValidationRule {
  id: string;
  objectName: string;           // e.g., "Opportunity"
  ruleName: string;             // Human-readable name
  type: 'required' | 'format' | 'range' | 'custom';
  condition?: string;           // Expression: "stage === 'Closed Lost'"
  config: ValidationConfig;
  errorMessage: string;         // User-facing error message
  severity: 'error' | 'warning';
  workspaceId: string;          // Multi-tenant isolation
}
```

### ValidationConfig

```typescript
interface ValidationConfig {
  // For type='required'
  field?: string;

  // For type='format'
  pattern?: string;             // Regex pattern
  minLength?: number;
  maxLength?: number;

  // For type='range'
  min?: number;
  max?: number;

  // For type='custom'
  expression?: string;          // Evaluable expression
  contextFields?: string[];     // Fields needed for evaluation
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  ruleName: string;
}
```

## Implementation Details

### Backend

1. **Validation Rule Storage**
   - Rules stored in PostgreSQL via TypeORM entity
   - Related to workspace and object-metadata
   - Cached in Redis (key: `validation:{workspaceId}:{objectName}`)

2. **Validation Engine Core**
   - `ValidationEngineService.validateRecord(objectName, recordData, operation)`
   - Evaluates all applicable rules for the record
   - Returns aggregated `ValidationResult`

3. **Safe Expression Evaluation**
   - Uses `expr-eval` or `filtrex` library (NOT `eval()`)
   - Sandboxed evaluation context
   - Prevents code injection attacks

4. **Context Validators**
   - `validatePhone(phone, country)`: Country-specific phone validation
   - `validateEmail(email)`: RFC-compliant email validation
   - `validateTaxId(taxId, country)`: Country-specific tax ID formats
   - Extensible: New validators can be added

5. **GraphQL Mutation Interceptor**
   - Intercepts `createOne`, `updateOne`, `createMany`, `updateMany`
   - Executes validation BEFORE database write
   - Throws GraphQL exception if validation fails (errors)
   - Includes warnings in response metadata

### Frontend

1. **ValidationErrorDisplay Component**
   - Parses GraphQL errors and extracts validation details
   - Shows errors inline next to fields
   - Shows warnings as dismissible notifications
   - User-friendly error messages

2. **Configuration UI**
   - Admin panel at Settings → Data Model → Validation Rules
   - Visual rule builder with:
     - Object and field selectors
     - Validation type selector
     - Condition expression editor
     - Configuration inputs (regex, ranges, etc.)
     - Live preview/test functionality
   - Template library for common validation patterns

### Core Modifications

This extension requires modifications to Twenty's GraphQL layer:

- `packages/twenty-server/src/engine/core-modules/graphql/graphql-query-runner/`
  - Create validation interceptor
  - Inject into mutation pipeline

**All modifications are documented in `AGNI_CUSTOMIZATIONS.md`**

## Usage Examples

### Example 1: Conditional Required Field

```typescript
// Rule: "If stage is 'Closed Lost', lossReason is required"
{
  objectName: "Opportunity",
  ruleName: "Loss Reason Required for Closed Lost",
  type: "required",
  condition: "stage === 'Closed Lost'",
  config: {
    field: "lossReason"
  },
  errorMessage: "Loss reason is required when stage is Closed Lost",
  severity: "error"
}
```

### Example 2: Phone Validation by Country

```typescript
// Rule: "Phone must match Colombia format (10 digits)"
{
  objectName: "Contact",
  ruleName: "Colombia Phone Format",
  type: "format",
  condition: "country === 'Colombia'",
  config: {
    field: "phone",
    pattern: "^[0-9]{10}$"
  },
  errorMessage: "Phone number must be 10 digits for Colombia",
  severity: "error"
}
```

### Example 3: Cross-Field Validation

```typescript
// Rule: "End date must be after start date"
{
  objectName: "Campaign",
  ruleName: "Valid Date Range",
  type: "custom",
  config: {
    expression: "endDate > startDate",
    contextFields: ["startDate", "endDate"]
  },
  errorMessage: "End date must be after start date",
  severity: "error"
}
```

### Example 4: Warning for Large Opportunity

```typescript
// Rule: "Warn if opportunity amount exceeds $100k"
{
  objectName: "Opportunity",
  ruleName: "Large Amount Warning",
  type: "range",
  config: {
    field: "amount",
    max: 100000
  },
  errorMessage: "This is a large opportunity. Please verify all details.",
  severity: "warning"
}
```

## Testing

### Unit Tests
- `engine.test.ts`: 200+ test cases covering all validation types
  - Conditional required fields
  - Format validations (regex, length)
  - Cross-field validations
  - Context-aware validations

- `context-validator.test.ts`: Country-specific validators
  - Phone formats for Colombia, Mexico, etc.
  - Tax ID formats

### Integration Tests
- GraphQL mutation interceptor blocks invalid data
- Multiple rules evaluated correctly
- Error messages returned to client

### E2E Tests
- Create "Closed Lost" opportunity without lossReason → blocked
- Create contact with invalid phone for country → blocked
- Create opportunity with amount > $100k → warning shown but save allowed

**Coverage Target: 90%+ (critical for data integrity)**

## Performance Considerations

- **Redis Caching**: Validation rules cached aggressively (5-minute TTL)
- **Overhead Target**: < 100ms additional latency per mutation
- **Optimization**: Rules loaded once per request, not per field
- **Batch Validation**: Multiple rules evaluated in parallel where possible

## Configuration

### Admin UI

Navigate to: **Settings → Data Model → Validation Rules**

1. Select object (e.g., "Opportunity")
2. Enter rule name
3. Select validation type
4. Define condition (optional, for conditional rules)
5. Configure validation parameters (regex, range, expression)
6. Set error message
7. Choose severity (error or warning)
8. **Test the rule** with sample data
9. Save and activate

### Testing Rules

Use the **Test** feature to validate rules before activation:
1. Enter test data (JSON format)
2. Click "Test Rule"
3. See validation result (pass/fail)
4. Iterate until rule works as expected

### Permissions

- Only workspace **owners** and **admins** can configure rules
- All workspace members are subject to validation rules

## Troubleshooting

### Issue: Validation not firing
- **Check**: Is the rule active?
- **Check**: Does the condition match the record data?
- **Solution**: Use "Test Rule" feature to debug with actual data

### Issue: Expression evaluation error
- **Check**: Is the expression syntax valid?
- **Check**: Do referenced fields exist on the object?
- **Solution**: Review expression syntax, use simple comparisons

### Issue: Performance degradation
- **Check**: How many validation rules are configured?
- **Check**: Are complex expressions being used?
- **Solution**: Optimize expressions, consider caching strategy

## Built-in Validators

### Phone Validators

- **Colombia**: 10 digits, starts with 3
- **Mexico**: 10 digits
- **USA**: 10 digits
- **Spain**: 9 digits

### Email Validator

- RFC 5322 compliant
- Allows common TLDs

### Tax ID Validators

- **Colombia NIT**: 9-10 digits with check digit
- **Mexico RFC**: Alphanumeric 12-13 characters

*Extensible: Add custom validators in `context-validator.service.ts`*

## Migration Notes

When upgrading from Twenty upstream:
1. Check if GraphQL mutation pipeline changed (potential conflict)
2. Verify interceptor still hooks into correct lifecycle
3. Run full test suite to ensure no regressions
4. Review `AGNI_CUSTOMIZATIONS.md` for update instructions

## Security Considerations

- **No `eval()`**: Uses safe expression libraries (`expr-eval`, `filtrex`)
- **Input Sanitization**: All user-provided expressions sanitized
- **Sandboxing**: Expression evaluation runs in isolated context
- **XSS Prevention**: Error messages escaped before rendering

## Related Documentation

- [Technical Specification](../../_bmad-output/implementation-artifacts/tech-spec-agni-crm-fase-0-mvp-custom-extensions.md)
- [AGNI Customizations](../../AGNI_CUSTOMIZATIONS.md)
- [Project Context](../../docs/project-context.md)

## Support

For issues or questions about this extension, contact the Agni CRM development team.
