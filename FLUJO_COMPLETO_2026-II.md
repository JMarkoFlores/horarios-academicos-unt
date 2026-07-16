# Flujo Completo — Construcción de Horarios 2026-II (UI)

Guía paso a paso para construir los horarios del ciclo **2026-II** usando solo la interfaz web.  
Marca cada casilla `[ ]` como `[x]` al completar el paso.

> **Acceso:** `http://localhost:8080`  
> **Admin:** admin@unt.edu.pe / `Admin123!`  
> Al primer login te pedirá cambiar contraseña — cámbiala y luego vuelve a entrar.

---

## ⬜ Fase 0 — Seed y Periodo

### 0.1 Cargar datos base

- [x] Ejecutar en terminal:
  ```powershell
  docker compose up -d --build
  docker compose exec backend npm run seed
  ```

Esto crea facultades, escuelas, departamentos, usuarios, docentes demo, ambientes, cursos, plan de estudios, horarios de ejemplo y declaraciones.

### 0.2 Crear Periodo 2026-II

- [x] Ir a **Configuración** → **Períodos** (sidebar, grupo Sistema)
- [x] Click **"Agregar Período"**
- [x] Llenar:

| Campo | Valor |
|-------|-------|
| Código | `2026-II` |
| Nombre | `Semestre 2026-II` |
| Fecha Inicio | `17/08/2026` |
| Fecha Fin | `18/12/2026` |
| Estado | `PLANIFICACION` |
| Activo | ✅ |

- [x] Guardar
- [x] *(Opcional)* Editar el periodo y marcar "Activo" si quieres que sea el periodo por defecto

---

## ⬜ Fase 1 — Docentes

El seed ya creó 26+ docentes. Puedes usarlos directamente o crear nuevos.

### Crear un docente nuevo (opcional)

- [x] Ir a **Académico** → **Docentes**
- [x] Click **"Nuevo Docente"**
- [x] Llenar:

| Campo | Ejemplo |
|-------|---------|
| Código | `DOC027` |
| DNI | `87654321` |
| Nombres | `Juan Carlos` |
| Apellidos | `Mendoza López` |
| Email | `jmendoza@unt.edu.pe` |
| Categoría | `ASOCIADO` |
| Tipo Contrato | `NOMBRADO` |
| Tipo Docente | `ORDINARIO` |
| Modalidad | `TIEMPO_COMPLETO_40` |

- [x] Guardar

### Docentes del seed (ya existen)

| # | Email | Nombres |
|---|-------|---------|
| 1 | docente1@unt.edu.pe | Marcelino |
| 2 | docente2@unt.edu.pe | Rosa María |
| 3 | docente3@unt.edu.pe | Carlos Alberto |
| ... | docente26@unt.edu.pe | ... |

---

## ⬜ Fase 2 — Ambientes

- [x] Ir a **Académico** → **Ambientes**
- [x] Click **"Nuevo Ambiente"**
- [x] Llenar (repetir para cada ambiente):

| Campo | Ejemplo 1 | Ejemplo 2 |
|-------|-----------|-----------|
| Código | `A-101` | `LAB-01` |
| Nombre | `Aula 101` | `Lab. Cómputo 1` |
| Tipo | `AULA` | `SALA_COMPUTACION` |
| Capacidad | `40` | `30` |
| Pabellón | `A` | `B` |
| Estado | `ACTIVO` | `ACTIVO` |

- [x] Guardar cada uno

---

## ⬜ Fase 3 — Cursos

- [ ] Ir a **Académico** → **Cursos**
- [ ] Click **"Nuevo Curso"**
- [ ] Llenar (repetir para cada curso):

| Campo | Ejemplo 1 | Ejemplo 2 | Ejemplo 3 |
|-------|-----------|-----------|-----------|
| Código | `MAT101` | `FIS101` | `PROG101` |
| Nombre | `Matemática Básica` | `Física General` | `Programación I` |
| Créditos | `4` | `5` | `4` |
| Horas Teoría | `3` | `4` | `2` |
| Horas Práctica | `2` | `2` | `2` |
| Ciclo | `1` | `1` | `1` |

- [ ] En la pestaña **"Ambientes"** del curso, asignar ambientes disponibles
- [ ] Guardar cada uno

---

