# IMPLEMENTACIÓN DEL ROL DOCENTE - ANÁLISIS PROFUNDO

## Objetivo
Este documento presenta un análisis profundo de las vistas del rol docente en el sistema de gestión de horarios académicos de la UNT, identificando errores, inconsistencias, mejoras y posibles fallos a nivel de backend, frontend, base de datos y seed.

## Asumciones
- El sistema utiliza Angular 17 en el frontend y NestJS 10 en el backend
- La base de datos es PostgreSQL 16
- El rol docente tiene acceso a módulos específicos para gestionar su carga académica, horarios y declaraciones
- El sistema implementa un flujo de aprobación de declaraciones con validación por departamento y facultad

## Alcance
Este análisis cubre las siguientes vistas y módulos del rol docente:
- Gestión de Docentes (CRUD básico)
- Asignación de Docente a Facultad/Departamento
- Horario del Docente (vista personal)
- Disponibilidad del Docente
- Declaración de Carga Lectiva y No Lectiva
- Verificación de Declaración (vista docente)
- Verificación de Aprobación (vista decano)

## Estrategia General de Implementación
El rol docente se implementa como un usuario con permisos específicos que le permiten:
1. Ver su horario personal
2. Gestionar su disponibilidad
3. Declarar su carga lectiva y no lectiva
4. Ver el estado de sus declaraciones
5. Subsanar observaciones realizadas por directores o decanos

## Priorización
Las vistas del rol docente están priorizadas según su criticidad:
1. **CRÍTICO**: Declaración de Carga (impacta pagos y legalidad)
2. **ALTO**: Horario personal y Disponibilidad (impacta asignación)
3. **MEDIO**: Asignación a facultad/departamento (administrativo)
4. **BAJO**: CRUD de docentes (solo administrativo)

---

# FASE 0: GESTIÓN BÁSICA DE DOCENTES

## Objetivo
Permitir la administración de la información básica de los docentes del sistema.

## Problema Solucionado
Centralizar la información de los docentes y permitir su gestión administrativa.

## Módulos/Componentes
- **Frontend**: `DocentesModule` (`docentes-list`, `docente-form`)
- **Backend**: `DocentesController`, `DocentesService`
- **Entity**: `Docente`

## Funcionalidades Específicas
- Listado paginado de docentes con filtros
- Creación de nuevos docentes
- Edición de datos de docentes
- Desactivación/Reactivación de docentes
- Exportación a Excel
- Visualización de carga horaria desequilibrada

## Entidades
- `Docente`: Entidad principal con relaciones a Usuario, Departamento, Facultad, Disponibilidad, Horarios, etc.

## Pantallas
1. **Lista de Docentes** (`/app/docentes`)
   - Tabla con datos del docente
   - Filtros por categoría, tipo, modalidad, estado
   - Búsqueda por nombre, código, email
   - Indicador de carga horaria
   - Acciones: editar, ver horario, desactivar/reactivar

2. **Formulario de Docente** (`/app/docentes/nuevo`, `/app/docentes/:id/editar`)
   - Campos: código, IBM, nombres, apellidos, email, teléfono
   - Tipo de docente (cascada a categoría y modalidad)
   - Categoría (según tipo)
   - Modalidad (según categoría)
   - Fecha de ingreso
   - Validaciones de email institucional y fecha no futura

## Validaciones
- Email único
- Código único
- IBM único (opcional)
- Email institucional válido
- Fecha de ingreso no futura
- Tipo de docente determina categoría disponible
- Categoría determina modalidad disponible

## Reglas de Negocio
- El tipo de docente ORDINARIO debe tener categoría (PRINCIPAL, ASOCIADO, AUXILIAR)
- El tipo de docente CONTRATADO o JEFE_PRACTICA_CONTRATADO debe tener categoría SIN_CATEGORIA
- La modalidad se habilita solo después de seleccionar categoría
- El email debe tener formato válido

## Endpoints
- `GET /docentes` - Listar docentes paginado
- `GET /docentes/:id` - Obtener un docente
- `POST /docentes` - Crear docente
- `PATCH /docentes/:id` - Actualizar docente
- `DELETE /docentes/:id` - Desactivar docente (soft delete)
- `PATCH /docentes/:id/reactivar` - Reactivar docente
- `GET /docentes/exportar` - Exportar docentes a Excel
- `GET /docentes/carga-desequilibrada` - Docentes con carga desequilibrada

## Dependencias
- `Usuario` (opcional, para login del docente)
- `Departamento` (asignación institucional)
- `Facultad` (asignación institucional)
- `ParametrosCarga` (validación de horas)

## Entregables
- CRUD completo de docentes
- Exportación a Excel con formato estandarizado
- Indicadores de carga horaria en listado

## Evidencia para el Docente
El docente no interactúa directamente con este módulo. Es administrativo.

## Riesgos/Errores Frecuentes

### Backend
1. **F1: Campo `dni` nullable pero requerido para F01-CAD/F02-CAD**
   - **Ubicación**: `docente.entity.ts:36`
   - **Problema**: El campo `dni` es nullable en la entidad pero es requerido para generar los formularios F01-CAD y F02-CAD
   - **Impacto**: Error al generar PDFs de declaración jurada
   - **Solución**: Hacer `dni` required o agregar validación en el servicio de generación de PDFs
   - **Estado**: Pendiente de corrección

2. **F2: Inconsistencia en tipo_contrato vs tipo_docente**
   - **Ubicación**: `docente.entity.ts:57-61`
   - **Problema**: Existen ambos campos pero `tipo_contrato` se deriva de `tipo_docente` en el servicio
   - **Impacto**: Posible confusión en la UI y datos inconsistentes
   - **Solución**: Eliminar `tipo_contrato` y usar solo `tipo_docente`, o documentar claramente la relación
   - **Estado**: Documentado en servicio pero no en entidad

3. **F3: Falta de validación de formato de IBM**
   - **Ubicación**: `docente-form.component.ts:96-98`
   - **Problema**: El frontend valida que IBM esté entre 1000 y 9999, pero no hay validación de backend
   - **Impacto**: Se pueden insertar datos inválidos mediante API directa
   - **Solución**: Agregar validación en DTO de backend
   - **Estado**: Solo validación frontend

### Frontend
4. **F4: Validador de email institucional incompleto**
   - **Ubicación**: `docente-form.component.ts:15-27`
   - **Problema**: El validador no verifica que el dominio sea @unt.edu.pe
   - **Impacto**: Se pueden registrar emails no institucionales
   - **Solución**: Agregar validación de dominio específico
   - **Estado**: Pendiente

