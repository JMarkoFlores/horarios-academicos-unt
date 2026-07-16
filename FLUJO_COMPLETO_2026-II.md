# Flujo Completo — Construcción de Horarios 2026-II (UI)

Guía paso a paso para construir los horarios del ciclo **2026-II** usando solo la interfaz web. Todos los datos de ejemplo están incluidos.

> **Acceso:** `http://localhost:8080`  
> **Admin:** admin@unt.edu.pe / `Admin123!`  
> Al primer login te pedirá cambiar contraseña — cámbiala y luego vuelve a entrar.

---

## Fase 0 — Seed y Periodo

### 0.1 Cargar datos base

```powershell
docker compose up -d --build
docker compose exec backend npm run seed
```

Esto crea facultades, escuelas, departamentos, usuarios, docentes demo, ambientes, cursos, plan de estudios, horarios de ejemplo y declaraciones.

### 0.2 Crear Periodo 2026-II

1. Ir a **Configuración** → **Períodos** (sidebar, grupo Sistema)
2. Click **"Agregar Período"**
3. Llenar:

| Campo | Valor |
|-------|-------|
| Código | `2026-II` |
| Nombre | `Semestre 2026-II` |
| Fecha Inicio | `17/08/2026` |
| Fecha Fin | `18/12/2026` |
| Estado | `PLANIFICACION` |
| Activo | ✅ |

4. Guardar

> El seed ya creó `2026-I` activo. Si quieres que `2026-II` sea el activo, edítalo y marca "Activo".

---

## Fase 1 — Docentes

Si el seed ya creó docentes (26+), puedes usarlos directamente. Para crear uno nuevo:

1. Ir a **Académico** → **Docentes**
2. Click **"Nuevo Docente"**
3. Llenar:

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
| Horas Lectivas Max | `22` |
| Horas Lectivas Min | `16` |

4. Guardar

**Docentes del seed que puedes usar (ya existen):**

| # | Email | Nombres |
|---|-------|---------|
| 1 | docente1@unt.edu.pe | Marcelino |
| 2 | docente2@unt.edu.pe | Rosa María |
| 3 | docente3@unt.edu.pe | Carlos Alberto |
| ... | docente26@unt.edu.pe | ... |

---

## Fase 2 — Ambientes

1. Ir a **Académico** → **Ambientes**
2. Click **"Nuevo Ambiente"**
3. Llenar:

| Campo | Ejemplo 1 | Ejemplo 2 |
|-------|-----------|-----------|
| Código | `A-101` | `LAB-01` |
| Nombre | `Aula 101` | `Lab. Cómputo 1` |
| Tipo | `AULA` | `SALA_COMPUTACION` |
| Capacidad | `40` | `30` |
| Pabellón | `A` | `B` |
| Estado | `ACTIVO` | `ACTIVO` |

4. Guardar

---

## Fase 3 — Cursos

1. Ir a **Académico** → **Cursos**
2. Click **"Nuevo Curso"**
3. Llenar:

| Campo | Ejemplo 1 | Ejemplo 2 | Ejemplo 3 |
|-------|-----------|-----------|-----------|
| Código | `MAT101` | `FIS101` | `PROG101` |
| Nombre | `Matemática Básica` | `Física General` | `Programación I` |
| Créditos | `4` | `5` | `4` |
| Horas Teoría | `3` | `4` | `2` |
| Horas Práctica | `2` | `2` | `2` |
| Ciclo | `1` | `1` | `1` |

4. En la pestaña **"Ambientes"** del curso, asignar ambientes disponibles
5. Guardar

---

## Fase 4 — Plan de Estudios

### 4.1 Ver plan existente

1. Ir a **Académico** → **Plan de Estudios**
2. Deberías ver "Plan de Estudios 2018" ya creado por el seed

### 4.2 Crear nuevo plan (opcional)

1. Click **"Nuevo Plan"**
2. Llenar:

| Campo | Valor |
|-------|-------|
| Nombre | `Plan 2026-II` |
| Año | `2026` |
| Resolución | `R.R. N° 001-2026-UNT` |
| Activo | ✅ |

### 4.3 Agregar cursos al plan

1. Dentro del plan, click **"Agregar Curso"**
2. Seleccionar un curso existente
3. Llenar:

| Campo | Ejemplo |
|-------|---------|
| Ciclo | `1` |
| Tipo | `OBLIGATORIO_GENERAL` |
| Horas Teoría | `3` |
| Horas Práctica | `2` |
| Horas Laboratorio | `0` |
| Estado | `ACTIVO` |

