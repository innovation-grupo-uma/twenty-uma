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
  - `rls-rule.service.ts` - Service CRUD para reglas
  - `rls-engine.service.ts` - Motor de evaluación de reglas ✨ **INN-48**
  - `rls-cache.service.ts` - Cache de reglas por workspace ✨ **INN-48**
  - `types/rls-context.type.ts` - Tipos de contexto de evaluación ✨ **INN-48**
  - `utils/expression-evaluator.util.ts` - Evaluador de expresiones lógicas ✨ **INN-48**
  - `utils/build-rls-context.util.ts` - Helper para construir contexto ✨ **INN-48**
- `agni-extensions/row-level-security/tests/`
  - `expression-evaluator.spec.ts` - Tests del evaluador ✨ **INN-48**
- `packages/twenty-server/src/engine/metadata-modules/row-level-security/` - Entity y módulo
  - `rls-rule.entity.ts` - Entity TypeORM
  - `rls-rule.module.ts` - Módulo NestJS (actualizado con engine y cache)

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

**Última actualización:** 2025-02-05  
**Última tarea:** INN-48
