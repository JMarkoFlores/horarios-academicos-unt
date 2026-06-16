# Plan de Implementación — Sistema de Gestión de Horarios y Carga Académica Docente

## Universidad Nacional de Trujillo — Facultad de Ingeniería de Sistemas

---

## 1. Objetivo del Plan de Implementación

Transformar el sistema actual (avanzado en gestión de horarios, incipiente en carga académica docente) en un sistema completo, coherente y defendible que cubra **todo el proceso de carga académica docente** de la UNT: desde el plan de estudios hasta los reportes finales F01-CAD, F02-CAD y F03-CAD, pasando por asignación lectiva, declaración, validación, observaciones, subsanación y aprobación.

El plan asume que el sistema **ya existe y está funcional en horarios**, y organiza en fases concretas todo lo que **falta, debe corregirse o debe mejorarse** para alcanzar el estado completo.

---

## 2. Supuestos y Alcance

### Supuestos Base

| # | Supuesto | Implicancia |
|---|----------|-------------|
| S1 | El backend está desarrollado en NestJS 10 + TypeORM 0.3 + PostgreSQL 16 | Las entidades, servicios y controladores siguen este patrón |
| S2 | El frontend está desarrollado en Angular 17 + Angular Material 17 con standalone components | Los módulos, componentes y servicios siguen este patrón |
| S3 | Ya existen las entidades: Docente, Curso, Grupo, Ambiente, HorarioAsignado, DeclaracionCargaHoraria, ParametrosCarga, PeriodoAcademico, Facultad, Escuela, Departamento, Usuario | No se crean desde cero |
| S4 | Ya existe el flujo de autenticación JWT con 8 roles | Solo se añaden restricciones donde falten |
| S5 | Ya existen validaciones de horario (cruces, disponibilidad, franja) | Se añaden validaciones de carga académica |
| S6 | Ya existen reportes vía Puppeteer y jsPDF | Se añaden F01-CAD, F02-CAD y se mejora F03-CAD |
| S7 | El sistema usa `synchronize: true` en TypeORM | No se generan migraciones; las tablas se sincronizan automáticamente |
| S8 | Ya existe un seed con 28 docentes, 38 cursos y horarios por ciclo | Se amplía para incluir plan de estudios y asignaciones |

### Alcance

Este plan cubre:

- **Mantenedor de Plan de Estudios 2018** (nuevo)
- **Asignación de Carga Lectiva** (nuevo, reemplaza el DocenteCurso actual)
- **Declaración de Carga Lectiva** (mejora del existente)
- **Declaración de Carga No Lectiva** (mejora del existente)
- **Declaración Jurada de Incompatibilidad** (mejora del existente)
- **Horario Semanal / F03-CAD** (mejora del existente)
- **Flujo de Validación con observaciones y subsanación** (completar)
- **Carga Lectiva Adicional** (nuevo)
- **Reportes Operacionales** (F01-CAD, F02-CAD nuevos; mejora del resto)
- **Reportes de Gestión** (mejora del existente)
- **Dashboard de Carga Académica** (nuevo)
- **Validaciones Automáticas de carga** (nuevas)
- **Auditoría extendida a carga académica** (ampliar la existente)
- **Seed actualizado** (mejora del existente)

Quedan fuera del alcance de este plan:

- Integración con RENATY/RENACYT/DINA
- App móvil nativa
- Firma digital avanzada con certificado digital
- Módulo de investigación y proyectos
- Automatización completa de horarios vía IA
- Integración con sistemas externos (Rectorado, OGA)

---

## 3. Estrategia General de Implementación

### Principios Rectores

1. **No romper lo que funciona**: Los módulos de horarios, ventanas, operador, ambientes y conflictos no se modifican a menos que sea estrictamente necesario.
2. **Capa sobre capa**: Las nuevas funcionalidades se construyen sobre las entidades y servicios existentes, no se reemplazan.
3. **Validación temprana**: Cada fase incluye validaciones automáticas que se ejecutan en tiempo real.
4. **Demostrable en cada fase**: Al final de cada fase hay un entregable concreto que se puede mostrar al docente.
5. **Seed primero**: Cada fase incluye la ampliación del seed para poder demostrar la funcionalidad.

### Orden de Fases

```
Fase 0  — Fundación: Plan de Estudios
Fase 1  — Asignación de Carga Lectiva
Fase 2  — Declaración de Carga Lectiva y No Lectiva (mejora)
Fase 3  — Flujo de Validación Completo
Fase 4  — Declaración Jurada de Incompatibilidad (F02-CAD)
Fase 5  — Horario Semanal (F03-CAD) y Carga Adicional
Fase 6  — Reportes Operacionales F01-CAD y Consolidados
Fase 7  — Dashboard de Carga Académica y Estadísticas
Fase 8  — Reportes de Gestión
Fase 9  — Auditoría y Trazabilidad (extensión)
Fase 10 — Carga Lectiva Adicional
Fase 11 — Usuarios, Roles y Perfiles (perfeccionamiento)
Fase 12 — Seed Completo y Pruebas Integrales
```

### Priorización

| Prioridad | Fases | Descripción |
|-----------|-------|-------------|
| **Imprescindible** | 0, 1, 2, 3 | Sin esto, el proceso de carga académica no existe |
| **Importante** | 4, 5, 6, 7 | Documentos oficiales y visibilidad de gestión |
| **Deseable** | 8, 9, 10, 11, 12 | Consolidación, auditoría y refinamiento |

---

## 4. Fases de Implementación

---

### FASE 0 — Fundación: Mantenedor de Plan de Estudios

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPRESCINDIBLE — Alta |
| **Duración estimada** | 5-7 días |
| **Dependencias** | Ninguna (base para todo lo demás) |
| **Riesgo si no se hace** | No hay base para la asignación lectiva; las horas no se derivan del plan oficial |

#### 4.0.1 Objetivo

Crear el mantenedor del Plan de Estudios 2018 de Ingeniería de Sistemas como entidad rectora de toda la carga académica. Este módulo permitirá gestionar qué cursos pertenecen al plan, en qué ciclo están, sus horas (teoría/práctica/laboratorio), créditos y prerrequisitos.

#### 4.0.2 Qué problema resuelve

- Hoy no hay una entidad "Plan de Estudios" en el sistema
- Los cursos existen como catálogo genérico pero sin vinculación a un plan concreto
- No se puede determinar qué cursos corresponden a qué ciclo del plan 2018
- Las horas de teoría/práctica/laboratorio no están asociadas a un plan específico

#### 4.0.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/entities/plan-estudios.entity.ts` | Crear |
| `backend/src/entities/curso-plan-estudios.entity.ts` | Crear |
| `backend/src/entities/curso.entity.ts` | Modificar (agregar relación) |
| `backend/src/modules/plan-estudios/plan-estudios.module.ts` | Crear |
| `backend/src/modules/plan-estudios/plan-estudios.controller.ts` | Crear |
| `backend/src/modules/plan-estudios/plan-estudios.service.ts` | Crear |
| `backend/src/modules/plan-estudios/dto/` | Crear (Create, Update) |
| `frontend/src/app/modules/plan-estudios/` | Crear (módulo completo) |
| `frontend/src/app/app-routing.module.ts` | Modificar (agregar ruta) |
| `frontend/src/app/layout/layout.component.ts` | Modificar (agregar sidebar) |
| `frontend/src/assets/i18n/es.json` (y en, pt) | Modificar (traducciones) |

#### 4.0.4 Funcionalidades específicas

1. **Crear PlanEstudios**: CRUD de planes con campos: código (ej: "2018"), nombre, descripción, resolución, año, escuela responsable, activo
2. **Agregar curso al plan**: Seleccionar curso del catálogo, definir ciclo (1-10), tipo (OBLIGATORIO/ELECTIVO/COMPLEMENTARIO), horas específicas para el plan, créditos, prerrequisitos
3. **Visualizar plan por ciclo**: Tabs por ciclo (I al X) mostrando los cursos en orden
4. **Editar curso en el plan**: Modificar horas, créditos, prerrequisitos sin afectar el catálogo general
5. **Activar/desactivar plan**: Solo un plan puede estar activo por escuela
6. **Validaciones**: No duplicar cursos en el mismo plan, prerrequisitos deben existir, horas coherentes

#### 4.0.5 Entidades a crear

**PlanEstudios** (`plan_estudios`):
```
id: int (PK, auto)
codigo: varchar(20) (unique)           // "2018"
nombre: varchar(200)                    // "Plan de Estudios 2018"
descripcion: text (nullable)
resolucion: varchar(100) (nullable)     // N° de resolución
año: smallint                           // Año de aprobación
activo: boolean (default: false)        // Solo uno activo por escuela
escuela_id: int (FK → Escuela)
created_at: timestamp
updated_at: timestamp
```

**CursoPlanEstudios** (`curso_plan_estudios`):
```
id: int (PK, auto)
curso_id: int (FK → Curso)
plan_estudios_id: int (FK → PlanEstudios)
ciclo: smallint                         // 1-10
tipo_curso: varchar(20)                 // OBLIGATORIO | ELECTIVO | COMPLEMENTARIO
horas_teoria: smallint (default: 0)
horas_practica: smallint (default: 0)
horas_laboratorio: smallint (default: 0)
creditos: decimal(3,1)
prerequisitos: jsonb (nullable)         // [curso_id1, curso_id2, ...]
estado: varchar(20) (default: 'ACTIVO') // ACTIVO | DESACTUALIZADO | ELIMINADO
created_at: timestamp
updated_at: timestamp

UNIQUE (curso_id, plan_estudios_id)
INDEX (plan_estudios_id, ciclo)
```

#### 4.0.6 Pantallas a crear

**PlanEstudiosListComponent** (ruta: `/app/plan-estudios`):
- Tabla de planes: Código, Nombre, Año, Escuela, Activo (sí/no), Acciones
- Filtros: búsqueda por nombre, escuela (select), año, activo/inactivo
- Botones: "Nuevo Plan", "Ver Cursos", "Editar", "Activar/Desactivar"
- Diálogo de creación/edición de plan: código, nombre, descripción, resolución, año, escuela