5. **F5: Cascada de tipo_docente → categoría → modalidad confusa**
   - **Ubicación**: `docente-form.component.ts:118-146`
   - **Problema**: La lógica de habilitación/deshabilitación de campos no es intuitiva para el usuario
   - **Impacto**: Mala UX, posible selección incorrecta
   - **Solución**: Mejorar UX con mensajes explicativos y mejor feedback visual
   - **Estado**: Funcional pero mejorable

6. **F6: Carga desequilibrada calculada en frontend**
   - **Ubicación**: `docentes-list.component.ts:207-234`
   - **Problema**: La lógica de cálculo de carga está duplicada entre frontend y backend
   - **Impacto**: Posibles inconsistencias en los datos mostrados
   - **Solución**: Usar solo el endpoint del backend para cálculos
   - **Estado**: Duplicación de lógica

### Base de Datos
7. **F7: Índices faltantes en tabla docente**
   - **Ubicación**: `docente.entity.ts`
   - **Problema**: No hay índices en campos frecuentemente filtrados (categoria, tipo_docente, modalidad, activo)
   - **Impacto**: Bajo rendimiento en consultas con filtros
   - **Solución**: Agregar índices en estos campos
   - **Estado**: Sin índices

### Seed
8. **F8: DNIs no asignados en seed**
   - **Ubicación**: `seed.ts:590-791`
   - **Problema**: Los docentes creados en el seed no tienen DNI asignado
   - **Impacto**: Error al generar F01-CAD/F02-CAD en ambiente de prueba
   - **Solución**: Agregar DNIs a los datos de seed
   - **Estado**: Pendiente

## Criterios de Aceptación
- [x] CRUD de docentes funcional
- [x] Filtros de búsqueda funcionales
- [x] Exportación a Excel funcional
- [ ] Campo DNI requerido y validado
- [ ] Validación de IBM en backend
- [ ] Validación de email institucional con dominio @unt.edu.pe
- [ ] Índices en campos frecuentemente filtrados
- [ ] Seed con DNIs asignados

## Estado de Implementación / Hallazgos
- **Estado**: Implementado con errores menores
- **Hallazgos principales**:
  - Campo DNI nullable pero requerido para PDFs
  - Validación de IBM solo en frontend
  - Validador de email incompleto
  - Falta de índices en BD
  - Seed sin DNIs

---

# FASE 1: ASIGNACIÓN DE DOCENTE A FACULTAD/DEPARTAMENTO

## Objetivo
Permitir asignar docentes a facultades y departamentos para su organización institucional.

## Problema Solucionado
Los docentes necesitan estar vinculados a una facultad y departamento para el contexto académico y filtros por alcance.

## Módulos/Componentes
- **Frontend**: `DocenteFacultadModule` (`docente-facultad-list`, `docente-facultad-form`)
- **Backend**: `DocentesService.update()` (reutiliza endpoint existente)
- **Entity**: `Docente` (campos facultad_id, departamento_id)

## Funcionalidades Específicas
- Listado de docentes sin asignación
- Asignación de facultad y departamento
- Validación de consistencia (departamento pertenece a facultad)
- Filtro para ver solo docentes sin asignación

## Entidades
- `Docente`: campos `facultad_id`, `departamento_id`
- `Facultad`: entidad de referencia
- `Departamento`: entidad de referencia con relación a Escuela → Facultad

## Pantallas
1. **Lista de Docentes sin Asignación** (`/app/docente-facultad`)
   - Tabla con docentes que no tienen facultad o departamento
   - Filtro para ver solo sin asignación
   - Acción: asignar facultad/departamento
   - Acción: eliminar (desactivar)

2. **Formulario de Asignación** (`/app/docente-facultad/:id`)
   - Selector de facultad
   - Selector de departamento (cascada de facultad → escuela → departamento)
   - Validación de consistencia
   - Nombre del docente visible

## Validaciones
- Facultad requerida
- Departamento requerido
- Departamento debe pertenecer a la facultad seleccionada (o a la facultad de su escuela)

## Reglas de Negocio
- Un docente puede tener solo una facultad y un departamento
- El departamento seleccionado debe pertenecer a la facultad del docente
- Si se selecciona departamento, se infiere la facultad de su escuela
- Si se selecciona facultad y departamento, deben ser consistentes

## Endpoints
- `GET /docentes?sin_vinculacion=true` - Listar docentes sin asignación
- `PATCH /docentes/:id` - Actualizar facultad_id y departamento_id

## Dependencias
- `Facultad`
- `Escuela`
- `Departamento`

## Entregables
- Asignación de facultad/departamento a docentes
- Validación de consistencia institucional

## Evidencia para el Docente
El docente no interactúa directamente con este módulo. Es administrativo.

## Riesgos/Errores Frecuentes

### Backend
1. **F1: Validación de consistencia incompleta**
   - **Ubicación**: `docentes.service.ts:425-482`
   - **Problema**: La validación verifica que el departamento pertenezca a la facultad, pero no maneja el caso donde se selecciona departamento sin facultad
   - **Impacto**: Posible asignación inconsistente
   - **Solución**: Mejorar lógica para inferir facultad del departamento cuando no se selecciona facultad explícitamente
   - **Estado**: Implementado pero puede mejorarse

### Frontend
2. **F2: Cascada de departamentos compleja**
   - **Ubicación**: `docente-facultad-form.component.ts:94-137`
   - **Problema**: La carga de departamentos requiere múltiples llamadas anidadas (facultad → escuelas → departamentos)
   - **Impacto**: Bajo rendimiento, UX lenta
   - **Solución**: Crear endpoint en backend que retorne departamentos por facultad directamente
   - **Estado**: Múltiples llamadas anidadas

3. **F3: Mensaje de error genérico**
   - **Ubicación**: `docente-facultad-list.component.ts:93-123`
   - **Problema**: Al eliminar docente, el mensaje dice "eliminar" pero solo desactiva
   - **Impacto**: Confusión del usuario
   - **Solución**: Cambiar mensaje a "desactivar" para ser consistente con la acción real
   - **Estado**: Mensaje inconsistente

### Base de Datos
4. **F4: Sin restricción foreign key**
   - **Ubicación**: `docente.entity.ts:88-100`
   - **Problema**: No hay restricción foreign key en facultad_id y departamento_id
   - **Impacto**: Posible asignación de IDs inexistentes
   - **Solución**: Agregar restricciones foreign key
   - **Estado**: Sin restricciones

## Criterios de Aceptación
- [x] Asignación de facultad/departamento funcional
- [x] Validación de consistencia funcional
- [x] Filtro de docentes sin asignación funcional
- [ ] Endpoint optimizado para cargar departamentos por facultad
- [ ] Restricciones foreign key en BD
- [ ] Mensajes de error consistentes

