---
title: 'Agni CRM - Fase 0: MVP Multitenancy con Extensiones Custom'
slug: 'agni-crm-fase-0-mvp-custom-extensions'
created: '2026-01-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Twenty CRM v1.15.0 (fork)', 'NestJS', 'PostgreSQL', 'Redis', 'BullMQ', 'React', 'Recoil', 'TypeScript', 'GraphQL', 'n8n', 'Salesforce API', 'AWS']
files_to_modify: ['agni-crm-twenty/packages/twenty-server/src/', 'agni-crm-twenty/packages/twenty-front/src/', 'agni-crm-twenty/agni-extensions/']
code_patterns: ['NestJS modules', 'GraphQL resolvers', 'React components with Recoil', 'TypeORM entities', 'Nx monorepo structure']
test_patterns: ['Jest', 'Unit tests co-located with source', 'Integration tests in test/ directories']
---

# Tech-Spec: Agni CRM - Fase 0: MVP Multitenancy con Extensiones Custom

**Created:** 2026-01-14

## Overview

### Problem Statement

Implementar un MVP funcional de Agni CRM basado en Twenty CRM (self-hosted en AWS) que permita a 50 dealers gestionar Contactos y Oportunidades de manera independiente pero sincronizada bidireccionalmente con Salesforce. El desafío principal es que Twenty CRM no ofrece nativamente tres capacidades críticas necesarias para el negocio:

1. **Dependent Picklists y Conditional Field Visibility**: No existe forma nativa de controlar qué valores se muestran en listas desplegables basado en otros campos, ni de mostrar/ocultar campos condicionalmente.

2. **Custom Validation Rules Engine**: No hay motor de validaciones personalizadas que permita reglas condicionales complejas (ej: "si etapa = 'Venta perdida', razón de pérdida es obligatoria") ni validaciones de formato por país.

3. **Row-Level Security**: No existe capacidad para restringir la visualización y edición de registros basado en condiciones configurables (ej: "asesor solo ve oportunidades asignadas a él").

Estas limitaciones impiden operar el piloto en producción con los 50 dealers, ya que necesitamos replicar comportamientos críticos del negocio que existen en Salesforce.

### Solution

Desarrollar tres extensiones custom para Twenty CRM que extiendan sus capacidades nativas:

1. **Sistema de Dependent Picklists y Conditional Fields**:
   - Implementar lógica de controlling-dependent fields (ej: País → Estado → Ciudad)
   - Implementar visibility rules para mostrar/ocultar campos según valores de controlling fields
   - Casos de uso: Entidad financiera solo visible si "Método de pago" = "Financiado"

2. **Motor de Validación Custom**:
   - Engine configurable para reglas de validación condicionales
   - Soporte para validaciones de formato (longitud, tipo de dato)
   - Validaciones cross-field y por contexto (ej: validación de teléfono por país)

3. **Row-Level Security Configurable**:
   - Sistema para definir reglas de acceso a nivel de registro
   - Restricciones de visualización y edición basadas en condiciones
   - Configuración por workspace (dealer) y por usuario

Adicionalmente:
- Configurar multitenancy de Twenty (1 workspace por dealer)
- Implementar sincronización bidireccional con Salesforce vía n8n (semi-tiempo real)
- Configurar objetos: Contact y Opportunity (nativos), Catálogo de Productos (custom)

### Scope

**In Scope:**

- ✅ Configuración multitenancy de Twenty para 50 dealers (1 workspace por dealer)
- ✅ Objetos nativos: Contact y Opportunity (mapeados a Salesforce Lead/Contact/Opportunity)
- ✅ Objeto custom: Catálogo de Productos
- ✅ **Extensión 1**: Dependent Picklists + Conditional Field Visibility
  - Sistema de controlling-dependent fields
  - Reglas de visibilidad condicional de campos
  - Configuración declarativa (YAML/JSON)
- ✅ **Extensión 2**: Custom Validation Rules Engine
  - Validaciones condicionales (if-then)
  - Validaciones de formato (regex, longitud, tipo)
  - Validaciones cross-field
  - Validaciones contextuales (por país, por etapa, etc.)
- ✅ **Extensión 3**: Row-Level Security
  - Definición de reglas de acceso por registro
  - Restricciones de visualización
  - Restricciones de edición
  - Configuración por workspace y usuario
- ✅ Sincronización bidireccional vía n8n (semi-tiempo real con frecuencia mínima de n8n)
- ✅ Resolución de conflictos: Salesforce master, Twenty slave
- ✅ Interfaz funcional para gestión de Contactos y Oportunidades
- ✅ Despliegue en ambiente productivo en AWS

**Out of Scope:**

- ❌ Integración con WhatsApp (fases futuras)
- ❌ Funcionalidades de AI nativo
- ❌ Reportería consolidada cross-dealer (se hace desde Salesforce)
- ❌ Integración con Spiga (DMS)
- ❌ Otras entidades de Salesforce más allá de Contact/Opportunity
- ❌ Migración de datos históricos (piloto arranca con datos limpios)
- ❌ Flujos de aprobación
- ❌ Automatizaciones complejas dentro de Twenty (se hacen en n8n)

## Context for Development

### Codebase Patterns

**Arquitectura General:**
- **Twenty CRM Fork v1.15.0**: Base upstream desde https://github.com/twentyhq/twenty/tree/v1.15.0
- **Monorepo Nx**: Estructura de workspace con múltiples packages
- **Backend**: NestJS + PostgreSQL + Redis + BullMQ para jobs
- **Frontend**: React + Recoil (state management) + Emotion (styling)
- **APIs**: GraphQL (principal) + REST API
- **Multitenancy**: Workspaces nativos de Twenty (1 workspace = 1 dealer)

