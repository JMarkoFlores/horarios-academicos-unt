# NUEVO.md — Resumen de cambios implementados

> **Propósito:** Documentar todos los cambios realizados en esta sesión para que la siguiente ejecución/continuación del trabajo tenga contexto claro sin necesidad de releer toda la conversación.

---

## 1. AGENTS.md creado

Se creó un archivo `AGENTS.md` profesional en la raíz del proyecto con:

- Visión general del sistema (Sistema de Gestión de Horarios y Carga Académica Docente UNT).
- Stack tecnológico completo (NestJS, Angular, TypeORM, PostgreSQL, Redis, etc.).
- Arquitectura de backend y frontend.
- Convenciones de código.
- Reglas para agregar nuevas funcionalidades.
- Checklist de modificaciones seguras.
- Comandos esenciales y notas críticas.

---

## 2. Ventanas de Atención — Declaración Inicial

### Problema
Los docentes con cursos asignados y disponibilidad declarada no aparecían en las ventanas de atención de tipo **DECLARACION**.

### Cambios en backend

#### `backend/src/docentes/docentes.service.ts` → `findCursosHabilitados`
- Antes solo mostraba asignaciones lectivas en estado `CONFIRMADO`.
- Ahora incluye asignaciones en estados `PENDIENTE` y `CONFIRMADO`.
- Las `RECHAZADAS` se siguen excluyendo.

#### `backend/src/modules/ventanas/ventanas.service.ts` → `buscarDocentesElegibles`
- Se agregó filtro `docente.activo = true`.
- Para ventanas de **DECLARACION**, ahora se exige que el docente:
  - Tenga carga lectiva asignada (`PENDIENTE` o `CONFIRMADO`) en el período.
  - No tenga horario asignado en ese período.
- Se inyectó el repositorio `AsignacionLectiva`.

#### `backend/src/modules/ventanas/ventanas.module.ts`
- Se registró la entidad `AsignacionLectiva` en `TypeOrmModule.forFeature`.

#### `backend/src/modules/ventanas/ventanas.controller.ts`
- Nuevo endpoint de diagnóstico:
  ```
  GET /ventanas/diagnostico-docente?docente_id=X&periodo=Y&proposito=DECLARACION
  ```
  Devuelve si el docente es elegible y por qué.

---

## 3. Asignación de Ambientes a Cursos

### 3.1 Filtrado por tipo de clase

#### `backend/src/docentes/docentes.service.ts` → `findAmbientesCompatibles`
- Ahora filtra ambientes según el tipo de clase:
  - `TEORIA` / `PRACTICA` → `AULA`, `TALLER`
  - `LABORATORIO` → `LABORATORIO`
- Se agregó **fallback por código de curso**: si un curso no tiene ambientes directos, busca otros cursos con el mismo código y reutiliza sus ambientes.

### 3.2 Quitar caché que causaba datos desactualizados

#### `backend/src/cursos/cursos.service.ts`
- Se eliminó la caché de 60 segundos en:
  - `asignarAmbientes`
  - `getAmbientesCompatibles`

### 3.3 Permitir asignar ambientes de Práctica

#### Frontend
- `frontend/src/app/modules/cursos/dialogs/asignar-ambientes-dialog/asignar-ambientes-dialog.component.ts`
  - `tipo_clase` ahora acepta `'TEORIA' | 'PRACTICA' | 'LABORATORIO'`.
  - Práctica usa ambientes `AULA` / `TALLER`.

- `frontend/src/app/modules/cursos/curso-detail/curso-detail.component.ts`
  - Se agregó **Práctica** como tipo de ambiente con clave `'PRACTICA'`.
  - `asignarAmbientes()` acepta los tres tipos.

- `frontend/src/app/modules/cursos/curso-detail/curso-detail.component.html`
  - Se corrigió la clase CSS para práctica (`practice`).

### 3.4 Mensaje informativo en ventana de atención

#### `frontend/src/app/modules/operador/ventana-detalle/ventana-detalle.component.html`
- Cuando no hay ambientes compatibles, se muestra:
  - Mensaje claro indicando que se deben asignar ambientes en **Cursos → Detalle del curso → Ambientes**.
  - Botón **"Ir a Cursos"**.
  - Sección de **diagnóstico técnico** con conteos de ambientes directos, por código y compatibles.

#### `frontend/src/app/modules/operador/ventana-detalle/ventana-detalle.component.ts`
- Se agregó método `irACursos()`.
- Se agregó método `diagnosticarAmbientes()`.
- Se agregaron logs en consola para depuración.

#### `frontend/src/app/modules/operador/ventana-detalle/ventana-detalle.component.scss`
- Estilos para la advertencia y el diagnóstico.

### 3.5 Endpoint de diagnóstico de ambientes

#### `backend/src/cursos/cursos.controller.ts`
- Nuevo endpoint:
  ```
  GET /cursos/:id/ambientes-diagnostico?tipo_clase=LABORATORIO
  ```