**PlanEstudiosDetailComponent** (ruta: `/app/plan-estudios/:id`):
- Cabecera con datos del plan y badge "ACTIVO" si corresponde
- Tabs por ciclo (I, II, III, IV, V, VI, VII, VIII, IX, X)
- Tabla de cursos por ciclo:
  - Código, Nombre, Tipo, Hrs Teoría, Hrs Práctica, Hrs Lab, Créditos, Prerrequisitos, Estado, Acciones
- Botón "Agregar Curso": diálogo con selector de curso + campos del plan
- Botón "Editar" por fila: diálogo para modificar horas/créditos/prerrequisitos
- Botón "Desactivar/Activar" por fila
- Tooltip en prerrequisitos: muestra nombres de cursos

#### 4.0.7 Validaciones a implementar

| ID | Validación | Tipo |
|----|------------|------|
| P0-V1 | Código de plan único | Integridad |
| P0-V2 | Solo un plan activo por escuela | Negocio |
| P0-V3 | Curso no duplicado en el mismo plan (unique curso_id + plan_estudios_id) | Integridad |
| P0-V4 | Ciclo debe estar entre 1 y 10 | Integridad |
| P0-V5 | Horas teoría + práctica + laboratorio > 0 | Negocio |
| P0-V6 | Prerrequisitos deben referenciar cursos existentes en el mismo plan | Integridad |
| P0-V7 | No se puede eliminar un curso del plan si tiene asignaciones activas | Negocio |
| P0-V8 | El tipo de curso debe ser un valor válido del enum | Integridad |

#### 4.0.8 Reglas de negocio cubiertas

- R19: Un curso solo puede asignarse si existe en el plan de estudios vigente
- R20: Las horas declaradas no pueden exceder las horas del curso en el plan
- R21: El ciclo del curso en asignación debe coincidir con el ciclo del plan
- R22: Los prerrequisitos deben estar satisfechos (validación informativa)

#### 4.0.9 Endpoints REST

```
GET    /plan-estudios?escuela=&activo=&search=     → Lista paginada
GET    /plan-estudios/:id                          → Detalle (incluye cursos)
POST   /plan-estudios                              → Crear plan
PATCH  /plan-estudios/:id                          → Actualizar plan
DELETE /plan-estudios/:id                          → Eliminar (solo si sin cursos)

GET    /plan-estudios/:planId/cursos?ciclo=&tipo=  → Cursos del plan
POST   /plan-estudios/:planId/cursos               → Agregar curso al plan
PATCH  /plan-estudios/:planId/cursos/:cursoPlanId  → Actualizar curso en plan
DELETE /plan-estudios/:planId/cursos/:cursoPlanId   → Quitar curso del plan
GET    /plan-estudios/:planId/cursos/:cursoPlanId/prerequisitos  → Prerrequisitos
```

Roles permitidos: `administradorsistema`, `directorescuela`, `coordinadoracademico`

#### 4.0.10 Dependencias

Ninguna. Esta fase es la fundación de todas las demás.

#### 4.0.11 Entregables

- Backend: entidades PlanEstudios y CursoPlanEstudios, módulo completo con CRUD
- Frontend: mantenedor con lista, detalle, tabs por ciclo, diálogos CRUD
- Seed: plan 2018 cargado con cursos de ciclos I, III, V, VII, IX
- Traducciones: sidebar entry "Plan de Estudios"
- Sidebar: nuevo entry bajo "Gestión Académica"

#### 4.0.12 Evidencia para el docente

- Demostrar que existe el plan 2018 con cursos visibles por ciclo
- Mostrar que se puede agregar/editar/quitar cursos del plan
- Mostrar que las horas del plan son distintas de las del catálogo general
- Mostrar la validación de prerrequisitos

#### 4.0.13 Riesgos y errores frecuentes

- **Confundir Curso (catálogo) con CursoPlanEstudios (instancia en el plan)**: El catálogo tiene datos genéricos; el plan tiene datos específicos (horas, créditos, ciclo). Ambos coexisten.
- **Prerrequisitos cíclicos**: Validar que A→B→A no ocurra.
- **Plan huérfano**: Un plan debe pertenecer a una escuela existente.

#### 4.0.14 Criterios de aceptación

- [ ] CRUD completo de planes funcionando
- [ ] Plan 2018 cargado con mínimo 30 cursos en seed
- [ ] Cursos agrupables por ciclo (tabs funcionales)
- [ ] Prerrequisitos registrables y visibles
- [ ] Validación de ciclo (1-10) y horas (>0)
- [ ] Solo un plan activo por escuela
- [ ] Sidebar, ruta y breadcrumb funcionando
- [ ] Traducciones en los 3 idiomas

---

### FASE 1 — Asignación de Carga Lectiva

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPRESCINDIBLE — Alta |
| **Duración estimada** | 6-8 días |
| **Dependencias** | Fase 0 (Plan de Estudios) |
| **Riesgo si no se hace** | No hay asignación formal de cursos a docentes; la declaración no tiene base |

#### 4.1.1 Objetivo

Crear el módulo de asignación lectiva donde la secretaría de departamento asigna cursos del plan de estudios a docentes, con validación automática de carga máxima, cursos máximos y coherencia con la modalidad.

#### 4.1.2 Qué problema resuelve

- Hoy DocenteCurso existe pero sin vinculación al plan de estudios
- No hay control de cuántos cursos/docente se asignan
- No hay validación contra la modalidad del docente
- La secretaría no tiene una vista unificada de qué cursos del plan necesitan docente

#### 4.1.3 Tabla a crear

**AsignacionLectiva** (`asignacion_lectiva`):
```
id: int (PK, auto)
docente_id: int (FK → Docente)
curso_plan_id: int (FK → CursoPlanEstudios)
periodo_id: int (FK → PeriodoAcademico)
grupo_id: int (FK → Grupo, nullable)
tipo_clase: varchar(20)     // TEORIA | PRACTICA | LABORATORIO
seccion: varchar(10)        // "A", "B", "U"
nro_alumnos: int (default: 0)
horas_asignadas: numeric(4,1)
estado: varchar(20)         // PENDIENTE | CONFIRMADO | RECHAZADO
observaciones: text (nullable)
asignado_por_id: int (FK → Usuario)
confirmado_por_id: int (FK → Usuario, nullable)
confirmado_en: timestamp (nullable)
created_at: timestamp
updated_at: timestamp

INDEX (periodo_id, docente_id)
INDEX (periodo_id, curso_plan_id)
UNIQUE (docente_id, curso_plan_id, periodo_id, grupo_id, tipo_clase, seccion)
```

#### 4.1.4 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/entities/asignacion-lectiva.entity.ts` | Crear |
| `backend/src/modules/asignacion-lectiva/` | Crear (module, controller, service, dto) |
| `frontend/src/app/modules/asignacion-lectiva/` | Crear |
| `frontend/src/app/app-routing.module.ts` | Modificar (ruta) |
| `frontend/src/app/layout/layout.component.ts` | Modificar (sidebar) |
| `backend/src/common/services/validaciones.service.ts` | Modificar (nuevas validaciones) |
| `backend/src/entities/docente.entity.ts` | Modificar (relación) |
| `backend/src/database/seed.ts` | Modificar (asignaciones de ejemplo) |

#### 4.1.5 Funcionalidades específicas

1. **Selector de período y plan**: Al entrar, seleccionar período académico y plan de estudios
2. **Vista de cursos del plan por ciclo**: Tabs con ciclos, mostrando cada curso y su estado de asignación
3. **Asignar docente a curso**: Selector de docentes filtrado por:
   - Departamento del curso
   - Modalidad compatible (TP no puede tener carga completa de DE)
   - Carga actual < carga máxima (según ParametrosCarga)
4. **Asignación múltiple**: Un curso puede tener múltiples docentes (diferentes grupos/secciones)
5. **Validación en tiempo real**: Al seleccionar un docente, mostrar:
   - Carga actual del docente en el período
   - Cursos actualmente asignados
   - Si la nueva asignación excede límites
6. **Estados**: Pendiente (borrador), Confirmado (definitivo), Rechazado (con motivo)
7. **Vista resumen**: Totales de cursos asignados, pendientes, sin docente

#### 4.1.6 Pantallas a crear

**AsignacionLectivaComponent** (ruta: `/app/asignacion-lectiva`):
- Cabecera con selectores de: Período (select), Plan de Estudios (select)
- Tabs por ciclo (I-X) con badge de cursos pendientes
- Tabla por ciclo:
  - Código, Nombre, Tipo, Hrs Teoría, Hrs Práctica, Hrs Lab, Total Hrs
  - Docente(s) asignado(s) — tag/chips con nombre
  - Grupo(s), Sección(es)
  - Estado (badge: PENDIENTE/CONFIRMADO/RECHAZADO)
  - Acciones: "Asignar Docente", "Editar Asignación", "Confirmar", "Rechazar"
- Indicador visual por fila: 🟢 asignado, 🟡 pendiente, 🔴 sin docente
- Botón "Asignación Masiva": wizard para asignar varios cursos secuencialmente

**DialogoAsignarDocente** (diálogo):
- Selector de docente con búsqueda (texto + filtros por modalidad)
- Selector de tipo de clase (teoría/práctica/laboratorio)
- Selector de grupo (del curso)
- Input de sección
- Input de horas estimadas (precargadas desde el plan)
- Input de número de alumnos estimado
- Indicador de carga del docente: "Carga actual: 12h / Máx: 30h → Nueva: 4h → Total: 16h ✅"
- Botones: Asignar, Cancelar

#### 4.1.7 Campos detallados de la pantalla de asignación

**Cabecera**:
- Selector de período: label "Período Académico", options del servicio período, value = período activo
- Selector de plan: label "Plan de Estudios", options de planes activos, value = plan más reciente activo
- Resumen automático: "Cursos: 32 | Asignados: 28 | Pendientes: 4 | Sin docente: 0"

**Tabla por ciclo** (columnas):
1. Código (string, ej: IS-101)
2. Nombre del Curso (string)
3. Tipo (badge: OBLIGATORIO/ELECTIVO)
4. Hrs Teoría (number, del plan)
5. Hrs Práctica (number, del plan)
6. Hrs Lab (number, del plan)
7. Total Hrs (number, calculado)
8. Docente(s) asignado(s) (chips con nombre + hover para detalle)
9. Grupo/Sección (string: "A, B" o "-")
10. Estado (badge coloreado)
11. Acciones (icon buttons)

