# CLAUDE.md — Horarios UNT

> **Last updated:** 2026-07-13

## Progress Summary

### Done
- **Seed creation** — All 11 scenarios create correctly
- **API validation complete** — All 11 scenarios pass (AL-01 through AL-11) via API
- **Confirmed scenarios**: docente conflict, ambiente conflict, aforo insuficiente, no-lectiva conflict, PENDIENTE blocked, RECHAZADO blocked, horas excedidas
- **Button fixes** — HTML/TS/backend CONFIRMADO check all fixed
- **Pendientes endpoint fix** — Manual property mapping instead of spread, returns horariosCount
- **Entity serialization fix** — TypeORM entities don't spread correctly — must use manual property mapping
- **Period ID discovery** — Seed cleanup/recreate shifted E2E period from id=4 to id=5
- **Horarios/periodo endpoint** — Returns `asignacion_lectiva` relation with `nro_alumnos` correctly
- **API returns ALL 3 states** — Filter updated from `[PENDIENTE, CONFIRMADO]` to `[PENDIENTE, CONFIRMADO, RECHAZADO]` in `getAsignacionesPendientes()` and `getAsignacionesConHorarios()` in `horarios.service.ts`
- **D2 no-lectiva blocks** — Lunes/Miércoles 14-16h (Investigación), Viernes 10-12h (Investigación), Martes/Jueves 8-10h (Extensión)
- **AL-04 scheduling constraint** — Can only be scheduled on Jueves 07-09 (outside all no-lectiva blocks)
- **FASE 4 — UI validation complete** — All 11 scenarios visible and behaving correctly in UI
- **Period selector (mat-select)** — Added to header, auto-selects E2E_2026-I (id=5)
- **Estado chip** — CONFIRMADO/PENDIENTE/RECHAZADO chip on each course card
- **Progress bar** — Xh / Yh showing hours programmed vs assigned
- **Disabled visual state** — PENDIENTE/RECHAZADO cards get opacity, dashed border
- **Detail panel logic** — "Asignar Horario" enabled for CONFIRMADO, disabled with label "Bloqueado (PENDIENTE)" or "Bloqueado (RECHAZADO)" otherwise
- **Warning banners** — PENDIENTE: "Debe ser confirmada antes de programar horarios." / RECHAZADO: "Esta asignación fue RECHAZADA. No es posible programar horarios."
- **Calendar blocks** — 5 blocks correctly positioned
- **KPIs (updated):**
  - **Pendientes (3):** CONFIRMADO sin horarios — listas para programar
  - **Programadas (5):** CONFIRMADO con al menos 1 horario
  - **Bloqueadas (3):** PENDIENTE (esperando confirmación) + RECHAZADO (bloqueado permanentemente)
  - **Conflictos (0):** superposiciones detectadas
- **Card count:**
  - Total visible: 11 (all states)
  - Confirmadas (programables): 8
  - Bloqueadas (no programables): 3 (2 PENDIENTE + 1 RECHAZADO)

**Files modified in FASE 4:**
- `frontend/src/app/modules/horarios/carga-lectiva/carga-lectiva.component.ts` — Added horariosCount to interface, period selector, cambiarPeriodo(), getEstadoChip(), horasProgramadas(), puedeProgramar(), getProgresoBarWidth(), getProgresoLabel()
- `frontend/src/app/modules/horarios/carga-lectiva/carga-lectiva.component.html` — Period selector (mat-select), estado chips, progress bars, disabled card classes, detail panel banners
- `frontend/src/app/modules/horarios/carga-lectiva/carga-lectiva.component.scss` — Styles for period selector, estado chips, progress bars, disabled states, detail banners

**UI EVIDENCE (all 11 scenarios verified):**

| # | Curso | Estado | Card | Progreso | Botón | Banner |
|---|-------|--------|------|----------|-------|--------|
| AL-01 | E2E_CS | CONFIRMADO | Verde, sin bloqueo | 3h/3.0h "Programado" | Habilitado | — |
| AL-02 | E2E_CM | CONFIRMADO | Verde, sin bloqueo | 0h/2.0h "Pendiente" | Habilitado | — |
| AL-03 | E2E_CM | PENDIENTE | Naranja, is-bloqueado, borde punteado | — "Pendiente" | Deshabilitado "Bloqueado (PENDIENTE)" | "Debe ser confirmada antes de programar" |
| AL-04 | E2E_CL | CONFIRMADO | Verde | 0h/2.0h | Habilitado | — |
| AL-05 | E2E_CD | CONFIRMADO | Verde | 1h/3.0h "Programado" | Habilitado | — |
| AL-06 | E2E_C2G | CONFIRMADO | Verde | 3h/3.0h "Programado" | Habilitado | — |
| AL-07 | E2E_C3A | CONFIRMADO | Verde | 3h/3.0h "Programado" | Habilitado | — |
| AL-08 | E2E_CD | CONFIRMADO | Verde | 0h/2.0h "Pendiente" | Habilitado | — |
| AL-09 | E2E_CA | CONFIRMADO | Verde | 2h/2.0h "Programado" | Habilitado | — |
| AL-10 | E2E_CS | RECHAZADO | Rojo, is-bloqueado, is-rechazado, borde punteado | — "Pendiente" | Deshabilitado "Bloqueado (RECHAZADO)" | "Esta asignación fue RECHAZADA. No es posible programar horarios." |
| AL-11 | E2E_CS | PENDIENTE | Naranja, is-bloqueado | — "Pendiente" | Deshabilitado "Bloqueado (PENDIENTE)" | "Debe ser confirmada antes de programar" |

**Design decision (user-approved):**
- La vista muestra asignaciones CONFIRMADO + PENDIENTE + RECHAZADO
- CONFIRMADO = programable (botón habilitado)
- PENDIENTE/RECHAZADO = bloqueadas visualmente (borde punteado, opacidad reducida, banner explicativo)
- Las bloqueadas sirven como referencia para que la Secretaria entienda por qué no puede actuar

## Database (E2E)
- **Period ID:** `periodo_id=5` (NOT 4) — seed cleanup/recreate shifted E2E period from id=4 to id=5. Use `periodo_id=5` for all test commands.
- **Ambiente IDs:**
  - `E2E_AULA-GRANDE` = 21
  - `E2E_AULA-PEQUENA` = 22
  - `E2E_LAB-1` = 23
  - `E2E_AULA-AFORO-INSUF` = 24

---

## Quick Reference

### Seed
```bash
docker compose exec backend npm run seed
```

### Test Commands
> Use `periodo_id=5` for all E2E test commands.

### Entity Serialization Note
TypeORM `...asignacion` spread doesn't serialize — must map each property manually when returning data to the frontend.