**Stack Tecnológico Detallado:**

Backend:
- NestJS framework (decoradores, dependency injection, módulos)
- PostgreSQL (base de datos principal)
- TypeORM (ORM para entidades)
- Redis (caché y mensajería)
- BullMQ (cola de trabajos asíncronos)
- GraphQL Apollo Server

Frontend:
- React 18+
- Recoil para estado global
- Emotion para CSS-in-JS
- Apollo Client para GraphQL
- TypeScript estricto

Build & Testing:
- Nx monorepo orchestration
- Jest para testing
- TypeScript con configuración estricta
- ESLint + Prettier

**Estructura del Fork:**

```
agni-crm-twenty/  (fork de twentyhq/twenty@v1.15.0)
├── packages/
│   ├── twenty-server/        # Backend NestJS
│   │   ├── src/
│   │   │   ├── engine/       # Core CRM engine
│   │   │   ├── modules/      # Feature modules
│   │   │   └── database/     # TypeORM entities
│   │   └── test/
│   ├── twenty-front/         # Frontend React
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   └── pages/        # Page components
│   └── twenty-ui/            # Shared UI components
├── agni-extensions/          # NUESTRAS EXTENSIONES CUSTOM
│   ├── dependent-fields/     # Extensión 1: Dependent picklists
│   ├── validation-engine/    # Extensión 2: Custom validations
│   └── row-level-security/   # Extensión 3: RLS
└── .github/
    └── workflows/            # CI/CD pipelines
```

**Patrones de Código Twenty:**

1. **Backend (NestJS)**:
   - Módulos con decorador `@Module()`
   - Servicios con `@Injectable()`
   - Resolvers GraphQL con decoradores `@Resolver()`, `@Query()`, `@Mutation()`
   - Entities TypeORM con decoradores de columnas
   - Guards para autorización

2. **Frontend (React + Recoil)**:
   - Componentes funcionales con hooks
   - Estado global con Recoil atoms/selectors
   - Queries GraphQL con Apollo `useQuery()`/`useMutation()`
   - Styled components con Emotion
   - Barrel exports (index.ts por directorio)

3. **GraphQL Schema**:
   - Schema-first approach
   - Custom objects definidos dinámicamente
   - Subscriptions para real-time
   - Field-level permissions integradas

**Patrones de Integración:**
- Sincronización bidireccional semi-tiempo real (frecuencia mínima de n8n)
- Webhooks desde Twenty → n8n → Salesforce
- Polling desde n8n → Salesforce → Twenty
- Conflict resolution: Salesforce master
- n8n workflows ya construidos y funcionando

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `/docs/project-context.md` | Contexto general del proyecto Agni CRM, oportunidad, audiencia, metas |
| `https://github.com/twentyhq/twenty/tree/v1.15.0` | Repositorio upstream de Twenty CRM v1.15.0 (base del fork) |
| `packages/twenty-server/src/engine/` | Core engine de Twenty - lógica de metadata, permisos, queries |
| `packages/twenty-server/src/modules/` | Módulos de negocio (workspace, objects, fields, permissions) |
| `packages/twenty-front/src/modules/object-record/` | Componentes frontend para records (list, detail, forms) |
| `packages/twenty-front/src/modules/ui/` | Componentes UI reutilizables (inputs, forms, fields) |

### Technical Decisions

**TD-001: Sistema Maestro**
- **Decisión**: Salesforce es el sistema maestro (master), Twenty es esclavo (slave)
- **Razón**: Salesforce es el CRM corporativo, fuente de verdad para reportería y compliance
- **Implicación**: En caso de conflictos de datos, Salesforce siempre gana

**TD-002: Estrategia de Multitenancy**
- **Decisión**: Usar workspaces de Twenty, 1 workspace por dealer
- **Razón**: Aislamiento de datos nativo, seguridad, escalabilidad
- **Implicación**: Reportería consolidada debe hacerse desde Salesforce, no desde Twenty

**TD-003: Fork vs Custom Apps**
- **Decisión**: Hacer FORK de Twenty v1.15.0, NO usar custom apps/plugins
- **Razón**: Las 3 funcionalidades requeridas (dependent fields, validation engine, row-level security) NO existen en Twenty nativo y no hay APIs/hooks para implementarlas sin modificar el core. Row-level security está explícitamente no priorizado para 2026. El SDK de extensiones v2 está en desarrollo pero no listo para producción.
- **Implicación**:
  - Mantener fork sincronizado con upstream para security patches
  - Documentar exhaustivamente todos los cambios custom vs upstream
  - Aislar extensiones custom en directorio `agni-extensions/`
  - Evaluar cada 6 meses si el SDK permite migrar a custom apps
  - Cherry-pick security fixes de upstream, revisar major releases antes de merge