**Filtros**: búsqueda por nombre de curso, filtro por tipo, filtro por estado de asignación

#### 4.1.8 Validaciones a implementar

| ID | Validación | Tipo |
|----|------------|------|
| A1-V1 | Docente debe tener modalidad definida | Negocio |
| A1-V2 | Horas asignadas ≤ horas_max_semanal del ParametrosCarga | Negocio |
| A1-V3 | Cursos asignados ≤ cursos_max_docente del ParametrosCarga | Negocio |
| A1-V4 | No asignar el mismo curso al mismo docente en el mismo período (sección/grupo diferente sí permite) | Negocio |
| A1-V5 | El curso debe pertenecer al plan activo | Integridad |
| A1-V6 | El período debe estar en estado PLANIFICACION o ASIGNACION_HORARIOS | Negocio |
| A1-V7 | Horas del curso (por tipo) no pueden exceder las definidas en el plan | Integridad |

#### 4.1.9 Reglas de negocio cubiertas

- R1: Horas lectivas se derivan del plan de estudios
- R2, R3, R4: Desglose por tipo de clase
- R5: Total horas curso = suma de tipos
- R6: Asignación respeta máximos de ParametrosCarga
- R7: Cursos máximos por docente
- R19: Curso existe en plan activo
- R20: Horas no exceden el plan
- R21: Ciclo coincide

#### 4.1.10 Endpoints REST

```
GET    /asignacion-lectiva?periodo=&plan_id=&ciclo=    → Lista paginada
GET    /asignacion-lectiva/docente/:docenteId          → Asignaciones de un docente
POST   /asignacion-lectiva                             → Crear asignación
PATCH  /asignacion-lectiva/:id                         → Actualizar
PATCH  /asignacion-lectiva/:id/confirmar               → Confirmar (cambia a CONFIRMADO)
PATCH  /asignacion-lectiva/:id/rechazar                → Rechazar (con observaciones)
DELETE /asignacion-lectiva/:id                         → Eliminar (solo PENDIENTE)
GET    /asignacion-lectiva/resumen?periodo=&plan_id=   → Resumen de cobertura
```

Roles: `administradorsistema`, `coordinadoracademico`, `secretaria`

#### 4.1.11 Dependencias

- **Fase 0**: Plan de estudios debe existir y tener cursos
- **Existente**: Entidad Docente con modalidad, entidad ParametrosCarga

#### 4.1.12 Entregables

- Backend: entidad AsignacionLectiva, módulo CRUD con validaciones
- Frontend: pantalla de asignación con selector de período/plan, tabs por ciclo, diálogos
- Validaciones: A1-V1 a A1-V7 implementadas
- Seed: asignaciones de ejemplo (mínimo 20 asignaciones distribuidas)
- Sidebar: entry "Asignación Lectiva" bajo "Gestión Académica"

#### 4.1.13 Evidencia para el docente

- Demostrar selección de período + plan → cursos visibles
- Demostrar asignación de docente con validación de carga
- Demostrar que las horas se precargan del plan
- Demostrar el resumen de cobertura
- Mostrar que el docente ve sus cursos asignados al entrar a declaraciones

#### 4.1.14 Riesgos y errores frecuentes

- **Asignar sin verificar carga máxima**: Validar antes de guardar, no después.
- **Confundir grupo con sección**: Grupo = instancia del curso (ej: Grupo 1), Sección = subdivisión administrativa (ej: "A"). Ambos coexisten.
- **No considerar descanso mínimo**: La asignación lectiva debe considerar que el docente necesita espacio horario.

#### 4.1.15 Criterios de aceptación

- [ ] Asignación lectiva creable con docente, curso del plan, período, tipo clase
- [ ] Validación de carga máxima al asignar
- [ ] Validación de cursos máximos al asignar
- [ ] Cursos del plan visibles y filtrables por ciclo
- [ ] Resumen de cobertura funcional
- [ ] Sidebar y ruta funcionando
- [ ] Docente ve sus cursos asignados en declaraciones

---

### FASE 2 — Declaración de Carga Lectiva y No Lectiva (Mejora Integral)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPRESCINDIBLE — Alta |
| **Duración estimada** | 5-7 días |
| **Dependencias** | Fase 1 (Asignación Lectiva) |
| **Riesgo si no se hace** | La declaración actual no valida contra el plan ni contra la modalidad |

#### 4.2.1 Objetivo

Mejorar el módulo existente de declaración de carga (`verificar-declaracion.component.ts` + backend service) para que:
- La carga lectiva se precargue automáticamente desde las asignaciones (Fase 1)
- La carga no lectiva tenga los 10 rubros oficiales del F01-CAD con validaciones
- El total general se valide contra la modalidad del docente
- La preparación y evaluación se limite al 50% de las horas lectivas
- El formulario tenga guardado automático y feedback visual

#### 4.2.2 Qué problema resuelve

- Hoy la carga lectiva se carga desde horarios, no desde asignaciones
- Las horas de la carga lectiva son editables manualmente (pueden ser inconsistentes)
- La carga no lectiva no valida contra la modalidad
- No hay guardado automático
- La UX no muestra claramente los límites por rubro

#### 4.2.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.service.ts` | Modificar |
| `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.controller.ts` | Modificar |
| `backend/src/declaracion-carga-horaria/dto/carga-lectiva.dto.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.html` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.scss` | Modificar |
| `frontend/src/app/modules/declaraciones/declaraciones.component.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/declaraciones.module.ts` | Modificar (agregar nuevos imports si requeridos) |

#### 4.2.4 Funcionalidades específicas

1. **Precarga de carga lectiva desde AsignacionLectiva**: Al abrir la declaración, cargar cursos desde la tabla de asignaciones (no desde horarios)
2. **Campos bloqueados de carga lectiva**: Código, nombre, horas teoría/práctica/lab se precargan y **no son editables** (vienen del plan)
3. **Campos editables de carga lectiva**: Solo número de alumnos por sección/grupo
4. **Carga no lectiva con 10 rubros exactos del F01-CAD**:
   - 1. Trabajo Lectivo (automático, es el total de lectiva)
   - 2. Preparación y Evaluación (máx 50% del trabajo lectivo)
   - 3. Consejería y Tutoría
   - 4. Investigación
   - 5. Capacitación
   - 6. Actividades de Gobierno
   - 7. Actividades de Administración
   - 8. Asesoría de Tesis y Exámenes Profesionales
   - 9. Responsabilidad Social Universitaria
   - 10. Comités Técnicos y Comisiones
5. **Rubro 1 (Trabajo Lectivo) automático y no editable**: Es la suma de horas lectivas
6. **Validación en tiempo real por rubro**: Tooltip con límite, campo se pone rojo si excede
7. **Guardado automático**: Cada 30 segundos si hay cambios (debounce)
8. **Barra de progreso**: "Completaste 6 de 10 rubros de carga no lectiva"
9. **Resumen visual**: Gauge de horas usadas vs disponibles según modalidad

#### 4.2.5 Mejoras al modelo existente

**DeclaracionCargaHoraria** — agregar o modificar:
- `carga_lectiva_json: jsonb` — snapshot de la carga lectiva al momento de enviar (ya existe como generación desde horarios, pero debe venir de asignaciones)
- `total_horas_lectivas: smallint` — total calculado
- `total_horas_no_lectivas: smallint` — total calculado
- `total_horas_general: smallint` — suma

#### 4.2.6 Pantallas a modificar

**VerificarDeclaracionComponent** — cambios:

**Sección de Info del Docente** (ya existe, mejorar):
- Agregar campo "Año Académico" (del período)
- Agregar campo "Semestre" (I o II según período)
- Agregar campo "Fecha de Inicio" y "Fecha de Término" (del período)
- Orden: Facultad, Departamento, DNI (nuevo), Docente, Condición, Categoría, Dedicación, Semestre, Fechas

**Sección de Carga Lectiva** (mejorar):
- Las columnas ahora son: Código, Denominación, Tipo Curso, Escuela, Año/Ciclo, Sección, N° Alumnos, Hrs Teoría, Hrs Práctica, Hrs Laboratorio, Total Hrs
- Las horas vienen del plan y NO son editables (solo lectura)
- N° de Alumnos es editable
- Al final: Total de horas lectivas (automático)
- Subtotal por tipo de curso si hay varios

**Sección de Carga No Lectiva** (mejorar):
- Tabla con 10 filas exactas
- Columnas: N°, Actividad, Código (input corto), Descripción/Detalle (textarea), Horas (input numérico)
- Tooltip en cada fila mostrando límite aplicable
- Validación visual: input se pone rojo si excede límite, con mensaje
- Subtotales por sección: "Preparación", "Investigación", "Gestión"
- Total de carga no lectiva

**Barra de Total General**:
- Carga Lectiva + Carga No Lectiva = Total
- Gauge circular o barra: "Usas 28h de 40h disponibles (70%)"
- Si excede: barra roja con mensaje

#### 4.2.7 Validaciones a implementar o reforzar

| ID | Validación | ¿Existe? | Acción |
|----|------------|----------|--------|
| V6 | Horas totales ≤ horas de modalidad | Parcial | Reforzar en frontend + backend |
| V7 | Preparación y Evaluación ≤ 50% de lectivas | Sí | Mantener |
| V8 | Cursos asignados ≤ cursos_max_docente | Sí | Mantener |
| V9 | Horas semanales ≤ horas_max_semanal | Sí | Mantener |
| V10 | Carga lectiva no puede ser 0 si hay cursos | No | Implementar |
| V11 | Carga no lectiva debe tener detalle si horas > 0 | No | Implementar |
| V12 | Docente debe tener modalidad asignada | No | Implementar |

**Nuevas para esta fase**:
| ID | Validación |
|----|------------|
| CL-V1 | La carga lectiva no puede modificarse manualmente (solo viene de asignaciones) |
| CL-V2 | Cada rubro no lectivo con horas > 0 debe tener detalle descriptivo ≥ 10 caracteres |
| CL-V4 | La declaración no puede enviarse si hay rubros sin completar (horas sin detalle) |

#### 4.2.8 Reglas de negocio cubiertas

- R1-R7: Carga lectiva desde asignaciones
- R8: Preparación y Evaluación ≤ 50%
- R9: Total ≤ modalidad
- R10: Investigación requiere código
- R11: Comités requieren resolución
- R12: Detalle descriptivo obligatorio

#### 4.2.9 Dependencias

- **Fase 1**: Las asignaciones lectivas deben existir para precargar los cursos
- **Existente**: DeclaracionCargaHoraria entity, service de 1312 líneas, frontend de verificación

#### 4.2.10 Entregables

- Backend: servicio modificado para cargar desde asignaciones, nuevas validaciones
- Frontend: formulario mejorado con precarga, rubros exactos, validación visual, guardado automático
- Validaciones: V6-V12, CL-V1 a CL-V4 implementadas

#### 4.2.11 Evidencia para el docente

- Mostrar que al abrir declaración, los cursos aparecen automáticamente desde asignaciones
- Mostrar que las horas NO son editables (vienen del plan)
- Mostrar la validación de Preparación ≤ 50% en tiempo real
- Mostrar el gauge de horas vs modalidad
- Mostrar guardado automático y botón de envío

#### 4.2.12 Riesgos y errores frecuentes

- **Horas editables manualmente**: La precarga debe ser de solo lectura. Si el secretario necesita ajustar horas, debe hacerlo en la asignación (Fase 1), no en la declaración.
- **Rubros incorrectos**: Los 10 rubros del F01-CAD deben coincidir EXACTAMENTE con el formato oficial. No inventar rubros.
- **Modalidad no definida**: Un docente sin modalidad no puede tener declaración válida. Validar al entrar.

#### 4.2.13 Criterios de aceptación

- [ ] Carga lectiva se precarga desde AsignacionLectiva (no editable)
- [ ] 10 rubros de carga no lectiva exactos del F01-CAD
- [ ] Preparación y Evaluación limitada al 50% (validación en frontend)
- [ ] Total general validado contra modalidad del docente
- [ ] Guardado automático funcional
- [ ] Gauge de horas vs modalidad visible
- [ ] Envío de declaración cambia a ENVIADO_DOCENTE

---

### FASE 3 — Flujo de Validación Completo

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPRESCINDIBLE — Alta |
| **Duración estimada** | 5-7 días |
| **Dependencias** | Fase 2 (Declaración mejorada) |
| **Riesgo si no se hace** | El proceso de validación queda incompleto; no hay observaciones, subsanación ni aprobación real |

#### 4.3.1 Objetivo

Completar el flujo de estados de la declaración de carga en el frontend, implementar observaciones con trazabilidad, subsanación por parte del docente, validación por el director y aprobación por el decano.

#### 4.3.2 Qué problema resuelve

- El frontend actual solo muestra algunos estados (BORRADOR, ENVIADO_DOCENTE, OBSERVADO_DPTO, VALIDADO_DPTO, APROBADO_FACULTAD)
- Faltan: NO_INICIADO, PENDIENTE_ENVIO, SUBSANADO, OBSERVADO_FACULTAD, CERRADO
- Las observaciones son texto libre sin trazabilidad (no hay tabla dedicada)
- El docente no tiene una interfaz clara para saber qué debe subsanar
- El decano no tiene una vista separada para aprobación final

#### 4.3.3 Tabla a crear

**DeclaracionObservacion** (`declaracion_observacion`):
```
id: int (PK, auto)
declaracion_id: int (FK → DeclaracionCargaHoraria)
usuario_id: int (FK → Usuario)
observacion: text (NOT NULL)
estado_origen: varchar(30)       // Estado antes de la observación
estado_destino: varchar(30)      // Estado después (OBSERVADO_DPTO o OBSERVADO_FACULTAD)
tipo: varchar(20)                // OBSERVACION_DPTO | OBSERVACION_FACULTAD
subsanada: boolean (default: false)
subsanada_en: timestamp (nullable)
created_at: timestamp