## Estado de Implementación / Hallazgos
- **Estado**: Implementado con mejoras necesarias
- **Hallazgos principales**:
  - Cascada de departamentos lenta (múltiples llamadas)
  - Mensaje de "eliminar" cuando solo desactiva
  - Sin restricciones foreign key

---

# FASE 2: HORARIO PERSONAL DEL DOCENTE

## Objetivo
Permitir al docente visualizar su horario semanal asignado.

## Problema Solucionado
El docente necesita conocer sus horarios de clase para organizar su tiempo.

## Módulos/Componentes
- **Frontend**: `DocenteHorarioComponent`
- **Backend**: `HorariosController` (endpoint `/horarios/mis-horarios`)
- **Entity**: `HorarioAsignado`

## Funcionalidades Específicas
- Visualización de horario en grilla semanal
- Descarga de PDF del horario
- Descarga de Excel del horario
- Descarga de iCalendar (.ics) para sincronización
- Cálculo de total de horas asignadas
- Bloque de almuerzo configurable

## Entidades
- `HorarioAsignado`: asignaciones de horario al docente
- `Docente`: docente autenticado
- `TurnoHorario`: configuración de turnos
- `DiaActivo`: configuración de días activos

## Pantallas
1. **Horario Personal** (`/app/docente-horario`)
   - Grilla semanal (lunes a sábado, 7am a 9pm)
   - Celdas coloreadas por tipo de clase (teoría/laboratorio)
   - Bloque de almuerzo marcado
   - Información del docente visible
   - Total de horas asignadas
   - Botones de descarga (PDF, Excel, iCalendar)

## Validaciones
- El docente solo puede ver sus propios horarios
- El horario se filtra por período académico activo

## Reglas de Negocio
- El horario se muestra por período académico
- El bloque de almuerzo se configura en restricciones institucionales
- Los horarios se agrupan por tipo de clase con colores diferentes

## Endpoints
- `GET /horarios/mis-horarios?periodo=X` - Obtener horarios del docente autenticado
- `GET /reportes/mi-horario/pdf?periodo=X` - Descargar PDF
- `GET /reportes/mi-horario/excel?periodo=X` - Descargar Excel
- `GET /horarios/mis-horarios/ical?periodo=X` - Descargar iCalendar

## Dependencias
- `HorarioAsignado`
- `PeriodoAcademico`
- `RestriccionInstitucional` (para bloque de almuerzo)
- `DiasActivosService` (frontend)
- `PeriodoService` (frontend)

## Entregables
- Vista de horario personal
- Descargas en múltiples formatos
- Cálculo de horas totales

## Evidencia para el Docente
El docente puede ver su horario semanal, descargar en PDF/Excel/iCalendar, y conocer sus horas totales asignadas.

## Riesgos/Errores Frecuentes

### Backend
1. **F1: Endpoint no encontrado en código analizado**
   - **Ubicación**: No se encontró el endpoint `/horarios/mis-horarios` en el backend
   - **Problema**: El frontend llama a este endpoint pero no existe en el código analizado
   - **Impacto**: Error 404 al cargar horario personal
   - **Solución**: Implementar endpoint en backend o corregir ruta en frontend
   - **Estado**: Endpoint no encontrado

### Frontend
2. **F2: Cálculo de horas por rowspan incorrecto**
   - **Ubicación**: `docente-horario.component.ts:149-153`
   - **Problema**: El cálculo de rowspan usa solo la hora de fin, sin considerar minutos
   - **Impacto**: Horarios que no terminan en hora exacta (ej: 8:30-10:00) se muestran incorrectamente
   - **Solución**: Considerar minutos en el cálculo de rowspan
   - **Estado**: Solo considera horas

3. **F3: Normalización de hora inconsistente**
   - **Ubicación**: `docente-horario.component.ts:131-134`
   - **Problema**: La función `normalizeHora` solo trunca a 5 caracteres, no valida formato
   - **Impacto**: Horarios con formato incorrecto pueden romper la vista
   - **Solución**: Validar y normalizar formato de hora correctamente
   - **Estado**: Validación débil

4. **F4: No hay manejo de errores en descargas**
   - **Ubicación**: `docente-horario.component.ts:212-291`
   - **Problema**: Si falla la descarga, solo se muestra snackbar pero no se limpia el estado de carga
   - **Impacto**: Botón permanece en estado de carga indefinidamente
   - **Solución**: Asegurar limpieza de estado en error handler
   - **Estado**: Manejo básico

### Base de Datos
5. **F5: Sin índice en docente_id en horario_asignado**
   - **Ubicación**: `horario-asignado.entity.ts` (no analizado pero inferido)
   - **Problema**: Consultas de horarios por docente pueden ser lentas
   - **Impacto**: Bajo rendimiento en carga de horario personal
   - **Solución**: Agregar índice en docente_id y periodo
   - **Estado**: Sin índices específicos

## Criterios de Aceptación
- [ ] Endpoint `/horarios/mis-horarios` implementado en backend
- [x] Vista de grilla semanal funcional
- [x] Descargas en PDF/Excel/iCalendar funcionales
- [ ] Cálculo correcto de rowspan considerando minutos
- [ ] Validación robusta de formato de hora
- [ ] Índices en horario_asignado para consultas por docente

## Estado de Implementación / Hallazgos
- **Estado**: Frontend implementado pero backend incompleto
- **Hallazgos principales**:
  - Endpoint `/horarios/mis-horarios` no encontrado en backend
  - Cálculo de rowspan solo considera horas
  - Validación de hora débil
  - Falta de índices en BD

---

# FASE 3: DISPONIBILIDAD DEL DOCENTE

## Objetivo
Permitir al docente registrar su disponibilidad horaria para la asignación de cursos.

## Problema Solucionado
El sistema necesita conocer los horarios en los que el docente está disponible para asignar cursos.

## Módulos/Componentes
- **Frontend**: `DisponibilidadComponent`, `DisponibilidadService`
- **Backend**: `DisponibilidadController` (inferido)
- **Entity**: `DisponibilidadDocente`

## Funcionalidades Específicas
- Grilla interactiva para marcar disponibilidad
- Cálculo de horas disponibles
- Validación contra mínimo y máximo normativo
- Botón para marcar turno mañana automáticamente
- Filtro por período académico
- Vista diferente según rol (docente vs administrador)

## Entidades
- `DisponibilidadDocente`: slots de disponibilidad por día y hora
- `TurnoHorario`: configuración de turnos
- `DiaActivo`: configuración de días activos
- `ParametrosCarga`: parámetros de mínimo y máximo por modalidad