> Repite para cada curso que quieras incluir en el plan.

---

## Fase 5 — Oferta Académica

1. Ir a **Académico** → **Oferta Académica**
2. Click **"Generar Oferta"**
3. Seleccionar:
   - **Período:** `2026-II`
   - **Plan de Estudios:** el que creaste
4. Click **"Generar"**
5. Verás la lista de cursos ofertados para el período

---

## Fase 6 — Asignación Lectiva

Asignar qué docente dictará cada curso.

1. Ir a **Académico** → **Asignación Lectiva**
2. Click **"Nueva Asignación"**
3. Llenar:

| Campo | Ejemplo 1 | Ejemplo 2 |
|-------|-----------|-----------|
| Docente | `Juan Carlos Mendoza López` | `Rosa María García Torres` |
| Curso | `MAT101 - Matemática Básica` | `FIS101 - Física General` |
| Período | `2026-II` | `2026-II` |
| Tipo Clase | `TEORIA` | `TEORIA` |
| Sección | `A` | `A` |
| N° Alumnos | `35` | `30` |
| Horas Asignadas | `3` | `4` |

4. Guardar. La asignación queda en estado `PENDIENTE`.
5. Puedes **Confirmar** o **Rechazar** desde la lista.

---

## Fase 7 — Disponibilidad Docente

Cada docente declara su disponibilidad horaria.

> Necesitas login como **docente** o **admin/coordinador** puede declarar por ellos.

### 7.1 Como admin/coordinador:

1. Ir a **Académico** → **Disponibilidad**
2. Seleccionar docente y período `2026-II`
3. Verás la grilla semanal vacía (LU a SA, 07:00-22:00)
4. Click en las celdas para marcar disponibilidad

### 7.2 Datos de ejemplo para declarar:

| Docente | Lunes | Martes | Miércoles | Jueves | Viernes |
|---------|-------|--------|-----------|--------|---------|
| Juan Mendoza | 08-12, 14-18 | — | 08-12 | — | 08-12 |
| Rosa García | 10-14 | 08-12 | — | 14-18 | — |
| Carlos Ruiz | 14-20 | 14-18 | — | — | 08-12 |
| María Flores | 08-10 | 10-14 | 08-10 | 10-12 | 14-18 |

5. Click **"Guardar Disponibilidad"**

---

## Fase 8 — Horarios

### 8.1 Ver modo de asignación

1. Ir a **Configuración** → **Períodos**
2. Editar `2026-II`
3. Verificar que `Modo Asignación` sea `AUTOMATICA` o `MIXTA`

### 8.2 Generación automática

1. Ir a **Operaciones** → **Horarios**
2. Click **"Generar Horarios"**
3. Seleccionar período `2026-II`
4. Click **"Generar"**
5. El sistema asignará automáticamente basado en disponibilidad y ambientes

### 8.3 Ver grilla

1. En la misma página, seleccionar un docente
2. Verás los horarios generados en la grilla semanal

### 8.4 Conflictos

1. Click **"Ver Conflictos"**
2. Si hay conflictos, se mostrarán listados con tipo y sugerencia

### 8.5 Asignación manual

1. Click **"Asignar Horario"**
2. Llenar:

| Campo | Ejemplo |
|-------|---------|
| Docente | `Juan Mendoza` |
| Curso | `MAT101 - Matemática Básica` |
| Ambiente | `A-101` |
| Día | `Lunes` |
| Hora Inicio | `08:00` |
| Hora Fin | `10:00` |
| Tipo Clase | `TEORIA` |

3. Click **"Verificar Ocupación"** — si no hay conflicto, click **"Asignar"**

### 8.6 Publicar horarios

1. Click **"Publicar Horarios"**
2. Confirmar — los horarios pasan a estado `PUBLICADO`

### 8.7 Exportar

1. Click **"Exportar PDF"** o **"Exportar Excel"**
2. Se descargará el archivo

---

## Fase 9 — Ver Horarios (Docente)

1. Cerrar sesión y entrar como **docente** (docente1@unt.edu.pe / Admin123!)
2. Ir a **"Mis Horarios"**
3. Verás:
   - Header con avatar, nombre, período
   - Stats: horas totales, bloques, días
   - Cards de cursos asignados
   - Grilla semanal con colores por curso
   - Badges [TEO]/[LAB]/[PRA]
4. Botones para exportar: Excel, PDF, iCalendar

---

## Fase 10 — Declaraciones de Carga (5 estados)

Flujo: **BORRADOR** → **ENVIADO** → **VALIDADO_DPTO** → **APROBADO_FACULTAD** → **CERRADO**