INDEX (declaracion_id)
```

#### 4.3.4 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/entities/declaracion-observacion.entity.ts` | Crear |
| `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.service.ts` | Modificar |
| `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.controller.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.html` | Modificar |
| `frontend/src/app/modules/documentaciones/documentaciones-list/` | Modificar |
| `frontend/src/app/modules/documentaciones/documentacion-detalle/` | Modificar |
| `frontend/src/app/modules/declaraciones/declaraciones-routing.module.ts` | Crear/Modificar |

#### 4.3.5 Funcionalidades específicas

1. **Visibilidad de todos los estados en frontend**: Mapa de estados con label, color y descripción para cada uno de los 11 estados
2. **Stepper de progreso**: Barra horizontal mostrando: BORRADOR → ENVIADO → DPTO → FACULTAD → CERRADO, con el estado actual resaltado
3. **Observaciones con trazabilidad**: Tabla de observaciones con fecha, observador, texto y estado resultante
4. **Subsanación**: El docente ve las observaciones, corrige y reenvía → estado SUBSANADO → automáticamente a ENVIADO_DOCENTE (para nueva revisión)
5. **Vista de director**: Solo ve docentes de su departamento con filtros por estado
6. **Vista de decano**: Solo ve declaraciones en VALIDADO_DPTO para aprobar u observar
7. **Restricción de acciones por estado**: Botones deshabilitados si no corresponde
8. **Notificación**: Al observar o aprobar, mensaje claro de lo que ocurre

#### 4.3.6 Pantallas a crear/modificar

**VerificarDeclaracionComponent** — agregar:
- **Stepper de estado**: Barra horizontal con círculos de colores conectados, mostrando la etapa actual
- **Sección de Observaciones**: Tabla con columnas: Fecha, Observado por, Observación, Estado, Subsanado (sí/no)
- **Campo de nueva observación**: Textarea + botón "Observar" (solo para director/decano)
- **Botón de subsanación**: "Corregir y reenviar" (solo para docente, solo si estado = OBSERVADO_DPTO o OBSERVADO_FACULTAD)
- **Aviso de prohibición de edición**: Si estado no es editable (BORRADOR, OBSERVADO_DPTO, OBSERVADO_FACULTAD)

**DocumentacionesListComponent** — mejorar:
- Tabla: Docente, Departamento, Estado, Última Observación, Fecha de envío, Acciones
- Filtros: por estado, por departamento, búsqueda por nombre
- Badge de alerta: "3 declaraciones con observaciones pendientes"

**DocumentacionDetalleComponent** — mejorar:
- Vista completa de la declaración (lectura)
- Timeline de observaciones
- Botones: Validar, Observar (con texto requerido)
- Badge de estado grande y visible

**Nueva vista para Decano** (`/app/declaraciones/aprobacion-facultad`):
- Lista de declaraciones de toda la facultad en estado VALIDADO_DPTO
- Tabla: Docente, Departamento, Fecha de validación, Validador, Acciones (Aprobar/Observar)
- No puede ver declaraciones en otros estados

#### 4.3.7 Mapa completo de estados (frontend)

| Estado | Label | Color | ¿Editable? | ¿Quién acciona? |
|--------|-------|-------|------------|-----------------|
| NO_INICIADO | No Iniciado | Gris | Sí (docente) | Sistema (automático) |
| BORRADOR | Borrador | Azul | Sí (docente) | Docente guarda |
| PENDIENTE_ENVIO | Pendiente de Envío | Amarillo | Sí (docente) | Sistema (datos incompletos) |
| ENVIADO_DOCENTE | Enviado por Docente | Naranja | No | Docente envía |
| OBSERVADO_DPTO | Observado por Departamento | Rojo | Sí (docente) | Director observa |
| SUBSANADO | Subsanado | Amarillo claro | Sí (docente) | Docente corrige |
| VALIDADO_DPTO | Validado por Departamento | Verde | No | Director valida |
| OBSERVADO_FACULTAD | Observado por Facultad | Rojo oscuro | Sí (docente) | Decano observa |
| APROBADO_FACULTAD | Aprobado por Facultad | Verde oscuro | No | Decano aprueba |
| CERRADO | Cerrado | Gris oscuro | No | Sistema |
| ANULADO | Anulado | Negro | No | Admin |

#### 4.3.8 Endpoints a modificar/crear

```
GET    /declaraciones/:id/observaciones              → Historial de observaciones
POST   /declaraciones/:id/observar                    → Nueva observación (Director/Decano)
POST   /declaraciones/:id/subsanar                    → Docente subsana y reenvía
GET    /declaraciones/pendientes/departamento         → Director: pendientes de su depto
GET    /declaraciones/pendientes/facultad             → Decano: pendientes de facultad
```

#### 4.3.9 Validaciones a implementar

| ID | Validación |
|----|------------|
| V23 | No se puede observar sin texto de observación |
| V24 | No se puede aprobar si hay observaciones sin subsanar |
| V25 | Director solo ve/actúa sobre docentes de su departamento |
| V26 | Decano solo ve/actúa sobre su facultad |
| V27 | Docente solo subsana si estado = OBSERVADO_DPTO o OBSERVADO_FACULTAD |
| V28 | No se puede cambiar a un estado no válido según la máquina |

#### 4.3.10 Reglas de negocio cubiertas

- R23-R28: Restricciones por estado
- R24: ENVIADO_DOCENTE → solo observar/revisar
- R25: OBSERVADO_DPTO → solo docente edita
- R26: VALIDADO_DPTO → solo decano
- R27: APROBADO_FACULTAD → solo CERRADO
- R28: CERRADO → solo consulta

#### 4.3.11 Dependencias

- **Fase 2**: Declaración mejorada con carga lectiva/no lectiva completa
- **Existente**: Máquina de estados en backend (validarTransicionEstado)

#### 4.3.12 Entregables

- Backend: entidad DeclaracionObservacion, endpoints de observación/subsanación
- Frontend: stepper de estados, tabla de observaciones, vista de director, vista de decano
- Restricciones por departamento/facultad en backend
- Seed: declaraciones en varios estados para demostración

#### 4.3.13 Evidencia para el docente

- Demostrar flujo completo: BORRADOR → ENVIADO → OBSERVADO → SUBSANADO → VALIDADO → APROBADO → CERRADO
- Mostrar que director solo ve su departamento
- Mostrar observaciones con trazabilidad
- Mostrar que docente no puede editar mientras está en ENVIADO_DOCENTE