## Pantallas
1. **Disponibilidad** (`/app/disponibilidad`)
   - Selector de docente (solo para administradores)
   - Grilla de días vs turnos
   - Celdas clickeables para marcar disponibilidad
   - Indicador de horas disponibles
   - Indicador de mínimo/máximo normativo
   - Botón "Marcar mañana"
   - Botón "Limpiar selección"
   - Botón "Guardar"

## Validaciones
- No se puede superar el máximo normativo de horas
- El mínimo normativo es informativo (no bloquea)
- La disponibilidad se guarda por período académico

## Reglas de Negocio
- La disponibilidad es por período académico
- Los turnos se configuran globalmente
- Los días activos se configuran globalmente
- El mínimo y máximo normativo se configuran por modalidad, tipo de docente y categoría

## Endpoints
- `GET /disponibilidad/turnos` - Obtener turnos configurados
- `GET /disponibilidad/dias-activos` - Obtener días activos
- `GET /disponibilidad/parametros?periodo=X` - Obtener parámetros de carga
- `GET /disponibilidad/docentes` - Obtener lista de docentes (solo admin)
- `GET /disponibilidad/docentes/:id` - Obtener docente específico
- `GET /disponibilidad/docente/:id?periodo=X` - Obtener disponibilidad de docente
- `POST /disponibilidad/docente/:id` - Guardar disponibilidad de docente

## Dependencias
- `DisponibilidadDocente`
- `TurnoHorario`
- `DiaActivo`
- `ParametrosCarga`
- `PeriodoAcademico`

## Entregables
- Registro de disponibilidad horaria
- Validación contra parámetros normativos
- Vista diferenciada por rol

## Evidencia para el Docente
El docente puede marcar su disponibilidad horaria, ver sus horas disponibles, y validar contra mínimo/máximo normativo.

## Riesgos/Errores Frecuentes

### Frontend
1. **F1: Lógica de "turno mañana" frágil**
   - **Ubicación**: `disponibilidad.component.ts:189-210`
   - **Problema**: La función busca el string "manana" en el nombre del turno, sin normalización previa
   - **Impacto**: Si el nombre del turno es "Mañana" (con mayúscula) o "mañana" (con tilde), no funciona
   - **Solución**: Usar normalización de texto consistente
   - **Estado**: Búsqueda de string literal

2. **F2: Conversión de minutos a horas puede perder precisión**
   - **Ubicación**: `disponibilidad.component.ts:395-405`
   - **Problema**: La función `redondearHoras` usa `toFixed(2)` que puede perder precisión
   - **Impacto**: Cálculo de horas puede no ser exacto
   - **Solución**: Usar redondeo matemático en lugar de string formatting
   - **Estado**: Redondeo por string

3. **F3: No hay validación de superposición de horarios**
   - **Ubicación**: `disponibilidad.component.ts:165-187`
   - **Problema**: El docente puede marcar disponibilidad en horarios que se superponen
   - **Impacto**: Datos inconsistentes, posible conflicto en asignación
   - **Solución**: Agregar validación de no superposición
   - **Estado**: Sin validación

### Backend
4. **F4: Unique constraint demasiado estricto**
   - **Ubicación**: `disponibilidad-docente.entity.ts:13`
   - **Problema**: El unique constraint incluye `hora_inicio` pero no `hora_fin`, lo que permite superposiciones
   - **Impacto**: Se pueden crear slots que se superponen
   - **Solución**: Agregar validación de aplicación para evitar superposiciones
   - **Estado**: Constraint incompleto

### Base de Datos
5. **F5: Índices pueden mejorarse**
   - **Ubicación**: `disponibilidad-docente.entity.ts:14-16`
   - **Problema**: Hay índices pero falta uno compuesto por (docente, periodo, dia_semana) para consultas frecuentes
   - **Impacto**: Consultas pueden ser subóptimas
   - **Solución**: Agregar índice compuesto
   - **Estado**: Índices básicos

## Criterios de Aceptación
- [x] Grilla de disponibilidad funcional
- [x] Validación de máximo normativo
- [x] Cálculo de horas disponibles
- [ ] Lógica de "turno mañana" robusta
- [ ] Validación de no superposición
- [ ] Redondeo matemático de horas
- [ ] Índice compuesto optimizado

## Estado de Implementación / Hallazgos
- **Estado**: Implementado con mejoras necesarias
- **Hallazgos principales**:
  - Búsqueda de "turno mañana" frágil
  - Redondeo por string formatting
  - Sin validación de superposición
  - Unique constraint incompleto

---

# FASE 4: DECLARACIÓN DE CARGA LECTIVA Y NO LECTIVA

## Objetivo
Permitir al docente declarar su carga lectiva (cursos asignados) y no lectiva (otras actividades académicas).

## Problema Solucionado
La universidad requiere un registro formal de la carga académica de cada docente para pagos y control administrativo.

## Módulos/Componentes
- **Frontend**: `DeclaracionesComponent`, `VerificarDeclaracionComponent`
- **Backend**: `DeclaracionesController`, `DeclaracionesService`
- **Entity**: `DeclaracionCargaHoraria`, `DeclaracionObservacion`

## Funcionalidades Específicas
- Visualización de cursos lectivos asignados
- Registro de actividades no lectivas (10 rubros)
- Asignación de horarios a actividades no lectivas
- Cálculo automático de horas desde horarios
- Validación de límite de preparación (50% de carga lectiva)
- Auto-save cada 10 segundos
- Validación de detalle mínimo (10 caracteres)
- Validación de horario obligatorio para actividades con horas
- Flujo de envío, observación, subsanación, validación, aprobación

## Entidades
- `DeclaracionCargaHoraria`: entidad principal de declaración
- `DeclaracionObservacion`: observaciones a la declaración
- `Curso`: cursos lectivos
- `HorarioAsignado`: horarios de cursos
- `CargaAdicional`: carga adicional (si aplica)

## Pantallas
1. **Lista de Declaraciones** (`/app/declaraciones`)
   - Selector de docente (solo para administradores)
   - Stepper de estados (Borrador → Enviado → Departamento → Facultad → Cerrado)
   - Información del docente seleccionado
   - Botón para ver/editar declaración

2. **Verificar/Editar Declaración** (`/app/declaraciones/verificar-declaracion/:id`)
   - Información del docente y período
   - Sección de carga lectiva (cursos asignados)
   - Sección de carga no lectiva (10 rubros)
   - Para cada rubro: detalle, horas, horarios
   - Gauge de cumplimiento de horas normativas
   - Indicador de progreso de rubros completados
   - Botón guardar manual
   - Indicador de auto-save
   - Botón enviar
   - Botón subsanar (si está observado)
   - Sección de observaciones
   - Sección de declaración jurada

