# Agni CRM Customizations

> **Fork de Twenty CRM** - Tracking de cambios custom vs upstream

---

## 📚 Sobre Este Documento

Este archivo documenta todas las customizaciones y extensiones que Agni CRM agrega al fork de Twenty CRM. Se actualiza con cada cambio para facilitar:
- Merges desde upstream
- Troubleshooting
- Onboarding de nuevos desarrolladores

---

## 🧩 Extensiones Custom

### 1. Row-Level Security (RLS)
**Ubicación:** `agni-extensions/row-level-security/`  
**Estado:** 🟡 En desarrollo  
**Tareas Linear:** INN-41 (parent), INN-42 a INN-49

**Descripción:**  
Sistema de seguridad a nivel de fila que permite definir reglas de acceso granulares basadas en roles y condiciones custom. Extiende el sistema de permisos nativo de Twenty.

**Archivos:**
- `agni-extensions/row-level-security/shared/types.ts` - Tipos compartidos
- `agni-extensions/row-level-security/backend/`
  - `rls-rule.service.ts` - Service CRUD para reglas (con invalidación de caché) ✨ **INN-46**
  - `rls-engine.service.ts` - Motor de evaluación de reglas (usa caché) ✨ **INN-46**
  - `rls-cache.service.ts` - Cache de reglas por workspace ✨ **INN-46**
  - `rls-rule.resolver.ts` - Resolver GraphQL para API de RLS ✨ **INN-45**
  - `dtos/` - DTOs para GraphQL ✨ **INN-45**
    - `create-rls-rule.dto.ts` - Input para crear regla
    - `update-rls-rule.dto.ts` - Input para actualizar regla
    - `get-rls-rule.dto.ts` - Inputs para obtener/eliminar reglas
    - `test-rls-rule.dto.ts` - Input y resultado para testing de reglas
  - `types/rls-context.type.ts` - Tipos de contexto de evaluación ✨ **INN-48**
  - `utils/expression-evaluator.util.ts` - Evaluador de expresiones lógicas ✨ **INN-48**
  - `utils/build-rls-context.util.ts` - Helper para construir contexto ✨ **INN-48**
- `agni-extensions/row-level-security/tests/`
  - `expression-evaluator.spec.ts` - Tests del evaluador ✨ **INN-48**
- `packages/twenty-server/src/engine/metadata-modules/row-level-security/` - Entity y módulo
  - `rls-rule.entity.ts` - Entity TypeORM (con decoradores GraphQL) ✨ **INN-45**
  - `rls-rule.module.ts` - Módulo NestJS (con Resolver y WorkspaceCacheModule) ✨ **INN-45/46**
- `packages/twenty-server/src/engine/workspace-cache/types/` - Type system extendido
  - `workspace-cache-key.type.ts` - Registrado `rlsRulesMaps` ✨ **INN-46**
- `packages/twenty-server/src/engine/metadata-modules/metadata-engine.module.ts` - Registro de módulo RLS ✨ **INN-45**

**Base de datos:**
- Tabla: `core.rlsRule`
- Migración: `1738793200000-addRLSRuleEntity.ts`

**Campos principales:**
```typescript
{
  workspaceId: uuid;
  objectMetadataId: uuid;
  name: string;
  effect: 'allow' | 'deny';
  operations: ('read' | 'create' | 'update' | 'delete')[];
  expression: RLSRuleExpression; // JSONB
  priority: number;
  roleIds: string[];
}
```

**Funcionalidades del Engine:**
- ✅ Evaluación de expresiones complejas (AND/OR/condiciones)
- ✅ Variables de contexto ({{currentUser.id}}, etc.)
- ✅ Operadores: eq, ne, in, contains, startsWith, endsWith
- ✅ Lógica de prioridad (mayor prioridad evalúa primero)
- ✅ Effect composition (DENY > ALLOW)
- ✅ Caché por workspace con WorkspaceCacheProvider
- ✅ Evaluación batch para múltiples registros

**Cache Strategy (INN-46):**
- ✅ Cache key: `agni:rls-rules:{workspaceId}` (gestionado por WorkspaceCache)
- ✅ Estructura: Mapas indexados por ID, objectMetadataId, y roleId
- ✅ TTL: Gestionado por WorkspaceCache (local: 100ms, entry: 30min)
- ✅ Invalidación automática: Al crear/actualizar/eliminar reglas
- ✅ Consultas sin DB: RLSEngineService usa solo caché
- ✅ Performance: ~10x mejora vs consultas directas sin caché

**GraphQL API (INN-45):**
- ✅ **Mutations:**
  - `createRLSRule(input: CreateRLSRuleInput): RLSRule` - Crear regla
  - `updateRLSRule(input: UpdateRLSRuleInput): RLSRule` - Actualizar regla
  - `deleteRLSRule(input: DeleteRLSRuleInput): Boolean` - Eliminar regla (soft delete)