#### 4.3.14 Riesgos y errores frecuentes

- **Transiciones inválidas**: Usar la máquina de estados existente en backend para prevenir saltos ilegales.
- **Falta de restricción departamental**: El director no debe ver declaraciones de otros departamentos.
- **Observaciones sin texto**: La observación debe ser obligatoria para prevenir acciones sin justificación.

#### 4.3.15 Criterios de aceptación

- [ ] Los 11 estados son visibles en frontend con colores y labels
- [ ] Stepper de progreso funcional
- [ ] Director puede observar con texto obligatorio
- [ ] Docente puede subsanar y reenviar
- [ ] Decano puede aprobar u observar
- [ ] Director solo ve su departamento
- [ ] Observaciones tienen trazabilidad (fecha, quién, texto)
- [ ] Estado CERRADO es terminal y no editable

---

### FASE 4 — Declaración Jurada de Incompatibilidad (F02-CAD)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPORTANTE — Alta |
| **Duración estimada** | 3-4 días |
| **Dependencias** | Fase 2 (Declaración con datos completos) |
| **Riesgo si no se hace** | Falta el documento de declaración jurada, obligatorio en el proceso UNT |

#### 4.4.1 Objetivo

Implementar la Declaración Jurada de Incompatibilidad (F02-CAD) como un documento generable con los datos del docente, su modalidad y la declaración correspondiente sobre incompatibilidad laboral/horaria.

#### 4.4.2 Qué problema resuelve

- Hoy la declaración jurada se genera como PDF inline desde el frontend (jsPDF) sin lógica de negocio
- No hay diferenciación por modalidad (DE/TC vs TP)
- No hay almacenamiento del documento generado
- No hay control de si el docente ya generó su declaración jurada

#### 4.4.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/entities/declaracion-jurada.entity.ts` | Crear |
| `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.service.ts` | Modificar |
| `backend/src/reportes/reportes.service.ts` | Modificar (método F02-CAD) |
| `backend/src/reportes/reportes.controller.ts` | Modificar (endpoint) |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.html` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-aprobacion/verificar-aprobacion.component.ts` | Modificar |

#### 4.4.4 Entidad a crear

**DeclaracionJurada** (`declaracion_jurada`):
```
id: int (PK, auto)
declaracion_id: int (FK → DeclaracionCargaHoraria)
docente_id: int (FK → Docente)
periodo_id: int (FK → PeriodoAcademico)
tipo_declaracion: varchar(30)    // EXCLUSIVIDAD | COMPATIBILIDAD_PARCIAL | COMPATIBILIDAD_TOTAL
contenido: jsonb                  // Texto completo de la declaración
generada_en: timestamp
fecha_firma: timestamp (nullable)
firma_url: varchar(500) (nullable)
estado: varchar(20)              // PENDIENTE | FIRMADA | ANULADA
```

#### 4.4.5 Funcionalidades específicas

1. **Generación automática según modalidad**:
   - DE/TC: "Declaro no tener otro empleo ni cargo público ni actividad privada durante el horario académico..."
   - TP: "Declaro que mi horario académico es compatible con mi actividad laboral en..."
2. **Previsualización antes de generar**: Mostrar el texto de la declaración con datos del docente
3. **Checkbox de aceptación**: "Declaro bajo juramento que los datos son verdaderos"
4. **Generación de PDF**: Descargar F02-CAD con formato oficial
5. **Registro de generación**: Queda registro en la tabla declaracion_jurada
6. **Asociación con declaración**: La declaración jurada se vincula a la declaración de carga

#### 4.4.6 Pantallas a crear/modificar

**Sección dentro de VerificarDeclaracionComponent** (nuevo tab o sección):
- Badge: "Declaración Jurada: Pendiente ✅" o "Declaración Jurada: Generada 📄"
- Botón "Generar Declaración Jurada"
- Previsualización del texto de la declaración
- Checkbox de aceptación
- Botón "Descargar PDF"

**Nuevo diálogo o sección**:
- Selector de tipo (si aplica): automático según modalidad
- Texto completo de la declaración con datos del docente interpolados
- Checkbox: "Declaro bajo juramento que los datos consignados son verdaderos y correctos"
- Botón: "Generar y Descargar PDF"

#### 4.4.7 Campos del F02-CAD

```
UNIVERSIDAD NACIONAL DE TRUJILLO
FACULTAD DE INGENIERÍA DE SISTEMAS
DEPARTAMENTO ACADÉMICO DE INGENIERÍA DE SISTEMAS

DECLARACIÓN JURADA DE INCOMPATIBILIDAD
F02-CAD

Yo, [Apellidos, Nombres]
Identificado con DNI N° [DNI]
Docente del Departamento Académico de [Departamento]
Con modalidad [Modalidad]

DECLARO BAJO JURAMENTO:
[Texto según modalidad]

__________________________
Firma del Docente
[Fecha]
```

#### 4.4.8 Tipos de declaración por modalidad

| Modalidad | Tipo | Texto base |
|-----------|------|------------|
| DEDICACION_EXCLUSIVA | EXCLUSIVIDAD | No tener otro empleo ni ejercer actividad profesional fuera de la UNT |
| TIEMPO_COMPLETO_40 | COMPATIBILIDAD_TOTAL | Compatibilidad total con el horario académico |
| TIEMPO_PARCIAL_20/12/10/8 | COMPATIBILIDAD_PARCIAL | Compatibilidad parcial, detallar actividad externa y horario |

#### 4.4.9 Dependencias

- **Fase 2**: Docente debe tener datos completos (DNI, modalidad, departamento)
- **Existente**: Generación PDF vía jsPDF/Puppeteer

#### 4.4.10 Entregables

- Backend: entidad DeclaracionJurada, endpoint de generación, método en reportes.service
- Frontend: sección de declaración jurada con previsualización y descarga
- PDF: formato F02-CAD oficial

#### 4.4.11 Evidencia para el docente

- Mostrar generación automática según modalidad (DE vs TP)
- Mostrar PDF descargable con datos correctos
- Mostrar que queda registro de generación

#### 4.4.12 Riesgos y errores frecuentes

- **Texto genérico vs personalizado**: El texto debe incluir los datos específicos del docente, no ser una plantilla genérica.
- **Modalidad incorrecta**: Si el docente cambia de modalidad, la declaración debe reflejar la nueva.

#### 4.4.13 Criterios de aceptación

- [ ] F02-CAD se genera automáticamente según modalidad del docente
- [ ] PDF descargable con formato oficial
- [ ] Checkbox de aceptación requerido antes de generar
- [ ] Queda registro de generación (fecha, tipo, estado)
- [ ] Texto incluye datos reales del docente

---

### FASE 5 — Horario Semanal (F03-CAD) y Carga Adicional

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPORTANTE — Alta |
| **Duración estimada** | 3-5 días |
| **Dependencias** | Fase 2 (Carga no lectiva), Fase 1 (Asignaciones) |
| **Riesgo si no se hace** | El horario semanal no incluye carga no lectiva ni carga adicional |

#### 4.5.1 Objetivo

Mejorar la generación del Horario Semanal (F03-CAD) para que incluya:
- Actividades lectivas (desde horarios asignados)
- Actividades no lectivas (desde la declaración)
- Carga lectiva adicional (si aplica)
- Diferenciación visual entre teoría y práctica

#### 4.5.2 Qué problema resuelve

- El F03-CAD actual genera la matriz de horarios pero no incluye carga no lectiva
- No hay separación visual entre teoría, práctica y laboratorio
- No se incluye carga adicional
- El horario no está sincronizado con la declaración de carga

#### 4.5.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/reportes/reportes.service.ts` | Modificar (método F03-CAD) |
| `backend/src/reportes/reportes.controller.ts` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-declaracion/verificar-declaracion.component.html` | Modificar |
| `frontend/src/app/modules/declaraciones/verificar-aprobacion/verificar-aprobacion.component.ts` | Modificar |

#### 4.5.4 Funcionalidades específicas

1. **Matriz semanal con 4 tipos de actividad**:
   - Teoría (color azul)
   - Práctica (color verde)
   - Laboratorio (color naranja)
   - No lectiva (color gris/morado)
2. **Incluir carga no lectiva en el horario**: Las horas no lectivas se distribuyen en la matriz según el detalle del docente
3. **Leyenda de colores** en el PDF
4. **Separación de teoría/práctica/lab** en filas o columnas diferenciadas
5. **Total de horas por día** y **total semanal**
6. **Sincronización con F01-CAD**: El total de horas del horario debe coincidir con el total de la declaración
7. **Watermark**: "BORRADOR" si estado < APROBADO, "DOCUMENTO OFICIAL" si ≥ APROBADO

#### 4.5.5 Mejoras al F03-CAD existente

El método `generarReporteDeclaracionF03CADPDF` ya existe en `reportes.service.ts` y genera un PDF con Puppeteer. Las mejoras son:

- Agregar fila de carga no lectiva en la matriz
- Agregar columna de total por día
- Agregar watermark según estado
- Agregar leyenda de colores
- Incluir datos del docente en el encabezado (nombre, DNI, departamento, modalidad)

#### 4.5.6 Endpoints

```
GET /reportes/docente/:id/f03-cad?periodo=    → F03-CAD PDF (ya existe como declaracion/:id/pdf)
```

Mejorar el existente o crear nuevo endpoint específico F03-CAD.

#### 4.5.7 Dependencias

- **Fase 2**: Declaración con carga no lectiva completa
- **Fase 1**: Asignaciones lectivas
- **Existente**: Reportes Service con generación PDF

#### 4.5.8 Entregables

- Backend: F03-CAD mejorado con carga no lectiva y watermark
- Frontend: vista previa del horario con colores por tipo
- PDF: formato F03-CAD oficial con todos los elementos

#### 4.5.9 Evidencia para el docente

- Mostrar horario semanal con actividades lectivas (coloreadas por tipo) y no lectivas
- Mostrar que el total de horas coincide con el F01-CAD
- Mostrar watermark según estado

#### 4.5.10 Riesgos y errores frecuentes

- **Inconsistencia F01 vs F03**: El total de horas del horario debe coincidir exactamente con la declaración. Usar el mismo snapshot de carga.
- **No lectiva sin horario**: Las actividades no lectivas no tienen un horario fijo (el docente las distribuye). Usar franjas genéricas o bloques estimados.

#### 4.5.11 Criterios de aceptación

- [ ] F03-CAD incluye actividades lectivas y no lectivas
- [ ] Colores diferenciados por tipo de actividad
- [ ] Total de horas por día y semanal
- [ ] Watermark según estado de la declaración
- [ ] Total coincide con F01-CAD

---

### FASE 6 — Reportes Operacionales F01-CAD y Consolidados

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPORTANTE — Alta |
| **Duración estimada** | 4-6 días |
| **Dependencias** | Fase 2, 3, 4, 5 |
| **Riesgo si no se hace** | No hay documentos oficiales para presentar en la revisión |

#### 4.6.1 Objetivo

Crear el reporte F01-CAD (Declaración de Carga Académica Docente) completo con todos los campos del formato oficial UNT, y mejorar los reportes consolidados existentes para que incluyan datos de carga académica.

#### 4.6.2 Qué problema resuelve

- No existe F01-CAD como reporte independiente
- Los reportes consolidados actuales son solo de horarios, no de carga académica
- No hay reporte que muestre la carga completa (lectiva + no lectiva) de un docente

#### 4.6.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/reportes/reportes.service.ts` | Modificar (nuevo método F01-CAD) |
| `backend/src/reportes/reportes.controller.ts` | Modificar (nuevo endpoint) |
| `frontend/src/app/modules/reportes/reportes.component.ts` | Modificar |
| `frontend/src/app/modules/reportes/reportes.component.html` | Modificar |