### 10.1 Crear declaración (como docente)

1. Login como `docente1@unt.edu.pe`
2. Ir a **Declaraciones** → **Declaraciones**
3. Click **"Nueva Declaración"**
4. Seleccionar período `2026-II`
5. Llenar horas lectivas y no lectivas
6. Click **"Guardar Borrador"** (queda en BORRADOR)

### 10.2 Enviar declaración

1. Desde la lista, click **"Enviar"**
2. La declaración pasa a `ENVIADO`

### 10.3 Validar departamento

1. Login como `admin@unt.edu.pe`
2. Ir a **Declaraciones**
3. Verás las pendientes de departamento
4. Click **"Validar Departamento"** → pasa a `VALIDADO_DPTO`

### 10.4 Aprobar facultad

1. Click **"Aprobar Facultad"** → pasa a `APROBADO_FACULTAD`

### 10.5 Cerrar

1. Click **"Cerrar"** → pasa a `CERRADO`

---

## Fase 11 — Dashboard

1. Ir a **Dashboard**
2. Verás tarjetas con KPIs: docentes, cursos, ambientes, ocupación
3. En la sección **"Carga Académica"** (segundo tab):
   - KPIs de carga: total, promedio, cumplimiento, sin declarar
   - Gráfico **Distribución por Categoría** (barras)
   - **Top Docentes** por carga
   - **Declaraciones por Estado** (embudo)
   - **Carga por Departamento**
   - **Avance de Declaraciones** (línea)
   - **Docentes por Modalidad** (donut)

---

## Fase 12 — Reportes

1. Ir a **Reportes** → **Reportes**
2. Tres secciones:
   - **Entidad:** PDF de ambiente, horario por día, cursos
   - **CAD:** Reporte de carga por docente
   - **Gestión:** Reporte ejecutivo, cumplimiento, gestión de carga
3. Click en cualquier botón para descargar

---

## Fase 13 — Sistema de Ventanas

### 13.1 Crear Campaña

1. Login como `admin@unt.edu.pe`
2. Ir a **Ventanas** → **Ventanas de Atención**
3. Click **"Nueva Campaña"**
4. Llenar:

| Campo | Valor |
|-------|-------|
| Nombre | `Asignación 2026-II` |
| Período | `2026-II` |
| Fecha Inicio | `01/08/2026` |
| Fecha Fin | `15/08/2026` |

5. Click **"Publicar"** para activar

### 13.2 Crear ventanas para docentes

1. Desde la campaña, click **"Agregar Ventana"**
2. Seleccionar docente, fecha y hora

### 13.3 Como docente (Mis Ventanas)

1. Login como `docente1@unt.edu.pe`
2. Ir a **Ventanas** → **Mis Ventanas**
3. Verás tus ventanas asignadas
4. Durante tu ventana, puedes asignar/modificar tus horarios

---

## Fase 14 — Auditoría

1. Ir a **Sistema** → **Auditoría**
2. Dos tabs: **Horarios** y **Carga Académica**
3. Filtros: período, usuario, acción, entidad, fechas
4. Tabla con columnas: fecha, usuario, acción, entidad, valores anterior/nuevo
5. Click en una fila para ver el diff JSON

---

## Fase 15 — Chatbot IA

1. Click en el botón flotante `smart_toy` (esquina inferior derecha)
2. Probar consultas como:

   - *"¿Qué aulas están libres el lunes de 14:00 a 16:00?"*
   - *"¿Cuál es el horario del docente Marcelino Torres?"*
   - *"Muéstrame la disponibilidad del docente Rosa María García"*
   - *"¿Hay conflictos en el Aula A-101 el miércoles?"*
   - *"¿Qué cursos tiene asignados el docente Carlos Ruiz?"*

3. También funciona el atajo **Ctrl+K** para abrir/cerrar
4. En **Carga Lectiva** (Operaciones → Carga Lectiva), el botón `smart_toy` abre el chat con sugerencias de horario pre-cargadas

---

## Fase 16 — Carga Lectiva (con IA)

1. Ir a **Operaciones** → **Carga Lectiva**
2. Seleccionar período `2026-II` y un docente
3. Verás:
   - **Disponibilidad** del docente (bloques fusionados, ej: "Lun 08:00-12:00 (4h)")
   - **Sugerencias de horario** generadas
4. Click en el botón `smart_toy` (icono, sin texto) para pedir sugerencias a la IA
5. El chat se abre con la pregunta pre-cargada sobre el docente y curso seleccionados

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