## ⬜ Fase 4 — Plan de Estudios

- [ ] Ir a **Académico** → **Plan de Estudios**
- [ ] Verificar que "Plan de Estudios 2018" existe (creado por el seed)

### Crear nuevo plan (opcional)

- [ ] Click **"Nuevo Plan"**
- [ ] Llenar:

| Campo | Valor |
|-------|-------|
| Nombre | `Plan 2026-II` |
| Año | `2026` |
| Resolución | `R.R. N° 001-2026-UNT` |
| Activo | ✅ |

- [ ] Guardar

### Agregar cursos al plan

- [ ] Dentro del plan, click **"Agregar Curso"**
- [ ] Seleccionar curso y llenar:

| Campo | Ejemplo |
|-------|---------|
| Ciclo | `1` |
| Tipo | `OBLIGATORIO_GENERAL` |
| Horas Teoría | `3` |
| Horas Práctica | `2` |
| Horas Laboratorio | `0` |
| Estado | `ACTIVO` |

- [ ] Repetir para cada curso del plan
- [ ] Guardar

---

## ⬜ Fase 5 — Oferta Académica

- [ ] Ir a **Académico** → **Oferta Académica**
- [ ] Click **"Generar Oferta"**
- [ ] Seleccionar:
  - **Período:** `2026-II`
  - **Plan de Estudios:** el que creaste
- [ ] Click **"Generar"**
- [ ] Verificar que aparecen los cursos ofertados

---

## ⬜ Fase 6 — Asignación Lectiva

Asignar qué docente dictará cada curso.

- [ ] Ir a **Académico** → **Asignación Lectiva**
- [ ] Click **"Nueva Asignación"**
- [ ] Llenar (repetir para cada asignación):

| Campo | Ejemplo 1 | Ejemplo 2 |
|-------|-----------|-----------|
| Docente | `Juan Carlos Mendoza` | `Rosa María García` |
| Curso | `MAT101 - Matemática Básica` | `FIS101 - Física General` |
| Período | `2026-II` | `2026-II` |
| Tipo Clase | `TEORIA` | `TEORIA` |
| Sección | `A` | `A` |
| N° Alumnos | `35` | `30` |
| Horas Asignadas | `3` | `4` |

- [ ] Guardar (queda en estado `PENDIENTE`)
- [ ] **Confirmar** o **Rechazar** desde la lista

---

## ⬜ Fase 7 — Disponibilidad Docente

Necesitas login como **docente** o **admin/coordinador** puede declarar por ellos.

- [ ] Ir a **Académico** → **Disponibilidad**
- [ ] Seleccionar docente y período `2026-II`
- [ ] Click en las celdas de la grilla semanal (LU-SA, 07:00-22:00)

### Datos de ejemplo

| Docente | Lunes | Martes | Miércoles | Jueves | Viernes |
|---------|-------|--------|-----------|--------|---------|
| Juan Mendoza | 08-12, 14-18 | — | 08-12 | — | 08-12 |
| Rosa García | 10-14 | 08-12 | — | 14-18 | — |
| Carlos Ruiz | 14-20 | 14-18 | — | — | 08-12 |
| María Flores | 08-10 | 10-14 | 08-10 | 10-12 | 14-18 |

- [ ] Click **"Guardar Disponibilidad"**
- [ ] Repetir para cada docente

---

## ⬜ Fase 8 — Horarios

### 8.1 Ver modo de asignación

- [ ] Ir a **Configuración** → **Períodos**
- [ ] Editar `2026-II`
- [ ] Verificar `Modo Asignación` = `AUTOMATICA` o `MIXTA`

### 8.2 Generación automática

- [ ] Ir a **Operaciones** → **Horarios**
- [ ] Click **"Generar Horarios"**
- [ ] Seleccionar período `2026-II`
- [ ] Click **"Generar"**

### 8.3 Ver grilla

- [ ] Seleccionar un docente en el selector
- [ ] Ver los horarios generados en la grilla semanal

### 8.4 Conflictos

- [ ] Click **"Ver Conflictos"**
- [ ] Revisar si hay conflictos listados

### 8.5 Asignación manual

- [ ] Click **"Asignar Horario"**
- [ ] Llenar:

| Campo | Ejemplo |
|-------|---------|
| Docente | `Juan Mendoza` |
| Curso | `MAT101 - Matemática Básica` |
| Ambiente | `A-101` |
| Día | `Lunes` |
| Hora Inicio | `08:00` |
| Hora Fin | `10:00` |
| Tipo Clase | `TEORIA` |

- [ ] Click **"Verificar Ocupación"**
- [ ] Si no hay conflicto, click **"Asignar"**

### 8.6 Publicar horarios

- [ ] Click **"Publicar Horarios"**
- [ ] Confirmar

### 8.7 Exportar

- [ ] Click **"Exportar PDF"** (se descarga el archivo)
- [ ] Click **"Exportar Excel"** (se descarga el archivo)

---

## ⬜ Fase 9 — Ver Horarios (Docente)

- [ ] Cerrar sesión
- [ ] Login como **docente** (`docente1@unt.edu.pe` / Admin123!)
- [ ] Ir a **"Mis Horarios"**
- [ ] Verificar:
  - Header con avatar, nombre, período
  - Stats: horas totales, bloques, días
  - Cards de cursos asignados
  - Grilla semanal con colores por curso
  - Badges [TEO]/[LAB]/[PRA]
- [ ] Probar **Exportar Excel**
- [ ] Probar **Exportar PDF**
- [ ] Probar **Exportar iCalendar**

---

## ⬜ Fase 10 — Declaraciones de Carga (5 estados)

Flujo: **BORRADOR** → **ENVIADO** → **VALIDADO_DPTO** → **APROBADO_FACULTAD** → **CERRADO**

### 10.1 Crear declaración (como docente)

- [ ] Login como `docente1@unt.edu.pe`
- [ ] Ir a **Declaraciones** → **Declaraciones**
- [ ] Click **"Nueva Declaración"**
- [ ] Seleccionar período `2026-II`
- [ ] Llenar horas lectivas y no lectivas
- [ ] Click **"Guardar Borrador"** → estado `BORRADOR`

### 10.2 Enviar declaración

- [ ] Desde la lista, click **"Enviar"** → pasa a `ENVIADO`

### 10.3 Validar departamento

- [ ] Login como `admin@unt.edu.pe`
- [ ] Ir a **Declaraciones**
- [ ] Click **"Validar Departamento"** → pasa a `VALIDADO_DPTO`

### 10.4 Aprobar facultad

- [ ] Click **"Aprobar Facultad"** → pasa a `APROBADO_FACULTAD`

### 10.5 Cerrar

- [ ] Click **"Cerrar"** → pasa a `CERRADO`

---

## ⬜ Fase 11 — Dashboard

- [ ] Ir a **Dashboard**
- [ ] Ver KPIs: docentes, cursos, ambientes, ocupación
- [ ] Ir al tab **"Carga Académica"**
- [ ] Verificar KPIs de carga: total, promedio, cumplimiento, sin declarar
- [ ] Ver **Distribución por Categoría** (gráfico de barras)
- [ ] Ver **Top Docentes** por carga
- [ ] Ver **Declaraciones por Estado** (embudo)
- [ ] Ver **Carga por Departamento**
- [ ] Ver **Avance de Declaraciones** (línea)
- [ ] Ver **Docentes por Modalidad** (donut)

---

## ⬜ Fase 12 — Reportes

- [ ] Ir a **Reportes** → **Reportes**
- [ ] Probar **Entidad** → PDF de ambiente
- [ ] Probar **Entidad** → PDF de horario por día
- [ ] Probar **Entidad** → PDF de cursos
- [ ] Probar **CAD** → Reporte de carga por docente
- [ ] Probar **Gestión** → Reporte ejecutivo
- [ ] Probar **Gestión** → Reporte de cumplimiento
- [ ] Probar **Gestión** → Reporte de gestión de carga

---

## ⬜ Fase 13 — Sistema de Ventanas

### 13.1 Crear Campaña

- [ ] Login como `admin@unt.edu.pe`
- [ ] Ir a **Ventanas** → **Ventanas de Atención**
- [ ] Click **"Nueva Campaña"**
- [ ] Llenar:

| Campo | Valor |
|-------|-------|
| Nombre | `Asignación 2026-II` |
| Período | `2026-II` |
| Fecha Inicio | `01/08/2026` |
| Fecha Fin | `15/08/2026` |