## Validaciones
- El detalle debe tener al menos 10 caracteres si hay horas
- Si hay horas, debe haber horario asignado
- La preparación no puede exceder el 50% de la carga lectiva
- El total de horas debe coincidir con el mínimo normativo (informativo)
- Validación de conflictos horarios internos
- Validación de conflictos con carga lectiva

## Reglas de Negocio
- La declaración es por período académico
- Los cursos lectivos se asignan previamente (no se editan aquí)
- Las actividades no lectivas se declaran en 10 rubros específicos
- La preparación tiene un límite del 50% de la carga lectiva
- El flujo de aprobación es: Borrador → Enviado → Validado Dpto → Aprobado Facultad → Cerrado
- Se puede observar en Validado Dpto y Aprobado Facultad
- El docente puede subsanar cuando está observado

## Endpoints
- `GET /declaraciones/docentes` - Listar docentes con declaraciones
- `GET /declaraciones/docentes/:id` - Obtener docente específico
- `GET /declaraciones/docentes/:id/declaracion?periodo=X` - Obtener declaración de docente
- `GET /declaraciones/docentes/:id/cursos?periodo=X` - Obtener cursos asignados
- `POST /declaraciones/guardar` - Guardar declaración (auto-save o manual)
- `POST /declaraciones/docentes/:id/enviar` - Enviar declaración
- `PATCH /declaraciones/:id/enviar` - Enviar declaración (alternativo)
- `PATCH /declaraciones/:id/subsanar` - Subsanar declaración
- `GET /declaraciones/:id/observaciones` - Obtener observaciones
- `PATCH /declaraciones/:id/observar` - Observar declaración (director/decano)
- `PATCH /declaraciones/:id/aprobar` - Aprobar declaración (decano)

## Dependencias
- `DeclaracionCargaHoraria`
- `DeclaracionObservacion`
- `Curso`
- `HorarioAsignado`
- `CargaAdicional`
- `PeriodoAcademico`
- `Docente`

## Entregables
- Declaración de carga lectiva y no lectiva
- Flujo de aprobación completo
- Auto-save de cambios
- Validaciones de negocio

## Evidencia para el Docente
El docente puede ver sus cursos asignados, declarar actividades no lectivas, asignar horarios, ver el estado de su declaración, y subsanar observaciones.

## Riesgos/Errores Frecuentes

### Frontend
1. **F1: Auto-save puede perder datos si hay error de red**
   - **Ubicación**: `verificar-declaracion.component.ts:187-190`
   - **Problema**: El auto-save no reintenta ni muestra error visible al usuario
   - **Impacto**: El docente puede perder cambios si hay error de red
   - **Solución**: Agregar reintentos y notificación de error de auto-save
   - **Estado**: Sin reintentos ni notificación

2. **F2: Validación de conflicto horario solo visual**
   - **Ubicación**: `verificar-declaracion.component.ts:548-578`
   - **Problema**: La validación de conflicto solo muestra tooltip pero no bloquea el guardado
   - **Impacto**: Se pueden guardar horarios con conflictos
   - **Solución**: Bloquear guardado si hay conflictos o agregar advertencia explícita
   - **Estado**: Solo advertencia visual

3. **F3: Cálculo de horas desde horarios puede ser incorrecto**
   - **Ubicación**: `verificar-declaracion.component.ts:462-470`
   - **Problema**: La función `calcularHorasDesdeHorarios` asume formato HH:MM pero no valida
   - **Impacto**: Horarios con formato incorrecto dan cálculos erróneos
   - **Solución**: Validar formato antes de calcular
   - **Estado**: Sin validación de formato

4. **F4: Parseo de horario string legacy frágil**
   - **Ubicación**: `verificar-declaracion.component.ts:401-421`
   - **Problema**: El parseo de horario en formato string usa regex complejo que puede fallar
   - **Impacto**: Horarios en formato legacy pueden no parsearse correctamente
   - **Solución**: Migrar todos los datos al nuevo formato o mejorar regex
   - **Estado**: Regex complejo

### Backend
5. **F5: No se encontró servicio de declaraciones**
   - **Ubicación**: No se encontró `DeclaracionesService` en el código analizado
   - **Problema**: Los endpoints llamados por el frontend no tienen implementación visible
   - **Impacto**: Error 404 o 500 en todas las operaciones de declaración
   - **Solución**: Implementar servicio completo de declaraciones
   - **Estado**: Servicio no encontrado

### Base de Datos
6. **F6: Sin índices en declaracion_carga_horaria**
   - **Ubicación**: `declaracion-carga-horaria.entity.ts` (no analizado pero inferido)
   - **Problema**: Consultas por docente y período pueden ser lentas
   - **Impacto**: Bajo rendimiento en carga de declaraciones
   - **Solución**: Agregar índices en (docente_id, periodo_academico)
   - **Estado**: Sin índices

## Criterios de Aceptación
- [ ] Servicio DeclaracionesService implementado en backend
- [x] Vista de cursos asignados funcional
- [x] Registro de actividades no lectivas funcional
- [x] Auto-save implementado
- [x] Validaciones de detalle y horario
- [x] Validación de límite de preparación
- [ ] Validación de conflicto horario bloqueante
- [ ] Reintentos en auto-save
- [ ] Índices en declaracion_carga_horaria

## Estado de Implementación / Hallazgos
- **Estado**: Frontend implementado pero backend incompleto
- **Hallazgos principales**:
  - Servicio DeclaracionesService no encontrado
  - Auto-save sin reintentos ni notificación de error
  - Validación de conflicto solo visual
  - Cálculo de horas sin validación de formato
  - Parseo de horario legacy frágil

---

# FASE 5: VERIFICACIÓN DE APROBACIÓN (VISTA DECANO)

## Objetivo
Permitir al decano (o admin) revisar y aprobar las declaraciones de carga horaria.

## Problema Solucionado
La universidad requiere un control final a nivel de facultad de las declaraciones de carga horaria.

## Módulos/Componentes
- **Frontend**: `VerificarAprobacionComponent`
- **Backend**: `DeclaracionesController` (reutiliza endpoints)
- **Entity**: `DeclaracionCargaHoraria`, `DeclaracionObservacion`

## Funcionalidades Específicas
- Visualización de la declaración completa
- Información del validador (director) y fecha de validación
- Lista de documentos para conferir (F01-CAD, F03-CAD, F02-CAD)
- Generación de PDFs de los documentos
- Botón aprobar
- Botón observar con texto de observación
- Toggle para mostrar/ocultar formulario de observación

## Entidades
- `DeclaracionCargaHoraria`: entidad principal
- `DeclaracionObservacion`: observaciones
- `Docente`: información del docente
- `Usuario`: usuario firmante