#### 4.6.4 Funcionalidades específicas

1. **F01-CAD PDF**: Declaración completa con:
   - Encabezado institucional (UNT, Facultad, Departamento)
   - Datos del docente (DNI, nombre, condición, categoría, modalidad)
   - Datos del período (año académico, semestre, fechas)
   - Tabla de carga lectiva (código, denominación, tipo, escuela, ciclo, sección, alumnos, hrs teoría/práctica/lab, total)
   - Tabla de carga no lectiva (10 rubros con detalle y horas)
   - Total general
   - Líneas de firma (docente, director, decano)
   - Fecha de generación
2. **Reporte Consolidado de Carga por Departamento**:
   - Tabla: Docente, Condición, Modalidad, Hrs Lectivas, Hrs No Lectivas, Total, Estado
   - Totales por departamento
3. **Reporte de Carga por Modalidad**:
   - Distribución de docentes por modalidad
   - Promedio de horas por modalidad

#### 4.6.5 Endpoints

```
GET /reportes/f01-cad/:docenteId?periodo=      → F01-CAD PDF
GET /reportes/consolidado-carga?periodo=&departamento_id=  → Consolidado PDF
GET /reportes/carga-por-modalidad?periodo=       → Por modalidad PDF
GET /reportes/consolidado-carga/excel?periodo=   → Consolidado Excel
```

#### 4.6.6 Dependencias

- **Fase 2**: Datos de carga lectiva y no lectiva
- **Fase 3**: Estado de la declaración (para watermark)
- **Fase 4**: Declaración jurada (para incluir referencia)
- **Fase 5**: Horario semanal (para verificar consistencia)

#### 4.6.7 Entregables

- Backend: 3 nuevos reportes PDF + 1 Excel
- Frontend: nuevos botones en la pantalla de reportes
- Documentación: formato de cada reporte

#### 4.6.8 Evidencia para el docente

- Mostrar F01-CAD completo con datos de un docente real del seed
- Mostrar que incluye carga lectiva (con horas del plan) y no lectiva (10 rubros)
- Mostrar el consolidado por departamento

#### 4.6.9 Riesgos y errores frecuentes

- **Formato incorrecto**: El F01-CAD debe coincidir con el formato oficial UNT. Revisar con un docente antes de la entrega.
- **Datos inconsistentes**: El total del F01-CAD debe coincidir con el F03-CAD. Usar el mismo snapshot.

#### 4.6.10 Criterios de aceptación

- [ ] F01-CAD PDF generable con todos los campos del formato
- [ ] Reporte consolidado por departamento
- [ ] Reporte por modalidad
- [ ] Excel consolidado exportable
- [ ] Watermark según estado de declaración

---

### FASE 7 — Dashboard de Carga Académica y Estadísticas

| Atributo | Valor |
|----------|-------|
| **Prioridad** | IMPORTANTE — Media |
| **Duración estimada** | 4-5 días |
| **Dependencias** | Fase 2, 3, 6 |
| **Riesgo si no se hace** | No hay visibilidad de gestión del proceso de carga académica |

#### 4.7.1 Objetivo

Crear un dashboard específico de carga académica con KPIs, gráficos y tablas que permitan a directores y decanos monitorear el avance del proceso de declaración docente.

#### 4.7.2 Qué problema resuelve

- El dashboard actual muestra KPIs de horarios (ocupación, conflictos, etc.)
- No hay visibilidad del proceso de carga académica
- Los directores no saben qué docentes han declarado, quiénes están pendientes, quiénes tienen observaciones

#### 4.7.3 Módulos o componentes que abarca

| Componente | Acción |
|------------|--------|
| `backend/src/modules/dashboard/dashboard.service.ts` | Modificar |
| `backend/src/modules/dashboard/dashboard.controller.ts` | Modificar |
| `frontend/src/app/modules/dashboard/dashboard.component.ts` | Modificar (nueva sección) |
| `frontend/src/app/modules/dashboard/dashboard.component.html` | Modificar |
| `frontend/src/app/core/interfaces/entities.ts` | Modificar (nuevos tipos) |

#### 4.7.4 Indicadores del Dashboard de Carga

| Indicador | Cálculo | Visualización |
|-----------|---------|---------------|
| Total docentes | COUNT(docentes activos) | Tarjeta KPI |
| Declaraciones enviadas | COUNT(donde estado ≥ ENVIADO_DOCENTE) | Tarjeta KPI |
| Declaraciones aprobadas | COUNT(donde estado = APROBADO_FACULTAD) | Tarjeta KPI |
| % de avance | Enviados / Total × 100 | Barra de progreso |
| Docentes con observaciones | COUNT(estado = OBSERVADO_DPTO o OBSERVADO_FACULTAD) | Tarjeta KPI (roja si > 0) |
| Carga lectiva promedio | SUM(horas lectivas) / COUNT(docentes) | Tarjeta KPI |
| Distribución por estado | COUNT agrupado por estado | Funnel chart (BORRADOR → ENVIADO → VALIDADO → APROBADO) |
| Carga por departamento | Promedio de horas por departamento | Bar chart |
| Top 5 con más carga | Docentes ordenados por total de horas | Horizontal bar chart |
| Avance temporal | Declaraciones por día/semana | Line chart |

#### 4.7.5 Endpoints

```
GET /dashboard/carga/resumen?periodo=     → KPIs generales
GET /dashboard/carga/departamentos?periodo=  → Por departamento
GET /dashboard/carga/estados?periodo=       → Distribución por estado
GET /dashboard/carga/top-docentes?periodo=&limit=5  → Top 5
GET /dashboard/carga/avance?periodo=        → Avance temporal
```

#### 4.7.6 Pantallas

**Sección dentro de DashboardComponent** (nuevo tab "Carga Académica"):
- Mismas tarjetas KPI que el dashboard general pero con datos de carga
- Funnel chart: BORRADOR → ENVIADO → VALIDADO → APROBADO
- Tabla de docentes con estado y acciones rápidas
- Selector de departamento para filtrar

**O widget independiente** en la página principal del dashboard existente.

#### 4.7.7 Dependencias

- **Fase 2**: Declaraciones con datos completos
- **Fase 3**: Estados visibles y trazables
- **Fase 6**: Reportes para validar los indicadores

#### 4.7.8 Entregables

- Backend: nuevos endpoints de KPIs de carga
- Frontend: dashboard de carga con tarjetas, gráficos y tabla
- Datos: seed con suficientes declaraciones para poblar los KPIs

#### 4.7.9 Evidencia para el docente

- Mostrar dashboard con KPIs reales del seed
- Mostrar funnel chart de distribución por estado
- Mostrar tabla de docentes con estado y acciones

#### 4.7.10 Riesgos y errores frecuentes

- **KPIs sin datos**: El seed debe incluir suficientes declaraciones en varios estados.
- **Rendimiento**: Los cálculos de KPI no deben ser consultas N+1. Usar agregaciones SQL.

#### 4.7.11 Criterios de aceptación

- [ ] KPIs básicos visibles y correctos
- [ ] Funnel chart de distribución por estado
- [ ] Tabla de docentes con estado
- [ ] Filtro por departamento funcional
- [ ] Gráfico de avance temporal

---

### FASE 8 — Reportes de Gestión

| Atributo | Valor |
|----------|-------|
| **Prioridad** | DESEABLE — Media |
| **Duración estimada** | 3-4 días |
| **Dependencias** | Fase 6 (Reportes operacionales), Fase 7 (Dashboard) |
| **Riesgo si no se hace** | Los reportes de gestión existen pero no incluyen métricas de carga académica |

#### 4.8.1 Objetivo

Mejorar los reportes de gestión existentes (`generarReporteGestionPDF`) para incluir métricas específicas de carga académica y cumplimiento del proceso de declaración.

#### 4.8.2 Qué problema resuelve

- El reporte de gestión actual incluye KPIs de horarios (total docentes, % ocupación, conflictos)
- No incluye: % de cumplimiento de declaraciones, distribución de carga por categoría, docentes con observaciones, etc.

#### 4.8.3 Funcionalidades específicas

1. **Reporte de Gestión de Carga Académica**:
   - Total docentes del período
   - % de declaraciones enviadas vs total
   - % de declaraciones aprobadas vs total
   - Distribución de carga lectiva por categoría docente
   - Docentes con observaciones (cantidad y %)
   - Tiempo promedio del proceso (desde envío hasta aprobación)
   - Comparativa con período anterior
2. **Reporte de Cumplimiento por Departamento**:
   - Departamento, Total docentes, Declarados, Validados, Aprobados, % de avance