- [ ] Click **"Publicar"**

### 13.2 Crear ventanas para docentes

- [ ] Desde la campaña, click **"Agregar Ventana"**
- [ ] Seleccionar docente, fecha y hora
- [ ] Repetir para cada docente

### 13.3 Como docente (Mis Ventanas)

- [ ] Login como `docente1@unt.edu.pe`
- [ ] Ir a **Ventanas** → **Mis Ventanas**
- [ ] Verificar que aparecen tus ventanas
- [ ] *(Opcional)* Asignar/modificar horarios durante la ventana

---

## ⬜ Fase 14 — Auditoría

- [ ] Ir a **Sistema** → **Auditoría**
- [ ] Explorar tab **Horarios**
- [ ] Explorar tab **Carga Académica**
- [ ] Probar filtros: período, usuario, acción, entidad, fechas
- [ ] Click en una fila para ver el diff JSON

---

## ⬜ Fase 15 — Chatbot IA

- [ ] Click en botón flotante `smart_toy` (esquina inferior derecha)
- [ ] Probar: *"¿Qué aulas están libres el lunes de 14:00 a 16:00?"*
- [ ] Probar: *"¿Cuál es el horario del docente Marcelino Torres?"*
- [ ] Probar: *"Muéstrame la disponibilidad del docente Rosa María García"*
- [ ] Probar: *"¿Hay conflictos en el Aula A-101 el miércoles?"*
- [ ] Probar: *"¿Qué cursos tiene asignados el docente Carlos Ruiz?"*
- [ ] Probar atajo **Ctrl+K** para abrir/cerrar

---

## ⬜ Fase 16 — Carga Lectiva (con IA)

- [ ] Ir a **Operaciones** → **Carga Lectiva**
- [ ] Seleccionar período `2026-II`
- [ ] Seleccionar un docente
- [ ] Verificar bloques de disponibilidad fusionados (ej: "Lun 08:00-12:00 (4h)")
- [ ] Verificar sugerencias de horario generadas
- [ ] Click en botón `smart_toy` (icono, sin texto)
- [ ] Confirmar que el chat se abre con la pregunta pre-cargada
- [ ] Revisar la respuesta de la IA

---

## Resumen de Rutas del Frontend

| Menú | Ruta | ¿Para qué? |
|------|------|------------|
| Dashboard | `/app/dashboard` | KPIs y gráficos |
| Académico → Docentes | `/app/docentes` | CRUD docentes |
| Académico → Cursos | `/app/cursos` | CRUD cursos |
| Académico → Ambientes | `/app/ambientes` | CRUD ambientes |
| Académico → Plan de Estudios | `/app/plan-estudios` | Plan curricular |
| Académico → Oferta Académica | `/app/oferta-academica` | Oferta del período |
| Académico → Asignación Lectiva | `/app/asignacion-lectiva` | Asignar docentes a cursos |
| Académico → Disponibilidad | `/app/disponibilidad` | Declarar disponibilidad |
| Operaciones → Horarios | `/app/horarios` | Grilla y asignación |
| Operaciones → Carga Lectiva | `/app/horarios/carga-lectiva` | Carga con IA |
| Mis Horarios | `/app/mis-horarios` | Docente ve su horario |
| Ventanas → Mis Ventanas | `/app/mis-ventanas` | Docente: ventanas |
| Ventanas → Ventanas de Atención | `/app/secretaria` | Admin: campañas |
| Declaraciones → Declaraciones | `/app/declaraciones` | Flujo de 5 estados |
| Reportes | `/app/reportes` | PDF/Excel |
| Sistema → Auditoría | `/app/auditoria` | Trazabilidad |
| Sistema → Períodos | `/app/periodos` | Gestión de periodos |
| Sistema → Configuración | `/app/configuracion` | Config general |

---

## Cuentas del Seed

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@unt.edu.pe | Admin123! |
| Director | director@unt.edu.pe | Admin123! |
| Coordinador | coordinador@unt.edu.pe | Admin123! |
| Operador | operador@unt.edu.pe | Admin123! |
| Docente 1-26 | docente1..26@unt.edu.pe | Admin123! |

> Todos tienen `debe_cambiar_password: true` al primer login.