#### `backend/src/cursos/cursos.service.ts` → `diagnosticarAmbientes`
- Devuelve información detallada del curso, ambientes directos, cursos con mismo código, ambientes compatibles, etc.

### 3.6 Asignación automática de ambientes por defecto

#### `backend/src/database/asignar-ambientes-por-defecto.helper.ts` (NUEVO)
- Helper que asigna ambientes a todos los cursos activos según sus horas:
  - Teoría/Práctica > 0 → todos los `AULA` y `TALLER`.
  - Laboratorio > 0 → todos los `LABORATORIO`.
- No sobrescribe ambientes ya asignados.

#### `backend/src/database/seed.ts`
- Se integró el helper para que `npm run seed` asigne ambientes automáticamente.

#### `backend/src/cursos/cursos.service.ts` → `ejecutarAsignacionAmbientesPorDefecto`
- Método que ejecuta el helper dentro de una transacción.

#### `backend/src/cursos/cursos.controller.ts`
- Nuevo endpoint:
  ```
  POST /cursos/asignar-ambientes-por-defecto
  ```
  Roles permitidos: ADMIN, COORDINADOR_ACADEMICO, DIRECTOR_ESCUELA.

#### Frontend
- `frontend/src/app/modules/cursos/cursos-list/cursos-list.component.html`
  - Nuevo botón **"Ambientes por defecto"** en el header.

- `frontend/src/app/modules/cursos/cursos-list/cursos-list.component.ts`
  - Método `asignarAmbientesPorDefecto()` con confirmación y notificación.

---

## 4. Estado de los builds

- `npm run build` backend: ✅ exitoso.
- `npm run build` frontend: ✅ exitoso (con warnings preexistentes de budget en SCSS/fonts).

---

## 5. Próximos pasos recomendados

1. Reiniciar backend (`npm run start:dev`).
2. Ir a **Cursos** → hacer clic en **"Ambientes por defecto"**.
3. Verificar el mensaje de éxito.
4. Ir a **Ventanas de Atención** y comprobar que los ambientes aparecen para cada curso según su tipo (teoría, práctica, laboratorio).
5. Para cursos específicos, ajustar ambientes manualmente desde el detalle del curso.

---

## 6. Notas importantes

- Los ambientes dependen del **curso**, no del plan de estudios.
- Práctica y teoría comparten ambientes `AULA` / `TALLER`.
- Laboratorio usa solo ambientes `LABORATORIO`.
- Si un curso no tiene ambientes asignados, la ventana de atención mostrará el mensaje informativo y el diagnóstico técnico.

---

**Última actualización:** 2026-07-08

---

## 7. Corrección — Ambientes no aparecían en Ventana de Atención (Declaración Inicial)

### Diagnóstico

Los logs mostraban `ambientes del curso: 0` y `ambientes encontrados por codigo: 0` para todos los cursos.
El problema raíz era que **la tabla `curso_ambiente` estaba completamente vacía** en la BD en curso.
El helper `asignarAmbientesPorDefecto` fue agregado al seed pero el seed completo no se re-ejecutó.

### Causas identificadas

1. **Tabla `curso_ambiente` vacía**: Los 85 cursos activos no tenían ningún ambiente asignado en la BD.
2. **Caché stale en `findOne` de `cursos.service.ts`**: El método `findOne` usaba `.cache('curso_${id}_detalle', 60000)`, lo que podría devolver `ambientes: []` durante 60 segundos después de asignar ambientes.

### Solución aplicada

1. **Script standalone** `backend/src/database/run-asignar-ambientes.ts`:
   - Ejecutado con `npx ts-node -r tsconfig-paths/register src/database/run-asignar-ambientes.ts`
   - Resultado: **875 relaciones creadas** en 85 cursos
   - Script reutilizable (no borra datos existentes, es idempotente)

2. **Eliminado caché de `findOne`** en `backend/src/cursos/cursos.service.ts`:
   - Quitada la línea `.cache(\`curso_\${id}_detalle\`, 60000)` del query builder

### Verificación SQL

```sql
-- 875 relaciones en curso_ambiente
SELECT COUNT(*) FROM curso_ambiente;

-- Cursos de la sesión de prueba ahora tienen ambientes:
-- 1939 (INTRODUCCION A LA INGENIERIA DE SISTEMAS): 6 AULAs + 1 TALLER
-- 2347 (INTRODUCCION A LA PROGRAMACION): 5 LABs
-- 1863 (INTRODUCCION AL ANALISIS MATEMATICO): 6 AULAs + 1 TALLER
-- 1867 (ESTADISTICA GENERAL): 6 AULAs + 1 TALLER
```

### Para futuras re-seeds

El `npm run seed` ya incluye `asignarAmbientesPorDefecto`, por lo que una re-seed completa también asignará ambientes automáticamente.