- **Alternativa descartada**: Esperar SDK v2 (delay de 6-12 meses, incompatible con time-to-market de Fase 0)
- **Fuentes**: [Row-level security no disponible](https://github.com/twentyhq/twenty/discussions/209), [User roles issue](https://github.com/twentyhq/twenty/issues/10421), [Validation PR revertido](https://github.com/twentyhq/twenty/pull/15491)

**TD-004: Sincronización Semi-Tiempo Real**
- **Decisión**: Usar frecuencia mínima configurable de n8n (no tiempo real estricto)
- **Razón**: Balance entre actualización oportuna y carga en APIs
- **Implicación**: Puede haber delay de segundos/minutos entre sistemas

**TD-005: Estrategia de Gestión del Fork**
- **Decisión**: Estructura de branches: `main` (upstream mirror) → `agni-dev` (extensiones custom) → `agni-production`
- **Razón**: Separación clara entre código upstream y custom, facilita merge de security patches
- **Implicación**:
  - Todos los cambios custom van a `agni-extensions/` directory
  - Modificaciones al core de Twenty deben documentarse en `AGNI_CUSTOMIZATIONS.md`
  - CI/CD debe validar que no se rompe compatibilidad con APIs de Twenty
  - Revisión trimestral de nuevas releases upstream para evaluar merge
- **Estrategia de actualización**:
  - Security patches: cherry-pick inmediato
  - Minor releases: evaluación mensual
  - Major releases: evaluación caso por caso (puede requerir refactor de extensiones)

## Implementation Plan

### Tasks

**Fase Preparación: Fork y Configuración Base**

- [X] **TASK-001: Crear Fork y Estructura Base**
  - File: Repositorio nuevo `agni-crm-twenty`
  - Action: Fork de `https://github.com/twentyhq/twenty` en tag `v1.15.0`
  - Action: Configurar remotes: `upstream` (twentyhq/twenty) y `origin` (agni fork)
  - Action: Crear estructura de branches: `main` (mirror upstream) → `agni-dev` → `agni-production`
  - Action: Crear directorio `agni-extensions/` en root del monorepo
  - Notes: Documentar estrategia de branches en README.md del fork

- [X] **TASK-002: Crear Estructura de Extensiones**
  - File: `agni-extensions/dependent-fields/`
  - File: `agni-extensions/validation-engine/`
  - File: `agni-extensions/row-level-security/`
  - Action: Crear estructura de directorios para cada extensión:
    ```
    agni-extensions/
    ├── dependent-fields/
    │   ├── backend/
    │   ├── frontend/
    │   ├── shared/
    │   └── tests/
    ├── validation-engine/
    │   ├── backend/
    │   ├── frontend/
    │   ├── shared/
    │   └── tests/
    └── row-level-security/
        ├── backend/
        ├── frontend/
        ├── shared/
        └── tests/
    ```
  - Action: Crear `README.md` en cada extensión documentando propósito y arquitectura
  - Notes: Cada extensión tendrá backend (NestJS), frontend (React), shared (tipos TS), tests (Jest)

- [X] **TASK-003: Crear Documento de Customizaciones**
  - File: `AGNI_CUSTOMIZATIONS.md` en root del fork
  - Action: Documentar template para tracking de cambios custom vs upstream:
    ```markdown
    # Agni CRM Customizations

    ## Extensiones Custom
    - Dependent Fields (agni-extensions/dependent-fields/)
    - Validation Engine (agni-extensions/validation-engine/)
    - Row-Level Security (agni-extensions/row-level-security/)

    ## Modificaciones al Core de Twenty
    (Documentar aquí cualquier cambio directo a packages/twenty-server o twenty-front)

    ## Compatibilidad
    - Base: Twenty v1.15.0
    - Última sincronización upstream: YYYY-MM-DD
    - Security patches aplicados: [lista]
    ```
  - Notes: Actualizar este documento cada vez que se modifique código de Twenty

- [X] **TASK-004: Configurar CI/CD para el Fork**
  - File: `.github/workflows/agni-ci.yml`
  - Action: Crear workflow CI que ejecute:
    - Tests de Twenty (asegurar no romper funcionalidad base)
    - Tests de extensiones custom (agni-extensions/)
    - Linting y type-checking
    - Build completo del monorepo
  - Action: Configurar branch protection para `agni-production`
  - Notes: Reusar workflows existentes de Twenty y extenderlos

---

**Extensión 1: Dependent Fields System**

- [ ] **TASK-101: Diseñar Schema de Configuración Dependent Fields**
  - File: `agni-extensions/dependent-fields/shared/types.ts`
  - Action: Definir tipos TypeScript para configuración de dependent fields:
    ```typescript
    interface DependentFieldRule {
      id: string;
      objectName: string; // ej: "Opportunity"
      controllingField: string;
      dependentField: string;
      type: 'values' | 'visibility';
      mappings: DependentFieldMapping[];
    }

    interface DependentFieldMapping {
      controllingValue: string | string[];
      dependentValues?: string[]; // para type='values'
      visible?: boolean; // para type='visibility'
    }
    ```
  - Action: Definir estructura de almacenamiento (tabla PostgreSQL vs JSON metadata)
  - Notes: Considerar performance: cachear reglas en Redis

- [ ] **TASK-102: Implementar Backend - Metadata Storage**
  - File: `agni-extensions/dependent-fields/backend/dependent-field-metadata.service.ts`
  - Action: Crear NestJS service para CRUD de reglas dependent fields
  - Action: Métodos: `createRule()`, `updateRule()`, `deleteRule()`, `getRulesByObject()`, `getRulesByField()`
  - File: `packages/twenty-server/src/database/typeorm/metadata/dependent-field-rule.entity.ts`
  - Action: Crear TypeORM entity para almacenar reglas en PostgreSQL
  - Action: Agregar relación a workspace (multitenancy)
  - Notes: Cada workspace tiene sus propias reglas

- [ ] **TASK-103: Implementar Backend - GraphQL API**
  - File: `agni-extensions/dependent-fields/backend/dependent-field.resolver.ts`
  - Action: Crear GraphQL resolver con mutations y queries:
    - `createDependentFieldRule(input: DependentFieldRuleInput): DependentFieldRule`
    - `updateDependentFieldRule(id: ID!, input: DependentFieldRuleInput): DependentFieldRule`
    - `deleteDependentFieldRule(id: ID!): Boolean`
    - `getDependentFieldRules(objectName: String!): [DependentFieldRule]`
  - Action: Agregar guards de permisos (solo admins pueden configurar)
  - Notes: Reusar sistema de permisos existente de Twenty

- [ ] **TASK-104: Implementar Backend - Evaluation Engine**
  - File: `agni-extensions/dependent-fields/backend/dependent-field-evaluator.service.ts`
  - Action: Crear service para evaluar reglas en runtime:
    - `evaluateValues(rule: DependentFieldRule, controllingValue: any): string[]`
    - `evaluateVisibility(rule: DependentFieldRule, controllingValue: any): boolean`
  - Action: Implementar caché de reglas en Redis (key: `workspace:object:field`)
  - Action: Integrar con GraphQL resolvers de object-record para aplicar filtros automáticamente
  - Notes: Evaluar en cada query de field metadata

- [ ] **TASK-105: Modificar Core - Field Metadata Resolver**
  - File: `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.resolver.ts`
  - Action: Inyectar `DependentFieldEvaluatorService`
  - Action: En query `findMany` de fields, aplicar evaluación de reglas:
    - Si field es dependent, filtrar `options` basado en controlling value
    - Si field tiene visibility rule, agregar flag `isVisible`
  - Action: Documentar cambio en `AGNI_CUSTOMIZATIONS.md`
  - Notes: MODIFICACIÓN AL CORE - revisar en cada merge upstream

- [ ] **TASK-106: Implementar Frontend - Hook useDependentFields**
  - File: `agni-extensions/dependent-fields/frontend/hooks/useDependentFields.ts`
  - Action: Crear custom hook React:
    ```typescript
    function useDependentFields(objectName: string, fieldName: string, controllingValue: any) {
      // Query GraphQL para obtener reglas
      // Evaluar reglas localmente
      // Return: { availableOptions, isVisible }
    }
    ```
  - Action: Usar Apollo Client para queries GraphQL
  - Action: Implementar caché local con Recoil atoms
  - Notes: Optimizar para no hacer queries redundantes

- [ ] **TASK-107: Modificar Core - Field Input Components**
  - File: `packages/twenty-front/src/modules/ui/field/input/components/FieldInput.tsx`
  - Action: Importar y usar `useDependentFields` hook
  - Action: Si field tiene reglas dependent:
    - Para SELECT fields: filtrar opciones disponibles dinámicamente
    - Para cualquier field: aplicar visibility rule (mostrar/ocultar)
  - Action: Agregar loading state mientras se evalúan reglas
  - Action: Documentar cambio en `AGNI_CUSTOMIZATIONS.md`
  - Notes: MODIFICACIÓN AL CORE - componente crítico de UI

- [ ] **TASK-108: Implementar Frontend - UI de Configuración**
  - File: `agni-extensions/dependent-fields/frontend/components/DependentFieldsConfig.tsx`
  - Action: Crear página de administración para configurar reglas
  - Action: Componentes:
    - Tabla de reglas existentes
    - Form para crear/editar regla (controlling field, dependent field, mappings)
    - Preview de comportamiento
  - File: `packages/twenty-front/src/modules/settings/data-model/` (agregar link a config)
  - Action: Integrar página en Settings → Data Model
  - Notes: Solo visible para workspace admins

- [ ] **TASK-109: Tests Dependent Fields**
  - File: `agni-extensions/dependent-fields/tests/`
  - Action: Unit tests del evaluator service (100+ casos)
  - Action: Integration tests de GraphQL API (CRUD de reglas)
  - Action: Frontend tests de useDependentFields hook
  - Action: E2E test: flujo País → Estado → Ciudad
  - Action: E2E test: Método de pago → Entidad financiera (visibility)
  - Notes: Coverage mínimo 85%

---

**Extensión 2: Custom Validation Engine**

- [ ] **TASK-201: Diseñar Schema de Validation Rules**
  - File: `agni-extensions/validation-engine/shared/types.ts`
  - Action: Definir tipos para validation rules:
    ```typescript
    interface ValidationRule {
      id: string;
      objectName: string;
      ruleName: string;
      type: 'required' | 'format' | 'range' | 'custom';
      condition?: string; // expresión condicional (ej: "stage === 'Closed Lost'")
      config: ValidationConfig;
      errorMessage: string;
      severity: 'error' | 'warning';
    }

    interface ValidationConfig {
      // Para type='required'
      field?: string;

      // Para type='format'
      pattern?: string; // regex
      minLength?: number;
      maxLength?: number;

      // Para type='range'
      min?: number;
      max?: number;

      // Para type='custom'
      expression?: string; // expresión evaluable
      contextFields?: string[]; // campos necesarios para evaluación
    }
    ```
  - Notes: Soportar expresiones simples (evaluar con biblioteca segura, no eval())

- [ ] **TASK-202: Implementar Backend - Validation Rule Storage**
  - File: `agni-extensions/validation-engine/backend/validation-rule.service.ts`
  - Action: Crear service para CRUD de validation rules
  - File: `packages/twenty-server/src/database/typeorm/metadata/validation-rule.entity.ts`
  - Action: Crear entity TypeORM para almacenar reglas
  - Action: Relación a workspace y object-metadata
  - Notes: Reglas por workspace (multitenancy)

- [ ] **TASK-203: Implementar Backend - Validation Engine Core**
  - File: `agni-extensions/validation-engine/backend/validation-engine.service.ts`
  - Action: Implementar engine de validación:
    - `validateRecord(objectName: string, recordData: any, operation: 'create'|'update'): ValidationResult`
  - Action: Evaluador de condiciones (usar biblioteca como `expr-eval` o `filtrex`)
  - Action: Evaluador de formatos (regex patterns)
  - Action: Evaluador de rangos
  - Action: Cache de reglas en Redis (por workspace + object)
  - Notes: Performance crítica - puede ejecutarse miles de veces/min

- [ ] **TASK-204: Implementar Backend - Context-Aware Validations**
  - File: `agni-extensions/validation-engine/backend/context-validator.service.ts`
  - Action: Implementar validaciones contextuales:
    - Validación de teléfono por país: `validatePhone(phone: string, country: string)`
    - Soporte para reglas cross-field
  - Action: Biblioteca de validadores comunes:
    - `phoneValidators` (por país)
    - `emailValidator`
    - `taxIdValidator` (por país)
  - Notes: Extensible - permitir agregar custom validators

- [ ] **TASK-205: Modificar Core - GraphQL Mutation Interceptor**
  - File: `packages/twenty-server/src/engine/core-modules/graphql/graphql-query-runner/` (crear interceptor)
  - Action: Crear NestJS interceptor que se ejecute ANTES de mutations de object-record
  - Action: En `createOne`, `updateOne`, `createMany`, `updateMany`:
    - Ejecutar `validationEngine.validateRecord()`
    - Si hay errors → lanzar GraphQL exception con detalles
    - Si hay warnings → incluir en response metadata
  - Action: Documentar en `AGNI_CUSTOMIZATIONS.md`
  - Notes: MODIFICACIÓN AL CORE - punto crítico de validación

- [ ] **TASK-206: Implementar Backend - GraphQL API de Reglas**
  - File: `agni-extensions/validation-engine/backend/validation-rule.resolver.ts`
  - Action: Crear resolver GraphQL:
    - `createValidationRule(input: ValidationRuleInput): ValidationRule`
    - `updateValidationRule(id: ID!, input: ValidationRuleInput): ValidationRule`
    - `deleteValidationRule(id: ID!): Boolean`
    - `getValidationRules(objectName: String!): [ValidationRule]`
    - `testValidationRule(ruleId: ID!, testData: JSON): ValidationResult`
  - Notes: Método `testValidationRule` para probar reglas antes de activar

- [ ] **TASK-207: Implementar Frontend - Validation Error Display**
  - File: `agni-extensions/validation-engine/frontend/components/ValidationErrorDisplay.tsx`
  - Action: Componente React para mostrar errores de validación
  - Action: Parsear GraphQL errors y extraer detalles de validación
  - Action: Mostrar errors inline en forms (junto a campo)
  - Action: Mostrar warnings como notificaciones (no bloquean save)
  - File: `packages/twenty-front/src/modules/object-record/record-form/` (integrar componente)
  - Notes: UX crítica - errores claros y accionables

- [ ] **TASK-208: Implementar Frontend - UI de Configuración de Reglas**
  - File: `agni-extensions/validation-engine/frontend/components/ValidationRulesConfig.tsx`
  - Action: Crear página de admin para configurar validation rules
  - Action: Form builder con:
    - Selector de object y campo
    - Selector de tipo de validación
    - Editor de condición (if-then)
    - Editor de configuración (regex, rangos, etc.)
    - Preview/test en vivo
  - File: `packages/twenty-front/src/modules/settings/data-model/` (link)
  - Notes: Incluir ejemplos y templates comunes

- [ ] **TASK-209: Tests Validation Engine**
  - File: `agni-extensions/validation-engine/tests/`
  - Action: Unit tests del validation engine (200+ casos)
    - Validaciones required con condiciones
    - Validaciones de formato (regex, longitud)
    - Validaciones cross-field
    - Validaciones contextuales (teléfono por país)
  - Action: Integration tests de interceptor en mutations
  - Action: E2E test: "Venta perdida" sin razón → bloqueado
  - Action: E2E test: Teléfono Colombia (10 dígitos) vs México (10 dígitos)
  - Notes: Coverage mínimo 90% (crítico para data integrity)

---

**Extensión 3: Row-Level Security**

- [ ] **TASK-301: Diseñar Schema de RLS Rules**
  - File: `agni-extensions/row-level-security/shared/types.ts`
  - Action: Definir tipos para RLS rules:
    ```typescript
    interface RLSRule {
      id: string;
      objectName: string;
      ruleName: string;
      roleIds: string[]; // roles afectados por esta regla
      operation: 'read' | 'update' | 'delete' | '*';
      condition: string; // expresión (ej: "ownerId === currentUser.id")
      priority: number; // orden de evaluación
      effect: 'allow' | 'deny';
    }

    interface RLSContext {
      currentUserId: string;
      workspaceId: string;
      userRoles: string[];
      record: any; // el registro siendo accedido
    }
    ```
  - Notes: Modelo similar a AWS IAM policies

- [ ] **TASK-302: Implementar Backend - RLS Rule Storage**
  - File: `agni-extensions/row-level-security/backend/rls-rule.service.ts`
  - Action: Service para CRUD de RLS rules
  - File: `packages/twenty-server/src/database/typeorm/metadata/rls-rule.entity.ts`
  - Action: Entity para almacenar reglas RLS
  - Action: Relación a workspace, object-metadata, roles
  - Notes: Reglas por workspace

- [ ] **TASK-303: Implementar Backend - RLS Evaluation Engine**
  - File: `agni-extensions/row-level-security/backend/rls-engine.service.ts`
  - Action: Implementar motor de evaluación RLS:
    - `evaluateAccess(context: RLSContext, rules: RLSRule[], operation: string): boolean`
  - Action: Evaluador de condiciones con contexto seguro
  - Action: Lógica de priority (reglas más altas evalúan primero)
  - Action: Effect composition (deny gana sobre allow)
  - Action: Cache de reglas en Redis
  - Notes: Performance CRÍTICA - evaluación en cada query

- [ ] **TASK-304: Modificar Core - Query Filter Injection**
  - File: `packages/twenty-server/src/engine/api/graphql/graphql-query-runner/graphql-query-runner.service.ts`
  - Action: Inyectar `RLSEngineService` en query runner
  - Action: ANTES de ejecutar queries de `findMany`, `findOne`:
    - Obtener RLS rules para object + user roles
    - Generar WHERE clause adicional basado en reglas allowed
    - Inyectar WHERE clause en query TypeORM
  - Action: Para mutations (`updateOne`, `deleteOne`):
    - Primero fetch record
    - Evaluar RLS con record data
    - Si denied → lanzar Forbidden exception
  - Action: Documentar extensivamente en `AGNI_CUSTOMIZATIONS.md`
  - Notes: MODIFICACIÓN MUY CRÍTICA AL CORE - afecta TODAS las queries

- [ ] **TASK-305: Implementar Backend - RLS Cache Strategy**
  - File: `agni-extensions/row-level-security/backend/rls-cache.service.ts`
  - Action: Implementar estrategia de caché agresiva:
    - Key: `rls:{workspaceId}:{objectName}:{roleIds}`
    - TTL: 5 minutos (configurable)
    - Invalidación: cuando se modifica rule
  - Action: Warm-up cache en inicio de workspace
  - Notes: Sin cache, RLS puede degradar performance 10x

- [ ] **TASK-306: Implementar Backend - GraphQL API RLS**
  - File: `agni-extensions/row-level-security/backend/rls-rule.resolver.ts`
  - Action: Resolver GraphQL para RLS:
    - `createRLSRule(input: RLSRuleInput): RLSRule`
    - `updateRLSRule(id: ID!, input: RLSRuleInput): RLSRule`
    - `deleteRLSRule(id: ID!): Boolean`
    - `getRLSRules(objectName: String!): [RLSRule]`
    - `testRLSRule(ruleId: ID!, testContext: JSON): RLSTestResult`
  - Action: Solo workspace owners pueden configurar RLS
  - Notes: Testing de reglas antes de activar es crucial

- [ ] **TASK-307: Implementar Frontend - UI de Configuración RLS**
  - File: `agni-extensions/row-level-security/frontend/components/RLSRulesConfig.tsx`
  - Action: Página de admin para RLS rules
  - Action: UI components:
    - Lista de reglas por object
    - Form para crear/editar regla
    - Expression builder visual (ej: "Owner equals Current User")
    - Preview de efecto (qué registros vería cada rol)
  - File: `packages/twenty-front/src/modules/settings/security/` (nueva sección)
  - Action: Crear sección "Security" en Settings si no existe
  - Notes: UX debe ser intuitiva - RLS es complejo

- [ ] **TASK-308: Implementar Frontend - RLS Debug Mode**
  - File: `agni-extensions/row-level-security/frontend/components/RLSDebugPanel.tsx`
  - Action: Panel de debugging (solo para admins):
    - Mostrar qué RLS rules aplicaron a query actual
    - Mostrar registros filtrados vs total
    - Mostrar WHERE clauses generados
  - Action: Toggle en developer settings
  - Notes: Esencial para troubleshooting de reglas

- [ ] **TASK-309: Tests Row-Level Security**
  - File: `agni-extensions/row-level-security/tests/`
  - Action: Unit tests de RLS engine (300+ casos)
    - Evaluación de condiciones simples y complejas
    - Priority y effect composition
    - Performance con 100+ reglas
  - Action: Integration tests:
    - Query filtering automático
    - Mutation blocking
    - Cache invalidation
  - Action: E2E tests:
    - Asesor A no ve oportunidades de Asesor B
    - Supervisor ve todas las oportunidades de su dealer
    - Admin ve todo
  - Action: Performance tests (query overhead < 10%)
  - Notes: Coverage 95% - seguridad crítica

---

**Integración y Deployment**

- [ ] **TASK-401: Configurar Multitenancy - 50 Workspaces**
  - File: Scripts de migración/seed
  - Action: Crear script para bulk creation de 50 workspaces (dealers)
  - Action: Configurar workspace settings por dealer
  - Action: Asignar users a workspaces
  - Notes: Usar API de Twenty o directo a DB

- [ ] **TASK-402: Configurar Objetos Custom - Catálogo de Productos**
  - File: Via UI o script de migración
  - Action: Crear custom object "Product" con campos:
    - Name, SKU, Category, Price, Stock, etc.
  - Action: Configurar permisos object-level
  - Action: Mapear a objeto custom de Salesforce
  - Notes: Puede hacerse via Twenty UI

- [ ] **TASK-403: Validar Flujos n8n Existentes**
  - File: n8n workflows (external)
  - Action: Revisar workflows existentes de sincronización
  - Action: Verificar webhooks de Twenty están configurados
  - Action: Test de sincronización bidireccional Contact y Opportunity
  - Action: Verificar conflict resolution (Salesforce master)
  - Notes: Flujos ya construidos - solo validar funcionamiento

- [ ] **TASK-404: Configurar Reglas de Negocio Iniciales**
  - Action: Configurar dependent fields:
    - País → Estado → Ciudad
    - Método de pago → Entidad financiera
  - Action: Configurar validation rules:
    - Etapa "Venta perdida" → Razón obligatoria
    - Validación teléfono por país
  - Action: Configurar RLS rules:
    - Asesor: solo oportunidades asignadas a él
    - Supervisor: todas las oportunidades del workspace
  - Notes: Via UIs de configuración creadas

- [ ] **TASK-405: Testing de Integración E2E**
  - File: `packages/twenty-e2e/` (si existe) o crear suite separada
  - Action: Tests E2E completos:
    - Crear contacto en Twenty → sincroniza a Salesforce
    - Modificar oportunidad en Salesforce → sincroniza a Twenty
    - Conflict resolution (Salesforce gana)
    - Dependent fields funcionan en flujo completo
    - Validations bloquean datos inválidos
    - RLS funciona correctamente por rol
  - Notes: Testing en ambiente staging antes de producción

- [ ] **TASK-406: Documentación de Deployment**
  - File: `docs/deployment/AGNI_DEPLOYMENT.md`
  - Action: Documentar proceso completo de deployment:
    - Cómo hacer build del fork
    - Variables de entorno requeridas
    - Migración de base de datos
    - Deployment en AWS (ECS/EKS)
    - Configuración de Redis cluster
    - Health checks y monitoring
  - Action: Documentar rollback procedure
  - Notes: Incluir troubleshooting común

- [ ] **TASK-407: Plan de Migración a Producción**
  - File: `docs/deployment/PRODUCTION_MIGRATION.md`
  - Action: Documentar plan de go-live:
    - Fase 1: Piloto con 5 dealers (1 semana)
    - Fase 2: Escalar a 25 dealers (2 semanas)
    - Fase 3: Todos los 50 dealers
  - Action: Criterios de éxito por fase
  - Action: Plan de rollback por fase
  - Notes: Approach incremental reduce riesgo

- [ ] **TASK-408: Configurar Monitoring y Alertas**
  - File: Configuración de CloudWatch/Datadog/etc.
  - Action: Configurar métricas clave:
    - Performance de RLS (query overhead)
    - Errores de validación (tasa y tipos)
    - Sincronización n8n (latencia, fallos)
    - Health de servicios (Twenty, Redis, PostgreSQL)
  - Action: Alertas para anomalías
  - Notes: Observabilidad crítica para producción

### Acceptance Criteria

**AC Generales del Fork**

- [ ] **AC-001**: Given el fork está configurado, when se ejecuta `yarn install && yarn build`, then el build completa sin errores y genera artefactos en `dist/`
- [ ] **AC-002**: Given se hace merge de un security patch de upstream, when se ejecutan tests, then todos los tests de Twenty + extensiones custom pasan
- [ ] **AC-003**: Given existe documentación de customizaciones, when se revisa `AGNI_CUSTOMIZATIONS.md`, then lista todas las modificaciones al core y ubicación de extensiones

**AC Extensión 1: Dependent Fields**

- [ ] **AC-101**: Given un campo "Método de pago" con valor "Financiado", when se carga el formulario, then el campo "Entidad financiera" es visible y editable
- [ ] **AC-102**: Given un campo "Método de pago" con valor "Contado", when se carga el formulario, then el campo "Entidad financiera" NO es visible
- [ ] **AC-103**: Given un campo "País" con valor "Colombia", when se abre el dropdown "Estado", then solo muestra departamentos de Colombia
- [ ] **AC-104**: Given un campo "Estado" con valor "Antioquia", when se abre dropdown "Ciudad", then solo muestra ciudades de Antioquia
- [ ] **AC-105**: Given un usuario admin configura regla dependent, when guarda la regla, then la regla se persiste en DB y se aplica inmediatamente
- [ ] **AC-106**: Given una regla dependent está activa, when se hace query GraphQL de field metadata, then los `options` están filtrados según controlling value
- [ ] **AC-107**: Given múltiples workspaces tienen reglas diferentes, when user en workspace A carga form, then solo ve reglas de su workspace
- [ ] **AC-108**: Given error al evaluar regla dependent, when ocurre el error, then se muestra mensaje de error claro y form sigue editable (graceful degradation)

**AC Extensión 2: Validation Engine**

- [ ] **AC-201**: Given oportunidad en etapa "Venta perdida" sin campo "Razón de pérdida", when se intenta guardar, then se rechaza con error "Razón de pérdida es obligatoria cuando etapa es Venta perdida"
- [ ] **AC-202**: Given contacto con país "Colombia" y teléfono "123", when se intenta guardar, then se rechaza con error "Teléfono debe tener 10 dígitos para Colombia"
- [ ] **AC-203**: Given contacto con país "México" y teléfono "1234567890" (10 dígitos), when se guarda, then se acepta exitosamente
- [ ] **AC-204**: Given validation rule con severity "warning", when se violan las reglas, then se permite guardar pero se muestra warning en UI
- [ ] **AC-205**: Given múltiples validation rules aplican a un record, when se valida, then se retornan TODOS los errores (no solo el primero)
- [ ] **AC-206**: Given admin configura nueva validation rule, when usa "Test" feature, then puede probar la regla con datos de ejemplo sin activarla
- [ ] **AC-207**: Given validation rule con expresión inválida, when se intenta guardar la regla, then se rechaza con error de sintaxis
- [ ] **AC-208**: Given record que pasa validaciones, when se guarda, then no hay overhead perceptible en tiempo de respuesta (< 100ms adicional)

**AC Extensión 3: Row-Level Security**

- [ ] **AC-301**: Given asesor "Juan" logged in, when hace query de oportunidades, then solo ve oportunidades donde `ownerId = Juan.id`
- [ ] **AC-302**: Given supervisor logged in, when hace query de oportunidades, then ve TODAS las oportunidades de su workspace
- [ ] **AC-303**: Given asesor "Juan" intenta acceder a oportunidad de "María", when hace query por ID, then recibe error "Record not found" (no exponer existencia)
- [ ] **AC-304**: Given asesor "Juan" intenta actualizar oportunidad de "María", when hace mutation, then recibe error "Forbidden"
- [ ] **AC-305**: Given admin configura RLS rule, when guarda rule, then la regla se aplica inmediatamente en próxima query
- [ ] **AC-306**: Given multiple RLS rules con diferentes priorities, when se evalúan, then se evalúan en orden de priority (mayor primero)
- [ ] **AC-307**: Given RLS rule con effect "deny" y otra con "allow", when ambas aplican, then deny gana (más restrictivo)
- [ ] **AC-308**: Given workspace sin RLS rules configurado, when user hace query, then ve todos los registros (backward compatible)
- [ ] **AC-309**: Given query con RLS activo, when se ejecuta, then overhead de performance es < 10% vs query sin RLS
- [ ] **AC-310**: Given admin usa RLS debug mode, when hace query, then ve panel con reglas aplicadas y registros filtrados

**AC Integración y Deployment**

- [ ] **AC-401**: Given 50 workspaces configurados, when se listan workspaces, then existen 50 workspaces con nombres de dealers
- [ ] **AC-402**: Given objeto custom "Product" creado, when se consulta via GraphQL, then tiene todos los campos definidos (Name, SKU, etc.)
- [ ] **AC-403**: Given flujo n8n activo, when se crea Contact en Twenty, then se crea en Salesforce en < 2 minutos
- [ ] **AC-404**: Given flujo n8n activo, when se modifica Opportunity en Salesforce, then se actualiza en Twenty en < 2 minutos
- [ ] **AC-405**: Given conflicto de datos (mismo record modificado en ambos lados), when n8n detecta conflicto, then versión de Salesforce gana
- [ ] **AC-406**: Given deployment en AWS, when se accede a la URL de Twenty, then la aplicación carga sin errores
- [ ] **AC-407**: Given ambiente de producción, when se monitorea por 24 horas, then no hay errores críticos y uptime > 99%
- [ ] **AC-408**: Given asesor de venta usa la aplicación, when gestiona 10 oportunidades, then NPS del usuario > 8/10 (criterio de éxito de negocio)

## Additional Context

### Dependencies

**Externas:**
- ✅ Twenty CRM v1.15.0 instalado y funcionando en AWS (confirmado)
- ✅ n8n configurado con flujos bidireccionales Salesforce ↔ Twenty (confirmado - ya construidos)
- ✅ Salesforce org con APIs habilitadas (confirmado)
- ✅ Credenciales y permisos para integración (confirmado)
- AWS infraestructura (RDS PostgreSQL, ElastiCache Redis, ECS/EKS para containers)

**Técnicas (del fork Twenty v1.15.0):**
- Node.js 18+ / Yarn 3+
- PostgreSQL 14+
- Redis 6+
- NestJS framework y dependencias
- React 18+ y dependencias frontend
- Nx CLI para monorepo
- TypeScript 5+

**Conocimiento Requerido:**
- ✅ Arquitectura de Twenty CRM v1.15.0 (investigado en Step 2)
- ⚠️ Profundizar en: Sistema de permisos de Twenty (object-level, field-level)
- ⚠️ Profundizar en: Metadata engine de Twenty (custom objects/fields)
- ⚠️ Profundizar en: GraphQL schema generation dinámica
- ⚠️ Profundizar en: Sistema de workspaces/multitenancy
- Mapeo de objetos Salesforce ↔ Twenty (Contact, Opportunity, custom Product catalog)

**Bloqueadores Potenciales:**
- Complejidad de modificar el permission engine sin romper funcionalidad existente
- Performance de validaciones custom en GraphQL resolvers (puede requerir optimización)
- Compatibilidad de extensiones custom al hacer merge de security patches upstream

### Testing Strategy

**Framework**: Jest (configurado en el monorepo de Twenty)

**Estructura de Tests**:
- Unit tests co-ubicados con el código fuente
- Integration tests en directorios `test/` separados
- E2E tests (si se requieren) en `packages/twenty-e2e/`

**Cobertura Requerida para Extensiones Custom**:

1. **Dependent Fields Extension**:
   - Unit: Lógica de cascada de valores (controlling → dependent)
   - Unit: Reglas de visibilidad condicional
   - Integration: GraphQL queries con campos dependientes
   - E2E: Flujo completo País → Estado → Ciudad en UI

2. **Validation Engine Extension**:
   - Unit: Evaluación de reglas condicionales (if-then)
   - Unit: Validadores de formato (regex, longitud)
   - Unit: Validaciones cross-field
   - Integration: Mutations GraphQL con validaciones activas
   - E2E: Rechazo de "Venta perdida" sin razón

3. **Row-Level Security Extension**:
   - Unit: Evaluación de reglas de acceso
   - Unit: Filtros de query por usuario/workspace
   - Integration: Queries GraphQL retornan solo registros permitidos
   - Integration: Mutations rechazadas para registros sin permiso
   - E2E: Asesor A no ve oportunidades de Asesor B

**Estrategia de Testing**:
- TDD para lógica crítica de permisos y validaciones
- Snapshots para componentes UI de campos dependientes
- Mocks de Salesforce API en tests de integración
- Tests de regresión cada vez que se merge de upstream

**CI/CD**:
- Tests automáticos en cada PR
- Coverage mínimo: 80% para extensiones custom
- Smoke tests en ambiente de staging antes de producción

### Notes

**Contexto de Negocio:**
- Piloto inicial con ~50 dealers en Colombia (foco Medellín)
- Usuarios: Asesores de venta y responsables comerciales
- Objetivo: Aumentar 70% registro manual de leads, NPS >8
- Filosofía: "Menos clics, más tiempo para vender"

**Casos de Uso Críticos a Validar:**

1. **Dependent Picklists**:
   - País → Estado → Ciudad (cascada de 3 niveles)
   - Método de pago → Entidad financiera (condicional 2 niveles)

2. **Custom Validations**:
   - Etapa "Venta perdida" → Razón de pérdida obligatoria
   - Validación de teléfono por país (longitud variable)

3. **Row-Level Security**:
   - Asesor solo ve oportunidades asignadas a él
   - Supervisor ve todas las oportunidades de su dealer