## Pantallas
1. **Verificar Aprobación** (`/app/declaraciones/verificar-aprobacion/:id`)
   - Información del docente
   - Estado de la declaración
   - Validador y fecha de validación
   - Cursos lectivos asignados
   - Actividades no lectivas
   - Tabla de documentos para conferir
   - Botones de acción (aprobar, observar)
   - Formulario de observación (condicional)

## Validaciones
- Solo se puede aprobar si está en estado VALIDADO_DPTO u OBSERVADO_FACULTAD
- La observación debe tener al menos 10 caracteres
- Solo decanos y administradores pueden acceder

## Reglas de Negocio
- El decano aprueba después de que el director validó
- Se puede observar para solicitar correcciones
- Los documentos se generan al conferir
- La observación regresa la declaración a estado OBSERVADO_FACULTAD

## Endpoints
- `GET /docentes/:id` - Obtener docente
- `GET /declaraciones/docentes/:id/declaracion?periodo=X` - Obtener declaración
- `GET /declaraciones/docentes/:id/cursos?periodo=X` - Obtener cursos
- `PATCH /declaraciones/:id/aprobar` - Aprobar declaración
- `PATCH /declaraciones/:id/observar` - Observar declaración
- `POST /declaraciones/docentes/:id/declaracion-jurada` - Generar declaración jurada
- `GET /reportes/f01-cad/:id/pdf?periodo=X` - Descargar F01-CAD
- `GET /reportes/docente/:id/f03-cad?periodo=X` - Descargar F03-CAD
- `GET /reportes/declaracion-jurada/:id/pdf?periodo=X` - Descargar F02-CAD

## Dependencias
- `DeclaracionCargaHoraria`
- `DeclaracionObservacion`
- `Docente`
- `ReportesService` (para PDFs)

## Entregables
- Vista de verificación de aprobación
- Generación de documentos F01-CAD, F02-CAD, F03-CAD
- Flujo de aprobación/observación

## Evidencia para el Docente
El docente no interactúa directamente con esta vista. Es para decanos/administradores.

## Riesgos/Errores Frecuentes

### Frontend
1. **F1: Duplicación de lógica de generación de PDF**
   - **Ubicación**: `verificar-aprobacion.component.ts:299-325`
   - **Problema**: La generación de declaración jurada hace dos llamadas (POST para generar, GET para descargar)
   - **Impacto**: Posible inconsistencia si la generación falla entre llamadas
   - **Solución**: Usar un solo endpoint que retorne el PDF directamente
   - **Estado**: Dos llamadas separadas

2. **F2: Manejo de error genérico**
   - **Ubicación**: `verificar-aprobacion.component.ts:345-349`
   - **Problema**: El error handler solo hace console.error, no muestra detalles al usuario
   - **Impacto**: El usuario no sabe qué salió mal
   - **Solución**: Mostrar mensaje de error específico del backend
   - **Estado**: Error genérico

3. **F3: Estado de documentos hardcoded**
   - **Ubicación**: `verificar-aprobacion.component.ts:76-95`
   - **Problema**: Los documentos tienen estado "Aprobado" hardcoded sin verificar el estado real
   - **Impacto**: Muestra información incorrecta
   - **Solución**: Obtener estado real del documento desde el backend
   - **Estado**: Estado hardcoded

### Backend
4. **F4: Endpoints de reportes no encontrados**
   - **Ubicación**: No se encontraron endpoints de reportes en el código analizado
   - **Problema**: Los PDFs no se pueden generar
   - **Impacto**: Funcionalidad completa de documentos no funciona
   - **Solución**: Implementar servicio de reportes
   - **Estado**: Endpoints no encontrados

## Criterios de Aceptación
- [ ] Servicio de reportes implementado
- [x] Vista de verificación funcional
- [x] Botones de aprobar/observar funcionales
- [ ] Generación de PDFs en un solo endpoint
- [ ] Manejo de errores específico
- [ ] Estado real de documentos

## Estado de Implementación / Hallazgos
- **Estado**: Frontend implementado pero backend incompleto
- **Hallazgos principales**:
  - Endpoints de reportes no encontrados
  - Duplicación de llamadas para generación de PDF
  - Manejo de error genérico
  - Estado de documentos hardcoded

---

# RESUMEN DE HALLAZGOS POR NIVEL

## Backend
1. ~~**Campo DNI nullable pero requerido para PDFs** (F1 Fase 0)~~ **CORREGIDO**
2. **Inconsistencia tipo_contrato vs tipo_docente** (F2 Fase 0)
3. ~~**Falta validación de IBM en backend** (F3 Fase 0)~~ **CORREGIDO** (ya estaba validado)
4. **Validación de consistencia incompleta en asignación** (F1 Fase 1)
5. ~~**Endpoint /horarios/mis-horarios no encontrado** (F1 Fase 2)~~ **CORREGIDO** (YA EXISTÍA)
6. ~~**Servicio DeclaracionesService no encontrado** (F5 Fase 4)~~ **CORREGIDO** (YA EXISTÍA como DeclaracionCargaHorariaService)
7. ~~**Endpoints de reportes no encontrados** (F4 Fase 5)~~ **CORREGIDO** (YA EXISTÍAN)

## Frontend
8. **Validador de email institucional incompleto** (F4 Fase 0)
9. **Cascada tipo_docente confusa** (F5 Fase 0)
10. **Carga desequilibrada duplicada** (F6 Fase 0)
11. **Cascada de departamentos lenta** (F2 Fase 1)
12. **Mensaje de "eliminar" inconsistente** (F3 Fase 1)
13. **Cálculo de rowspan solo horas** (F2 Fase 2)
14. **Normalización de hora débil** (F3 Fase 2)
15. **Manejo de errores en descargas básico** (F4 Fase 2)
16. **Lógica "turno mañana" frágil** (F1 Fase 3)
17. **Redondeo por string formatting** (F2 Fase 3)
18. **Sin validación de superposición** (F3 Fase 3)
19. **Auto-save sin reintentos** (F1 Fase 4)
20. **Validación conflicto solo visual** (F2 Fase 4)
21. **Cálculo horas sin validación** (F3 Fase 4)
22. **Parseo horario legacy frágil** (F4 Fase 4)
23. **Duplicación llamadas PDF** (F1 Fase 5)
24. **Manejo error genérico** (F2 Fase 5)
25. **Estado documentos hardcoded** (F3 Fase 5)

## Base de Datos
26. ~~**Índices faltantes en docente** (F7 Fase 0)~~ **CORREGIDO**
27. **Sin restricción foreign key** (F4 Fase 1)
28. **Sin índices en horario_asignado** (F5 Fase 2)
29. **Unique constraint incompleto** (F4 Fase 3)
30. **Índices pueden mejorarse en disponibilidad** (F5 Fase 3)
31. **Sin índices en declaracion_carga_horaria** (F6 Fase 4)