3. **Reporte Ejecutivo para Decano**:
   - Resumen de facultad
   - Tabla de departamentos con semáforo (verde ≥ 80%, amarillo ≥ 50%, rojo < 50%)

#### 4.8.4 Endpoints

```
GET /reportes/gestion/carga?periodo=       → Reporte de gestión de carga (PDF)
GET /reportes/gestion/cumplimiento?periodo=  → Cumplimiento por departamento (PDF/Excel)
GET /reportes/gestion/ejecutivo?periodo=    → Ejecutivo para decano (PDF)
```

#### 4.8.5 Dependencias

- **Fase 6**: Reportes operacionales como base
- **Fase 7**: KPIs calculados (reutilizar lógica)

#### 4.8.6 Entregables

- Backend: 3 nuevos reportes de gestión
- PDFs: con tablas, gráficos y formato profesional

#### 4.8.7 Criterios de aceptación

- [ ] Reporte de gestión incluye métricas de carga académica
- [ ] Reporte de cumplimiento por departamento
- [ ] Reporte ejecutivo para decano con semáforo
- [ ] PDFs descargables con formato profesional

---

### FASE 9 — Auditoría y Trazabilidad (Extensión)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | DESEABLE — Media |
| **Duración estimada** | 2-3 días |
| **Dependencias** | Fase 3 (Flujo de validación) |
| **Riesgo si no se hace** | No hay trazabilidad de quién hizo qué en el proceso de carga académica |

#### 4.9.1 Objetivo

Extender el sistema de auditoría existente (hoy enfocado en horarios) para cubrir todas las operaciones de carga académica: creación de asignaciones, cambios de estado de declaraciones, observaciones, aprobaciones.

#### 4.9.2 Qué problema resuelve

- `AuditLogService` (file-based) solo se usa en configuraciones
- `AuditoriaService` (DB-based) solo registra cambios en horarios
- No hay trazabilidad de quién asignó un curso, quién observó una declaración, quién aprobó

#### 4.9.3 Funcionalidades específicas

1. **Auditoría de asignación lectiva**:
   - Creación: quién, cuándo, qué docente-curso
   - Cambio de estado: PENDIENTE → CONFIRMADO, quién y cuándo
   - Eliminación: quién, cuándo, motivo
2. **Auditoría de declaraciones**:
   - Cambios de estado (completo: origen → destino, quién, cuándo)
   - Observaciones: texto completo, quién, cuándo
   - Aprobaciones: quién, cuándo
3. **Consulta de auditoría**:
   - Filtros: período, usuario, acción, entidad, rango de fechas
   - Vista de detalle: datos anteriores vs nuevos

#### 4.9.4 Endpoints

```
GET /auditoria/carga?periodo=&usuario_id=&entidad=&accion=&desde=&hasta=
```

#### 4.9.5 Dependencias

- **Fase 3**: Flujo de validación con transiciones de estado
- **Existente**: AuditoriaService, AuditoriaHorario entity

#### 4.9.6 Entregables

- Backend: extensión de AuditoriaService para carga académica
- Frontend: pestaña de auditoría de carga en la pantalla de auditoría existente

#### 4.9.7 Criterios de aceptación

- [ ] Cada cambio de estado de declaración queda registrado
- [ ] Cada asignación lectiva queda registrada
- [ ] Consulta de auditoría con filtros funcional
- [ ] Vista de detalle muestra datos anteriores y nuevos

---

### FASE 10 — Carga Lectiva Adicional

| Atributo | Valor |
|----------|-------|
| **Prioridad** | DESEABLE — Baja |
| **Duración estimada** | 2-3 días |
| **Dependencias** | Fase 2 (Declaración base) |
| **Riesgo si no se hace** | No se contempla el caso de docentes con carga adicional por comisiones o proyectos |

#### 4.10.1 Objetivo

Implementar el registro de carga lectiva adicional para docentes que realizan actividades fuera de su asignación regular (comisiones, proyectos especiales, cargos de gobierno).

#### 4.10.2 Qué problema resuelve

- El sistema actual solo considera la carga lectiva regular
- Hay docentes con cargos (director, decano) o comisiones que tienen horas adicionales
- No hay registro de esta carga extra

#### 4.10.3 Funcionalidades específicas

1. **Registro de carga adicional**:
   - Dependencia o unidad
   - Curso o actividad
   - Fechas de inicio y fin
   - Horario semanal
   - Total de horas
   - Unidad académica relacionada
   - Resolución o documento sustentatorio
2. **Vinculación con declaración**: La carga adicional se suma al total de la declaración
3. **Validación**: La carga adicional no puede hacer exceder el total de la modalidad

#### 4.10.4 Tabla a crear

**CargaAdicional** (`carga_adicional`):
```
id: int (PK, auto)
declaracion_id: int (FK → DeclaracionCargaHoraria)
docente_id: int (FK → Docente)
dependencia: varchar(200)
actividad: varchar(200)
fecha_inicio: date
fecha_fin: date
horario_semanal: jsonb        // [{dia, hora_inicio, hora_fin}]
total_horas: smallint
unidad_academica: varchar(200)
resolucion: varchar(100) (nullable)
observaciones: text (nullable)
created_at: timestamp
```

#### 4.10.5 Dependencias

- **Fase 2**: Declaración base para vincular la carga adicional

#### 4.10.6 Entregables

- Backend: entidad CargaAdicional, CRUD endpoints
- Frontend: sección de carga adicional dentro de la declaración

#### 4.10.7 Criterios de aceptación

- [ ] Carga adicional registrable y editable
- [ ] Vinculada a la declaración del docente
- [ ] No permite exceder el total de la modalidad
- [ ] Visible en el resumen de carga total

---

### FASE 11 — Usuarios, Roles y Perfiles (Perfeccionamiento)

| Atributo | Valor |
|----------|-------|
| **Prioridad** | DESEABLE — Baja |
| **Duración estimada** | 2-3 días |
| **Dependencias** | Fase 3 (Restricciones por departamento) |
| **Riesgo si no se hace** | El sistema funciona pero sin restricciones finas de datos por rol |

#### 4.11.1 Objetivo

Perfeccionar el sistema de roles y perfiles para que cada usuario vea exactamente los datos que le corresponden según su unidad académica (departamento, facultad).

#### 4.11.2 Qué problema resuelve

- Hoy los roles controlan rutas pero no datos
- Un director podría ver docentes de otros departamentos
- No hay restricción a nivel de fila (row-level security)

#### 4.11.3 Funcionalidades específicas

1. **Restricción por departamento**: Director de departamento solo ve su departamento
2. **Restricción por facultad**: Decano solo ve su facultad
3. **Perfil de secretaría**: Asigna cursos solo de su departamento
4. **Perfil de coordinador**: Puede ver todos los departamentos de su escuela
5. **Asociación usuario-docente**: Vincular usuario con docente para acciones automáticas

#### 4.11.4 Modificaciones

- `RolesGuard`: agregar lógica de contexto (departamento, facultad)
- Servicios: filtrar por unidad del usuario actual
- Frontend: ocultar datos no autorizados

#### 4.11.5 Dependencias

- **Fase 3**: Ya implementa restricción básica de director

#### 4.11.6 Entregables

- Backend: guards y servicios con filtrado por unidad
- Frontend: datos filtrados según rol del usuario

#### 4.11.7 Criterios de aceptación

- [ ] Director solo ve su departamento
- [ ] Decano solo ve su facultad
- [ ] Secretaría solo asigna en su departamento
- [ ] Admin ve todo

---

### FASE 12 — Seed Completo y Pruebas Integrales

| Atributo | Valor |
|----------|-------|
| **Prioridad** | DESEABLE — Alta (para cierre) |
| **Duración estimada** | 3-5 días |
| **Dependencias** | Todas las fases anteriores |
| **Riesgo si no se hace** | No hay datos de prueba para demostrar el sistema completo |

#### 4.12.1 Objetivo

Actualizar el seed (`seed.ts`) para incluir todos los datos necesarios para demostrar el sistema completo: plan de estudios 2018, asignaciones lectivas, declaraciones en múltiples estados, observaciones, horarios, y reportes.

#### 4.12.2 Qué problema resuelve

- El seed actual tiene 28 docentes, 38 cursos y horarios
- No incluye plan de estudios, asignaciones, declaraciones en varios estados
- No se puede demostrar el flujo completo sin cargar datos manualmente

#### 4.12.3 Funcionalidades específicas

1. **Plan de Estudios 2018**: Cargar todos los cursos de ciclos I, III, V, VII, IX (mínimo 30 cursos)
2. **Asignaciones lectivas**: Mínimo 20 asignaciones distribuidas entre varios docentes
3. **Declaraciones en varios estados**:
   - 5 en BORRADOR
   - 5 en ENVIADO_DOCENTE
   - 3 en OBSERVADO_DPTO (con observaciones)
   - 2 en SUBSANADO
   - 3 en VALIDADO_DPTO
   - 2 en APROBADO_FACULTAD
   - 2 en CERRADO
4. **Observaciones**: Al menos 3 con diferentes fechas y usuarios
5. **Declaraciones juradas**: Al menos 3 generadas
6. **Docentes DNI**: Asignar DNI a los 28 docentes del seed

#### 4.12.4 Orden de carga del seed

```
1. Limpiar tablas (TRUNCATE CASCADE)
2. Usuarios (7 roles)
3. Facultad, Escuela, Departamento
4. Plan de Estudios 2018
5. Cursos y CursoPlanEstudios
6. Ambientes
7. Docentes (con DNI)
8. Períodos
9. Turnos, Días Activos
10. Grupos
11. Asignaciones Lectivas
12. Horarios Asignados
13. Declaraciones de Carga (en varios estados)
14. Observaciones
15. Declaraciones Juradas
16. Configuración General
```

#### 4.12.5 Dependencias

- **Todas las fases**: Cada fase debe estar completa para que el seed funcione

#### 4.12.6 Entregables

- `seed.ts` actualizado con datos completos
- Script de prueba para verificar integridad de datos

#### 4.12.7 Plan de pruebas integrales