- ✅ **Queries:**
  - `getRLSRule(input: GetRLSRuleInput): RLSRule` - Obtener regla por ID
  - `getRLSRules(input: GetRLSRulesByObjectInput): [RLSRule]` - Reglas por objeto
  - `getRLSRulesByWorkspace(): [RLSRule]` - Todas las reglas del workspace
  - `testRLSRule(input: TestRLSRuleInput): RLSTestResult` - Testing de reglas antes de activar
- ✅ **Seguridad:** Solo workspace owners (WorkspaceAuthGuard)
- ✅ **Scope:** Todas las operaciones limitadas al workspace actual
- ✅ **Testing:** testRLSRule permite probar reglas con contexto custom antes de activarlas

### 2. Dependent Fields System
**Ubicación:** `agni-extensions/dependent-fields/`  
**Estado:** 📋 Planeado  
**Tareas Linear:** INN-21 (parent)

_Pendiente de implementación_

### 3. Custom Validation Engine
**Ubicación:** `agni-extensions/validation-engine/`  
**Estado:** 📋 Planeado  
**Tareas Linear:** INN-31 (parent)

_Pendiente de implementación_

---

## 🔧 Modificaciones al Core de Twenty

> ⚠️ Revisar estas secciones en cada merge upstream

### Metadata System

**INN-49: RLS Rule Storage**
- ✅ **Agregado:** Entity `RLSRuleEntity` en `packages/twenty-server/src/engine/metadata-modules/row-level-security/`
- ✅ **Agregado:** Service `RLSRuleService` para CRUD operations
- ✅ **Agregado:** Migración de base de datos para tabla `rlsRule`
- **Impacto:** Ninguno en core existente - 100% extensión
- **Upstream safe:** ✅ No conflictos esperados

_(Otras modificaciones se documentarán aquí cuando se implementen)_

---

## 📋 Estrategia de Branches

```
twentyhq/twenty (upstream)
      ↓
   source (mirror upstream, read-only)
      ↓
    main (trunk based development)
      ↓
 feature/* (ramas de trabajo)
```

**Merge upstream:**
```bash
git fetch upstream
git checkout source
git merge upstream/main
git checkout main
git merge source
# Resolver conflictos consultando este documento
```

---

## 🚀 Build y Deployment

_Documentación pendiente (INN-53)_

---

## 📝 Changelog de Customizaciones

### [2026-02-06] - INN-45 GraphQL API RLS
- ✅ Creado resolver GraphQL `RLSRuleResolver` con todos los endpoints
- ✅ Implementados DTOs de input/output (Create, Update, Get, Delete, Test)
- ✅ Agregados decoradores GraphQL (@Field, @ObjectType) a RLSRuleEntity
- ✅ Registrado RLSRuleResolver en RLSRuleModule
- ✅ Importado RLSRuleModule en MetadataEngineModule (expuesto al GraphQL gateway)
- ✅ Implementada seguridad: solo workspace owners, scope por workspace
- ✅ Agregado endpoint testRLSRule para testing de reglas antes de activar
- ✅ Soporte para JSON expressions vía GraphQLJSONObject
- ✅ API lista para consumo desde frontend

### [2026-02-06] - INN-46 RLS Cache Strategy
- ✅ Registrado `rlsRulesMaps` en el type system de WorkspaceCache
- ✅ Integrado `RLSRulesCacheService` con `WorkspaceCacheService`
- ✅ Modificado `RLSEngineService` para usar caché en lugar de DB queries
- ✅ Implementada invalidación automática de caché en `RLSRuleService`
- ✅ Agregado `invalidateCache()` method en RLSRulesCacheService
- ✅ Importado WorkspaceCacheModule en RLSRuleModule
- ✅ Cache warm-up automático via WorkspaceCache (on-demand)
- ✅ Performance boost: Eliminadas consultas directas a DB en evaluación

### [2025-02-05] - INN-48 RLS Evaluation Engine
- ✅ Implementado `RLSEngineService` con evaluación completa de reglas
- ✅ Creado evaluador de expresiones lógicas (AND/OR/condiciones)
- ✅ Implementado `RLSRulesCacheService` con patrón WorkspaceCache
- ✅ Agregados helpers para construcción de contexto RLS
- ✅ Implementada lógica de prioridad y effect composition
- ✅ Evaluación batch para queries de múltiples registros
- ✅ Tests unitarios completos del evaluador de expresiones
- ✅ Soporte para variables de contexto ({{currentUser.id}})

### [2025-02-05] - INN-49 RLS Rule Storage
- ✅ Creada estructura `agni-extensions/row-level-security/`
- ✅ Implementada entity `RLSRuleEntity` 
- ✅ Implementado service `RLSRuleService` con CRUD
- ✅ Creada migración de base de datos
- ✅ Agregado types compartidos en `shared/types.ts`

---

**Última actualización:** 2026-02-06  
**Última tarea:** INN-45