## Seed
32. ~~**DNIs no asignados en seed** (F8 Fase 0)~~ **CORREGIDO**

---

# CRONOGRAMA SUGERIDO DE CORRECCIONES

## Prioridad CRÍTICA (bloquea funcionalidad principal)
1. ~~Implementar servicio DeclaracionesService (F5 Fase 4)~~ **COMPLETADO** (YA EXISTÍA)
2. ~~Implementar endpoint /horarios/mis-horarios (F1 Fase 2)~~ **COMPLETADO** (YA EXISTÍA)
3. ~~Implementar servicio de reportes (F4 Fase 5)~~ **COMPLETADO** (YA EXISTÍA)
4. ~~Hacer DNI required en entity (F1 Fase 0)~~ **COMPLETADO**

## Prioridad ALTA (afecta UX o integridad de datos)
5. ~~Agregar DNIs a seed (F8 Fase 0)~~ **COMPLETADO**
6. ~~Validación de IBM en backend (F3 Fase 0)~~ **COMPLETADO** (ya estaba validado)
7. ~~Validador de email con dominio @unt.edu.pe (F4 Fase 0)~~ **COMPLETADO**
8. ~~Agregar índices en docente (F7 Fase 0)~~ **COMPLETADO**
9. Agregar restricciones foreign key (F4 Fase 1)
10. Optimizar cascada de departamentos (F2 Fase 1)
11. Corregir cálculo de rowspan (F2 Fase 2)
12. Agregar índices en horario_asignado (F5 Fase 2)
13. Validación de superposición (F3 Fase 3)
14. Reintentos en auto-save (F1 Fase 4)
15. Validación de conflicto bloqueante (F2 Fase 4)

## Prioridad MEDIA (mejoras de UX)
16. Mejorar cascada tipo_docente (F5 Fase 0)
17. Corregir mensaje "eliminar" (F3 Fase 1)
18. Mejorar normalización de hora (F3 Fase 2)
19. Mejorar lógica "turno mañana" (F1 Fase 3)
20. Redondeo matemático de horas (F2 Fase 3)
21. Validación de formato en cálculo horas (F3 Fase 4)
22. Unificar llamadas de PDF (F1 Fase 5)
23. Manejo de errores específico (F2 Fase 5)

## Prioridad BAJA (optimización)
24. Eliminar duplicación de carga desequilibrada (F6 Fase 0)
25. Documentar relación tipo_contrato/tipo_docente (F2 Fase 0)
26. Mejorar índices en disponibilidad (F5 Fase 3)
27. Agregar índices en declaracion_carga_horaria (F6 Fase 4)
28. Obtener estado real de documentos (F3 Fase 5)
29. Migrar horarios legacy a nuevo formato (F4 Fase 4)

---

# CHECKLIST FINAL DE IMPLEMENTACIÓN DEL ROL DOCENTE

## Backend
- [x] Campo DNI required en Docente entity
- [x] Validación de IBM en DTO
- [x] Validación de email con dominio @unt.edu.pe
- [ ] Documentación clara de tipo_contrato vs tipo_docente
- [ ] Validación mejorada de consistencia facultad/departamento
- [ ] Endpoint optimizado para departamentos por facultad
- [x] Endpoint /horarios/mis-horarios implementado (YA EXISTÍA)
- [x] Servicio DeclaracionesService implementado (YA EXISTÍA como DeclaracionCargaHorariaService)
- [x] Servicio de reportes implementado (YA EXISTÍA)
- [ ] Endpoint unificado para generación de PDFs

## Frontend
- [ ] Validador de email con dominio @unt.edu.pe
- [ ] Mejorar UX de cascada tipo_docente
- [ ] Eliminar duplicación de cálculo de carga desequilibrada
- [ ] Endpoint optimizado para departamentos
- [ ] Mensaje "desactivar" consistente
- [ ] Cálculo de rowspan con minutos
- [ ] Validación robusta de formato de hora
- [ ] Limpieza de estado en error de descarga
- [ ] Normalización robusta en "turno mañana"
- [ ] Redondeo matemático de horas
- [ ] Validación de no superposición
- [ ] Reintentos en auto-save
- [ ] Validación de conflicto bloqueante
- [ ] Validación de formato en cálculo de horas
- [ ] Manejo de errores específico en PDFs
- [ ] Estado real de documentos

## Base de Datos
- [x] Índices en docente (categoria, tipo_docente, modalidad, activo)
- [ ] Restricciones foreign key en facultad_id, departamento_id
- [ ] Índices en horario_asignado (docente_id, periodo)
- [ ] Validación de aplicación para superposición en disponibilidad
- [ ] Índice compuesto en disponibilidad (docente, periodo, dia)
- [ ] Índices en declaracion_carga_horaria (docente_id, periodo)

## Seed
- [x] DNIs asignados a todos los docentes

---

# PROBLEMAS CRÍTICOS DETECTADOS TRANSVERSALES

1. ~~**Servicios backend no implementados**: DeclaracionesService y ReportesService son críticos para la funcionalidad principal del rol docente pero no se encontraron en el código analizado.~~ **CORREGIDO**: Ambos servicios YA EXISTEN (DeclaracionCargaHorariaService y ReportesService).

2. ~~**Endpoint /horarios/mis-horarios faltante**: El frontend llama a este endpoint para mostrar el horario personal del docente, pero no existe en el backend.~~ **CORREGIDO**: El endpoint YA EXISTE en horarios.controller.ts (líneas 272-300).

3. ~~**Campo DNI nullable pero requerido**: El campo DNI es nullable en la entidad pero es obligatorio para generar los formularios F01-CAD y F02-CAD.~~ **CORREGIDO**: DNI ahora es required en Docente entity.

4. ~~**Validaciones solo en frontend**: IBM, email institucional, y otras validaciones críticas están solo en frontend, permitiendo bypass por API directa.~~ **CORREGIDO**: Validaciones de IBM y email @unt.edu.pe agregadas en backend DTO.

5. ~~**Falta de índices en BD**: Varias tablas críticas (docente, horario_asignado, disponibilidad_docente, declaracion_carga_horaria) no tienen índices en campos frecuentemente consultados.~~ **PARCIALMENTE CORREGIDO**: Índices agregados en docente entity. Pendientes: horario_asignado, disponibilidad_docente, declaracion_carga_horaria.

---

# RIESGOS GLOBALES DEL PROYECTO PARA EL ROL DOCENTE

1. **Riesgo de integridad de datos**: Falta de validaciones en backend y restricciones foreign key permite datos inconsistentes.