| Prueba | Descripción | Rol |
|--------|-------------|-----|
| P1 | Login como cada rol y verificar acceso a rutas | Todos |
| P2 | CRUD Plan de Estudios | Director Escuela |
| P3 | Asignar curso a docente (con validación) | Secretaría |
| P4 | Ver cursos asignados en declaración | Docente |
| P5 | Completar carga no lectiva y enviar | Docente |
| P6 | Observar declaración como director | Director |
| P7 | Subsanar y reenviar como docente | Docente |
| P8 | Validar declaración como director | Director |
| P9 | Aprobar declaración como decano | Decano |
| P10 | Generar F01-CAD, F02-CAD, F03-CAD | Docente |
| P11 | Ver dashboard de carga | Director/Decano |
| P12 | Ver reportes de gestión | Decano |
| P13 | Consultar auditoría | Admin |

#### 4.12.8 Criterios de aceptación

- [ ] Seed ejecutable sin errores
- [ ] Datos consistentes (sin referencias huérfanas)
- [ ] Declaraciones en al menos 5 estados diferentes
- [ ] Todos los KPIs del dashboard con datos
- [ ] Todos los reportes generables con datos del seed

---

## 5. Cronograma Sugerido por Fases

| Fase | Nombre | Días | Semana | Prioridad |
|------|--------|------|--------|-----------|
| 0 | Plan de Estudios | 5-7 | Semana 1 | IMPRESCINDIBLE |
| 1 | Asignación Lectiva | 6-8 | Semana 2 | IMPRESCINDIBLE |
| 2 | Declaración (mejora) | 5-7 | Semana 3 | IMPRESCINDIBLE |
| 3 | Flujo de Validación | 5-7 | Semana 4 | IMPRESCINDIBLE |
| 4 | F02-CAD | 3-4 | Semana 5 | IMPORTANTE |
| 5 | F03-CAD | 3-5 | Semana 5 | IMPORTANTE |
| 6 | F01-CAD y Consolidados | 4-6 | Semana 6 | IMPORTANTE |
| 7 | Dashboard de Carga | 4-5 | Semana 7 | IMPORTANTE |
| 8 | Reportes de Gestión | 3-4 | Semana 7-8 | DESEABLE |
| 9 | Auditoría (extensión) | 2-3 | Semana 8 | DESEABLE |
| 10 | Carga Adicional | 2-3 | Semana 8 | DESEABLE |
| 11 | Roles y Perfiles | 2-3 | Semana 8 | DESEABLE |
| 12 | Seed y Pruebas | 3-5 | Semana 8-9 | DESEABLE |

**Total estimado**: 8-9 semanas con dedicación full-time, o 12-14 semanas en paralelo.

---

## 6. Checklist Final de Implementación

### Imprescindible (Fases 0-3)

- [ ] Fase 0: Plan de Estudios 2018 creado con 30+ cursos
- [ ] Fase 0: Cursos agrupables por ciclo (I-X)
- [ ] Fase 0: Prerrequisitos registrables
- [ ] Fase 1: Asignación lectiva desde plan de estudios
- [ ] Fase 1: Validación de carga máxima al asignar
- [ ] Fase 1: Validación de cursos máximos al asignar
- [ ] Fase 2: Carga lectiva precargada desde asignaciones (no editable)
- [ ] Fase 2: 10 rubros de carga no lectiva exactos del F01-CAD
- [ ] Fase 2: Preparación y Evaluación limitada al 50%
- [ ] Fase 2: Total general validado contra modalidad
- [ ] Fase 3: 11 estados visibles en frontend
- [ ] Fase 3: Stepper de progreso funcional
- [ ] Fase 3: Observaciones con trazabilidad
- [ ] Fase 3: Subsanación funcional
- [ ] Fase 3: Director solo ve su departamento
- [ ] Fase 3: Decano puede aprobar u observar

### Importante (Fases 4-7)

- [ ] Fase 4: F02-CAD generable según modalidad
- [ ] Fase 4: PDF descargable con formato oficial
- [ ] Fase 5: F03-CAD incluye carga lectiva y no lectiva
- [ ] Fase 5: Watermark según estado
- [ ] Fase 6: F01-CAD con todos los campos del formato
- [ ] Fase 6: Reporte consolidado por departamento
- [ ] Fase 7: KPIs de carga académica en dashboard
- [ ] Fase 7: Funnel chart de distribución por estado
- [ ] Fase 7: Tabla de docentes con estado

### Deseable (Fases 8-12)

- [ ] Fase 8: Reportes de gestión con métricas de carga
- [ ] Fase 8: Reporte ejecutivo para decano
- [ ] Fase 9: Auditoría de cambios de estado
- [ ] Fase 9: Consulta de auditoría con filtros
- [ ] Fase 10: Carga adicional registrable
- [ ] Fase 11: Restricciones por unidad académica
- [ ] Fase 12: Seed completo con datos en múltiples estados
- [ ] Fase 12: Pruebas integrales superadas

---

## 7. Orden Recomendado para Demostrar el Sistema en la Revisión

### Demostración de 30 minutos

| Tiempo | Qué mostrar | Quién opera | Fase relacionada |
|--------|-------------|-------------|------------------|
| 0-3 min | Login como administrador → Dashboard general → KPIs | Admin | Existente |
| 3-7 min | Navegar a Plan de Estudios → Ver plan 2018 → Cursos por ciclo → Prerrequisitos | Director Escuela | Fase 0 |
| 7-12 min | Asignación Lectiva: seleccionar período, plan, ciclo → Asignar docente a curso con validación de carga | Secretaría | Fase 1 |
| 12-17 min | Login como docente → Ver declaración → Cursos precargados → Completar carga no lectiva → Enviar | Docente | Fase 2 |
| 17-22 min | Login como director → Ver declaraciones pendientes → Observar declaración → Docente subsana → Director valida | Director/Docente | Fase 3 |
| 22-25 min | Login como decano → Ver declaraciones validadas → Aprobar | Decano | Fase 3 |
| 25-28 min | Generar F01-CAD, F02-CAD, F03-CAD → Mostrar formatos | Director | Fases 4,5,6 |
| 28-30 min | Dashboard de carga → KPIs → Reporte de gestión | Decano | Fases 7,8 |

### Puntos clave a resaltar en cada paso

1. **Plan de Estudios**: "Las horas de cada curso están definidas en el plan 2018, aprobado por resolución. De aquí se derivan todas las horas lectivas."
2. **Asignación**: "La secretaría asigna según la demanda. El sistema valida automáticamente que el docente no exceda su carga máxima."
3. **Declaración**: "El docente recibe sus cursos automáticamente. Solo completa la carga no lectiva. No puede modificar las horas lectivas porque vienen del plan."
4. **Validación**: "El director revisa, observa si hay error. El docente subsana. El decano aprueba. Todo queda trazado."
5. **Reportes**: "Los tres formatos oficiales (F01, F02, F03) se generan automáticamente con los datos del sistema."
6. **Dashboard**: "El director y decano tienen visibilidad completa del avance del proceso en tiempo real."

---

## 8. Riesgos Globales del Proyecto

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| R1 | El plan de estudios 2018 no está completo o tiene errores | Alta | Alto | Validar con Director de Escuela antes de cargar |
| R2 | Los docentes no tienen DNI en base de datos | Alta | Alto | Agregar DNI en seed y actualizar docentes existentes |
| R3 | La máquina de estados en backend no cubre todas las transiciones | Media | Alto | Revisar validarTransicionEstado y extender |
| R4 | Los reportes F01/F02/F03 no coinciden con formato oficial UNT | Media | Alto | Obtener formato oficial y validar con docente |
| R5 | Las validaciones de carga (V6-V12) son rechazadas en producción por ser muy restrictivas | Media | Medio | Hacer las validaciones configurables o con umbrales ajustables |
| R6 | El seed falla por dependencias circulares o datos faltantes | Media | Medio | Probar seed después de cada fase |
| R7 | La restricción por departamento (director solo ve su depto) es difícil de implementar con el esquema actual | Media | Medio | Usar query filters de TypeORM o repositorios con contexto |
| R8 | El frontend de declaraciones es muy grande (484 líneas) y difícil de modificar sin romper | Alta | Medio | Refactorizar en componentes más pequeños si es necesario |
| R9 | Los períodos de prueba son limitados (solo 2026-I en seed) | Baja | Bajo | Agregar datos históricos si es posible |
| R10 | No hay pruebas automatizadas para las nuevas funcionalidades | Alta | Medio | Al menos pruebas manuales siguiendo el checklist |

---

## 9. Recomendaciones Finales para Cerrar Brechas Antes de la Entrega

### Semana previa a la revisión

1. **Congelar desarrollo**: No agregar nuevas funcionalidades. Solo corregir bugs y pulir UX.
2. **Ejecutar seed completo**: Verificar que todos los datos se carguen sin errores.
3. **Recorrer el flujo completo**: BORRADOR → CERRADO con 3 roles distintos.
4. **Verificar todos los reportes**: Que F01, F02, F03 se generen correctamente con datos reales.
5. **Validar dashboard**: Que los KPIs tengan sentido y los gráficos se rendericen.
6. **Prueba de permisos**: Verificar que cada rol solo acceda a lo que debe.
7. **Preparar datos de demostración**: Tener un conjunto de datos específico para la demo (no el seed genérico).

### Documentación necesaria para la revisión

- [ ] **Manual de usuario**: Capturas de pantalla + descripción del flujo por rol
- [ ] **Manual técnico**: Arquitectura, entidades, endpoints
- [ ] **Guía de demostración**: Script de 30 minutos con pasos exactos
- [ ] **Evidencia de trazabilidad**: Logs de auditoría de una declaración completa
- [ ] **Formatos oficiales**: F01-CAD, F02-CAD, F03-CAD impresos para comparar con los oficiales UNT

### Lo que NO debe faltar el día de la revisión

- ✅ Ambiente corriente con seed cargado
- ✅ Cuentas de cada rol con contraseñas conocidas
- ✅ Datos de demostración consistentes (no datos huérfanos)
- ✅ Reportes pre-generados como respaldo (por si la generación falla)
- ✅ Checklist de funcionalidades marcado como completo
- ✅ Documentación impresa o accesible

---

*Documento generado como parte del Plan de Implementación del Sistema de Gestión de Horarios y Carga Académica Docente — UNT, Facultad de Ingeniería de Sistemas.*
