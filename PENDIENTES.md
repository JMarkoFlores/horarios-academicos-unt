# Pendientes: Sistema de Gestión de Horarios Académicos - UNT

> Generado el 2026-06-12. Última actualización: 2026-06-12.

---

## Leyenda

- ✅ Completado
- 🔄 En progreso
- ⬜ Pendiente
- ❌ No iniciado

---

## FASE 1 — Errores de compilación TypeScript ✅

### 1.1 `DIAS_NOMBRE` no definido en `ambientes.service.ts`
- ✅ Se agregó la constante `DIAS_NOMBRE` en `backend/src/ambientes/ambientes.service.ts`

### 1.2 Tipos de `groq-sdk` desactualizados en `chatbot.service.ts`
- ✅ Se actualizaron `CompletionTool` → `ChatCompletionTool`, `CompletionCreateParams.Message` → `ChatCompletionMessageParam`
- ✅ Se eliminó propiedad `name` del mensaje `tool` (API más reciente)

### 1.3 Tests unitarios no compilaban
- ✅ `docentes.validation.spec.ts`: agregado `ibm: 4247`
- ✅ `docentes.service.spec.ts`: agregado `grupos: 1`
- ✅ `test-helpers.ts`: corregido path de import (`../src/` → `../../src/`), agregado import `TestingModule`
- ✅ `test-logger.ts`: eliminados métodos duplicados de `ConflictLogger` (`getLogs`, `clear`, `hasErrors`, `hasWarnings`)

### 1.4 `jest-e2e.json` faltante
- ✅ Creado `backend/test/jest-e2e.json` con configuración para tests de integración

---

## FASE 2 — Bugs y funcionalidades pendientes ✅

### 2.1 `console.log` / `console.warn` de debug en producción
- ✅ Reemplazados 4 statements por `Logger` de NestJS en `declaracion-carga-horaria`
  - `console.warn(...)` → `this.logger.warn(...)`
  - `console.log(...)` → `this.logger.debug(...)` (3 instancias)
  - `console.log(...)` en controller → `this.logger.log(...)`
  - Se agregó `Logger` a imports del controller y service

### 2.2 Selector de modo de asignación
- ✅ **Ya estaba implementado** en `configuracion.component.ts` (líneas 951-1015) con `cargarPeriodoActual()`, `cambiarModoAsignacion()`, y UI en `configuracion.component.html`. No requería cambios.

### 2.3 `periodoId` hardcodeado en sugerencias contextuales
- ✅ Se inyectó `PeriodoAcademico` repository en `SugestionesContextualesService`
- ✅ Se reemplazó `1, // TODO: obtener periodoId dinámicamente` por búsqueda dinámica vía `periodoRepo.findOne({ where: { codigo } })`

### 2.4 Modal de detalles en grilla de horarios del operador
- ✅ Creado `DetallesCeldaDialogComponent` en `frontend/src/app/modules/operador/grilla-horarios/detalles-celda-dialog.component.ts`
- ✅ Registrado en `operador.module.ts`
- ✅ Reemplazado snackbar por `MatDialog` en `onCeldaDoubleClick()`

---

## FASE 3 — Mejoras ✅

### 3.1 Selector de idioma conectado con backend
- ✅ Inyectado `ApiService` en `LanguageSelectorComponent`
- ✅ Llamada a `PATCH /usuarios/mi-idioma` al cambiar idioma (endpoint ya existente en backend)

### 3.2 Búsqueda/filtrado en modal SUBSANACION
- ✅ Se agregó campo `busquedaDocentes` con filtro por nombre y código
- ✅ Se agregó `docentesFiltrados` computado
- ✅ Template con `mat-form-field` + icono de búsqueda + botón de limpiar

### 3.3 Carga de docentes mejorada
- ✅ Se agregó `codigo` al mapeo de docentes
- ✅ Se muestra `categoria` y `tipo_contrato` en cada checkbox

### 3.4 Notificaciones selectivas en SUBSANACION
- ✅ Se agregaron llamadas a `enviarRecordatorio24h` y `enviarAlerta15min` en el método `preAsignarDocentes` de `ventanas.service.ts`
- ✅ Manejo de errores para que fallos en notificaciones no interrumpan la pre-asignación

---

## FASE 4 — Infraestructura y deuda técnica ✅

### 4.1 `.history/` expuesto en repositorio
- ✅ Agregado `.history/` al `.gitignore` raíz

### 4.2 `build.log` obsoleto
- ✅ Agregado `build.log` al `.gitignore` raíz

### 4.3 Cobertura de tests al 0%
- ✅ Subido threshold de 0% a 10% en `jest.config.js` (branches, functions, lines, statements)

### 4.4 Archivos de logs de error TS
- ✅ Agregado `tsc_errors*.log` al `.gitignore` raíz

---

## 📋 Resumen final

| Fase | Estado | Items |
|------|--------|-------|
| FASE 1: Errores de compilación | ✅ Completado | 4/4 |
| FASE 2: Bugs y funcionalidades | ✅ Completado | 4/4 |
| FASE 3: Mejoras | ✅ Completado | 4/4 |
| FASE 4: Infraestructura | ✅ Completado | 4/4 |

**Resultado:** 0 errores de TypeScript en backend, todas las correcciones aplicadas.