2. **Riesgo de rendimiento**: Falta de índices en BD puede causar degradación de rendimiento a medida que crece el volumen de datos.

3. **Riesgo de UX**: Validaciones solo visuales (conflictos horarios) permiten guardar datos incorrectos que causan problemas posteriores.

4. **Riesgo de pérdida de datos**: Auto-save sin reintentos ni notificación puede causar pérdida de cambios si hay errores de red.

5. **Riesgo de funcionalidad bloqueada**: Servicios backend no implementados (DeclaracionesService, ReportesService) bloquean funcionalidades críticas.

---

# RECOMENDACIONES FINALES

## Inmediatas (antes de producción)
1. Implementar DeclaracionesService con todos los endpoints requeridos
2. Implementar servicio de reportes para generación de PDFs
3. Implementar endpoint /horarios/mis-horarios
4. Hacer DNI required en Docente entity
5. Agregar DNIs al seed
6. Agregar validaciones de backend para IBM y email

## Corto plazo (1-2 semanas)
7. Agregar índices críticos en BD
8. Agregar restricciones foreign key
9. Implementar validación de superposición en disponibilidad
10. Mejorar auto-save con reintentos
11. Hacer validación de conflicto bloqueante

## Mediano plazo (1 mes)
12. Optimizar cascada de departamentos
13. Mejorar UX de cascada tipo_docente
14. Corregir cálculo de rowspan con minutos
15. Unificar llamadas de generación de PDFs
16. Migrar horarios legacy a nuevo formato

## Largo plazo (continuo)
17. Monitorear rendimiento de consultas
18. Agregar más índices según necesidad

---

# CORRECCIONES REALIZADAS (FECHA: 2026-06-21)

## Fase 0: Gestión Básica de Docentes - COMPLETADA

### Correcciones Implementadas:

1. **F1: Campo DNI required en Docente entity**
   - **Archivo**: `backend/src/entities/docente.entity.ts`
   - **Cambio**: Campo `dni` cambiado de nullable a required
   - **Línea**: 42-43
   - **Estado**: ✅ COMPLETADO

2. **F3: Validación de IBM en backend DTO**
   - **Archivo**: `backend/src/docentes/dto/create-docente.dto.ts`
   - **Cambio**: Validación ya existía con `@Min(1000)` y `@Max(9999)`
   - **Estado**: ✅ YA ESTABA VALIDADO

3. **F4: Validador de email con dominio @unt.edu.pe en backend**
   - **Archivo**: `backend/src/docentes/dto/create-docente.dto.ts`
   - **Cambio**: Agregado `@Matches(/@unt\.edu\.pe$/)` para validar dominio institucional
   - **Línea**: 60
   - **Estado**: ✅ COMPLETADO

4. **F7: Agregar índices en docente entity**
   - **Archivo**: `backend/src/entities/docente.entity.ts`
   - **Cambio**: Agregados índices en categoria, tipo_docente, modalidad, activo y compuesto
   - **Líneas**: 30-34
   - **Estado**: ✅ COMPLETADO

5. **F8: DNIs no asignados en seed**
   - **Archivo**: `backend/src/database/seed.ts`
   - **Cambio**: Agregados DNIs únicos de 8 dígitos a cada docente en `docentesData`
   - **Líneas**: 589-790
   - **Estado**: ✅ COMPLETADO

## Fase 2: Horario del Docente - VERIFICADO

### Hallazgos Corregidos:

1. **F1: Endpoint /horarios/mis-horarios no encontrado**
   - **Archivo**: `backend/src/horarios/horarios.controller.ts`
   - **Hallazgo**: INCORRECTO - El endpoint YA EXISTÍA
   - **Ubicación**: Líneas 272-300
   - **Estado**: ✅ YA EXISTÍA

## Fase 4: Declaración de Carga - VERIFICADO

### Hallazgos Corregidos:

1. **F5: Servicio DeclaracionesService no encontrado**
   - **Archivo**: `backend/src/declaracion-carga-horaria/declaracion-carga-horaria.service.ts`
   - **Hallazgo**: INCORRECTO - El servicio YA EXISTÍA como `DeclaracionCargaHorariaService`
   - **Estado**: ✅ YA EXISTÍA

## Fase 5: Reportes - VERIFICADO

### Hallazgos Corregidos:

1. **F4: Endpoints de reportes no encontrados**
   - **Archivo**: `backend/src/reportes/reportes.controller.ts`
   - **Hallazgo**: INCORRECTO - Los endpoints YA EXISTÍAN
   - **Endpoints disponibles**:
     - `/reportes/docente/:id/pdf`
     - `/reportes/declaracion/:docenteId/pdf` (F03-CAD)
     - `/reportes/f01-cad/:docenteId/pdf`
     - `/reportes/declaracion-jurada/:docenteId/pdf` (F02-CAD)
     - `/reportes/mi-horario/pdf`
     - `/reportes/mi-horario/excel`
     - Y muchos más...
   - **Estado**: ✅ YA EXISTÍAN

## Resumen

- **Total correcciones implementadas**: 5 (Fase 0)
- **Total hallazgos incorrectos corregidos**: 3 (Fase 2, Fase 4, Fase 5)
- **Estado general**: Las correcciones CRÍTICAS de prioridad alta han sido completadas. Los servicios backend que se creían faltantes ya existían en el código base.

## Próximos Pasos Sugeridos

1. **Prioridad ALTA**:
   - Agregar restricciones foreign key en facultad_id, departamento_id
   - Optimizar cascada de departamentos
   - Corregir cálculo de rowspan con minutos
   - Agregar índices en horario_asignado
   - Validación de superposición en disponibilidad
   - Reintentos en auto-save
   - Validación de conflicto bloqueante

2. **Prioridad MEDIA**:
   - Mejorar UX de cascada tipo_docente
   - Corregir mensaje "desactivar" consistente
   - Mejorar normalización de hora
   - Mejorar lógica "turno mañana"
   - Redondeo matemático de horas
   - Unificar llamadas de generación de PDFs
   - Manejo de errores específico en PDFs
19. Mejorar validaciones según feedback de usuarios
20. Documentar arquitectura y decisiones de diseño

---

# CONCLUSIÓN

El rol docente tiene una implementación parcial con el frontend más avanzado que el backend. Los componentes de UI están bien diseñados pero faltan servicios críticos en el backend (DeclaracionesService, ReportesService, endpoint de horario personal). Hay varias validaciones que están solo en frontend y deberían estar en backend para garantizar integridad de datos. La base de datos carece de índices y restricciones que mejorarían el rendimiento y la integridad. Se recomienda priorizar la implementación de los servicios backend faltantes antes de continuar con mejoras de UX.
