# Manual de Usuario — Sistema de Horarios Académicos UNT

| Campo | Valor |
|---|---|
| **Versión** | 1.0.0 |
| **Fecha** | 10/07/2026 |
| **Autor** | Equipo de Desarrollo |
| **Estado** | Revisado |

---

## Índice

1. [Introducción y propósito](#1-introducción-y-propósito)
2. [Roles del sistema](#2-roles-del-sistema)
3. [Módulo: Autenticación](#3-módulo-autenticación)
4. [Módulo: Dashboard](#4-módulo-dashboard)
5. [Módulo: Gestión de Docentes](#5-módulo-gestión-de-docentes)
6. [Módulo: Gestión de Cursos](#6-módulo-gestión-de-cursos)
7. [Módulo: Gestión de Ambientes](#7-módulo-gestión-de-ambientes)
8. [Módulo: Plan de Estudios](#8-módulo-plan-de-estudios)
9. [Módulo: Asignación de Carga Lectiva](#9-módulo-asignación-de-carga-lectiva)
10. [Módulo: Asignador de Carga (Secretaría)](#10-módulo-asignador-de-carga-secretaría)
11. [Módulo: Disponibilidad Horaria](#11-módulo-disponibilidad-horaria)
12. [Módulo: Horarios](#12-módulo-horarios)
13. [Módulo: Mis Horarios (Docente)](#13-módulo-mis-horarios-docente)
14. [Módulo: Ventanas de Atención](#14-módulo-ventanas-de-atención)
15. [Módulo: Declaraciones de Carga](#15-módulo-declaraciones-de-carga)
16. [Módulo: CLAD](#16-módulo-clad)
17. [Módulo: Reportes](#17-módulo-reportes)
18. [Módulo: Administración](#18-módulo-administración)
19. [Preguntas frecuentes](#19-preguntas-frecuentes)
20. [Solución de problemas](#20-solución-de-problemas)

---

## 1. Introducción y propósito

El **Sistema de Horarios Académicos UNT** es una plataforma web diseñada para la gestión integral de carga lectiva, carga no lectiva, horarios, declaraciones juradas, ventanas de atención y reportes académicos de la Facultad de Ingeniería de la Universidad Nacional de Trujillo.

### Funciones principales

- **Carga lectiva**: Asignación y gestión de cursos a docentes por período académico.
- **Carga no lectiva**: Registro de actividades de investigación, gestión, tutoría y otras actividades no lectivas.
- **Horarios**: Generación automática o manual de horarios semanales, detección de conflictos y publicación.
- **Declaraciones**: Flujo completo de declaraciones juradas de carga académica con firmas digitales y aprobación multinivel.
- **Ventanas de atención**: Sistema de turnos en tiempo real con WebSocket para asignación de horarios a docentes.
- **Reportes**: Generación de PDF y Excel para docentes, ambientes, ciclos, consolidados y formatos oficiales (F01-CAD, F02-CAD, F03-CAD).
- **CLAD**: Declaración de Carga Lectiva en Actividades Dependientes (Posgrado, CEPUNT, etc.).

### Navegadores compatibles

| Navegador | Versión mínima |
|---|---|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Microsoft Edge | 90+ |

> **Nota**: Se recomienda usar Chrome o Edge para la mejor experiencia, especialmente en la generación de reportes PDF.

---

## 2. Roles del sistema

El sistema cuenta con 8 roles que determinan las funcionalidades accesibles para cada usuario:

| Rol | Descripción | Funcionalidades principales |
|---|---|---|
| **administradorsistema** | Acceso total al sistema | CRUD completo de todos los módulos, configuración general, gestión de usuarios, auditoría, reportes |
| **coordinadoracademico** | Coordinación académica | Gestión de docentes, cursos, ambientes, horarios, asignación de carga lectiva, reportes, verificación de declaraciones |
| **directorescuela** | Director de escuela | Visualización de horarios, aprobación de declaraciones a nivel de escuela, plan de estudios, reportes |
| **directordepartamento** | Director de departamento | Validación de declaraciones a nivel de departamento, visualización de horarios |
| **decano** | Decano de facultad | Aprobación final de declaraciones, gestión de CLAD, reportes ejecutivos |
| **secretaria** | Secretaría académica | Asignación de carga lectiva, ventanas de atención, horarios, reportes |
| **operadorhorarios** | Operador de ventanas | Operación de ventanas de atención en tiempo real, visualización de horarios |
| **docente** | Docente | Visualización de propio horario, disponibilidad, declaración jurada, CLAD |

---

## 3. Módulo: Autenticación

### 3.1 Inicio de sesión

1. Acceda a la URL del sistema.
2. Ingrese su **correo electrónico institucional** (formato: `usuario@unt.edu.pe`).
3. Ingrese su **contraseña**.
4. Haga clic en **"Iniciar Sesión"**.

[SCREENSHOT: login]

### 3.2 Cambio obligatorio de contraseña

Al iniciar sesión por primera vez, el sistema obliga a cambiar la contraseña. Esto se indica con el flag `debe_cambiar_password: true` en su cuenta.

1. Ingrese su contraseña actual.
2. Ingrese la nueva contraseña (mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y carácter especial).
3. Confirme la nueva contraseña.
4. Haga clic en **"Cambiar Contraseña"**.

### 3.3 Recuperación de contraseña

1. En la página de login, haga clic en **"¿Olvidó su contraseña?"**.
2. Ingrese su correo electrónico institucional.
3. Recibirá un enlace de recuperación en su correo.
4. Siga las instrucciones del correo para restablecer su contraseña.

> **Nota**: Si el correo no está registrado en el sistema, no se mostrará ningún mensaje por seguridad.

### 3.4 Página de perfil

Desde el menú superior puede acceder a su perfil para:

- Visualizar su información personal (nombre, correo, rol, departamento).
- Actualizar su nombre y correo electrónico.
- Cambiar su contraseña.

---

## 4. Módulo: Dashboard

El dashboard es la página principal que se muestra después del inicio de sesión. Proporciona una visión general del estado del sistema.

### 4.1 Pestaña: Vista General

- **KPIs principales**: Total de docentes, cursos, ambientes, horarios asignados.
- **Gráfico de embudo (funnel)**: Distribución de declaraciones por estado.
- **Gráfico de barras por departamento**: Carga académica distribuida por departamento.
- **Gráfico de avance**: Porcentaje de horarios completados.
- **Gráfico de doughnut**: Distribución por tipo de docente o modalidad.
- **Alertas**: Notificaciones importantes del sistema.

[SCREENSHOT: dashboard]

### 4.2 Pestaña: Carga Académica

- **KPIs de carga**: Docentes activos, horas asignadas, cumplimiento normativo.
- **Gráfico de categorías**: Distribución de carga por tipo de actividad.
- **Top docentes**: Ranking de docentes con mayor carga.
- **Docentes sin declarar**: Lista de docentes pendientes de declaración.

---

## 5. Módulo: Gestión de Docentes

### 5.1 Lista de docentes

- Tabla paginada con columns: Nombre, Código IBM, Email, Tipo, Categoría, Modalidad, Carga, Antigüedad, Estado.
- **Filtros**: Búsqueda por texto, categoría (Principal/Asociado/Auxiliar), tipo de docente (Nombrado/Contratado), modalidad, departamento, escuela, estado (Activo/Inactivo).
- **Ordenamiento**: Por cualquier columna.
- **Exportar**: A Excel o PDF con formato institucional.

[SCREENSHOT: docentes-list]

### 5.2 Crear docente

1. Haga clic en **"Nuevo Docente"**.
2. Complete los campos obligatorios: código, DNI, apellidos, nombres, email, tipo de docente, categoría, modalidad.
3. Seleccione el departamento y escuela.
4. Haga clic en **"Guardar"**.

### 5.3 Detalle del docente

Al hacer clic en un docente, se accede a una página con pestañas:

- **Información**: Datos personales y académicos completos.
- **Cursos asignados**: Lista de cursos asignados en el período actual.
- **Horario**: Vista semanal del horario asignado.
- **Disponibilidad**: Grilla de disponibilidad semanal.
- **Declaraciones**: Estado de declaraciones juradas.

### 5.4 Importación CSV

Desde **Configuración > Importador CSV** puede cargar docentes en lote:

1. Prepare un archivo CSV con los campos: código, DNI, apellidos, nombres, email, tipo_docente, categoría, modalidad, departamento.
2. Seleccione el archivo.
3. Revise la vista previa de los datos.
4. Confirme la importación.

### 5.5 Desactivar y reactivar

- **Desactivar**: El docente no podrá ser asignado en nuevos horarios. La acción es reversible.
- **Reactivar**: El docente vuelve a estar disponible para asignaciones.

---

## 6. Módulo: Gestión de Cursos

### 6.1 Lista de cursos

- Tabla con columns: Nombre, Código, Ciclo, Tipo, Créditos, Horas, Estado.
- **Filtros**: Búsqueda por texto, ciclo (1-10), laboratorio (sí/no), estado activo/inactivo.
- **Exportar**: PDF de la lista de cursos.

[SCREENSHOT: cursos-list]

### 6.2 Crear curso

1. Haga clic en **"Nuevo Curso"**.
2. Complete: nombre, código, ciclo, tipo (Especialidad/Obligatorio General/Obligatorio Profesional/Electivo), créditos, horas semanales.
3. Indique si requiere laboratorio.
4. Haga clic en **"Guardar"**.

### 6.3 Detalle del curso

Pestañas disponibles:

- **Información**: Datos generales del curso.
- **Ambientes**: Ambientes compatibles asignados al curso (aulas y laboratorios).
- **Grupos**: Grupos de laboratorio configurados para el curso.

### 6.4 Tipos de curso

| Tipo | Descripción |
|---|---|
| ESPECIALIDAD | Cursos de especialidad profesional |
| OBLIGATORIO_GENERAL | Formación general obligatoria |
| OBLIGATORIO_PROFESIONAL | Formación profesional obligatoria |
| ELECTIVO | Cursos electivos del plan de estudios |

---

## 7. Módulo: Gestión de Ambientes

### 7.1 Lista de ambientes

- Tabla con columns: Código, Nombre, Tipo, Capacidad, Pabellón, Estado.
- **Filtros**: Tipo de ambiente, pabellón, capacidad, estado.
- **Exportar**: A Excel.

[SCREENSHOT: ambientes-list]

### 7.2 Crear ambiente

1. Haga clic en **"Nuevo Ambiente"**.
2. Complete: código, nombre, tipo (Aula/Laboratorio/Auditorio/Taller/Seminario/Sala de Computación), capacidad, pabellón, piso.
3. Haga clic en **"Guardar"**.

### 7.3 Mapa interactivo del campus

Desde la opción **"Mapa del Campus"** puede visualizar:

- Ubicación de todos los ambientes por pabellón.
- Estado de ocupación en tiempo real.
- Clic en un ambiente para ver su horario semanal.

### 7.4 Tipos de ambiente

| Tipo | Descripción |
|---|---|
| AULA | Aulas de clases regulares |
| LABORATORIO | Laboratorios especializados |
| AUDITORIO | Auditorios para eventos académicos |
| TALLER | Talleres prácticos |
| SEMINARIO | Salas de seminarios |
| SALA_COMPUTACION | Salas con equipos de cómputo |

---

## 8. Módulo: Plan de Estudios

### 8.1 Lista de planes

- Visualización de planes de estudios registrados.
- El plan vigente es el **Plan de Estudios 2018** con más de 50 cursos.

[SCREENSHOT: plan-estudios]

### 8.2 Detalle del plan

- **Información general**: Nombre del plan, vigencia, resolución.
- **Cursos**: Lista completa de cursos organizados por ciclo (1-10).
- **Relaciones de prerequisito**: Cada curso puede tener uno o más prerequisitos.

### 8.3 Tipos de curso en el plan

| Tipo | Descripción |
|---|---|
| ESPECIALIDAD | Cursos de especialidad profesional |
| OBLIGATORIO_GENERAL | Formación general obligatoria |
| OBLIGATORIO_PROFESIONAL | Formación profesional obligatoria |
| ELECTIVO | Cursos electivos |

---

## 9. Módulo: Asignación de Carga Lectiva

### 9.1 Asignación de carga

Este módulo permite asignar docentes a cursos para un período académico específico.

[SCREENSHOT: asignacion-lectiva]

### 9.2 Flujo de estados

| Estado | Descripción | Acciones posibles |
|---|---|---|
| **PENDIENTE** | Asignación creada, pendiente de confirmación | Confirmar, Rechazar |
| **CONFIRMADO** | Docente confirmó la asignación | — |
| **RECHAZADO** | Docente rechazó la asignación | — |

### 9.3 Resumen por docente

El módulo muestra un resumen de la carga asignada a cada docente:

- Total de horas semanales asignadas.
- Cursos asignados con tipo de clase (Teoría/Práctica/Laboratorio).
- Estado de la asignación.

### 9.4 Tipo de clase

| Tipo | Descripción |
|---|---|
| TEORIA | Clases teóricas |
| PRACTICA | Clases prácticas |
| LABORATORIO | Clases de laboratorio |

---

## 10. Módulo: Asignador de Carga (Secretaría)

Este módulo está diseñado para el personal de secretaría académica y proporciona una interfaz visual para la asignación de carga.

[SCREENSHOT: asignador-carga]

### 10.1 Componentes

- **Banco de cursos**: Lista de cursos disponibles para asignación.
- **Cuadrícula de asignación**: Vista visual para arrastrar y soltar cursos a docentes.
- **Panel de ambientes**: Ambientes disponibles y compatibles con el curso seleccionado.
- **Indicadores de procentaje**: Avance de la asignación por docente y por curso.

### 10.2 Operaciones

1. Seleccione un curso del banco.
2. Arrastre el curso a un docente en la cuadrícula.
3. Seleccione el ambiente compatible.
4. El sistema valida automáticamente conflictos de horario.
5. Guarde la asignación.

---

## 11. Módulo: Disponibilidad Horaria

### 11.1 Grilla de disponibilidad

- Vista semanal del 7:00 a las 22:00.
- Cada celda indica si el docente está **disponible** (verde), **no disponible** (rojo) o con **restricción** (amarillo).

[SCREENSHOT: disponibilidad]

### 11.2 Restricciones institucionales

Las restricciones se configuran en **Configuración General**:

| Restricción | Descripción |
|---|---|
| **Franja Horaria** | Horario permitido para dictado de clases (ej: 07:00 - 22:00) |
| **Bloque de Almuerzo** | Horario bloqueado para almuerzo (ej: 12:00 - 13:00) |
| **Máx. Horas Diarias** | Máximo de horas lectivas por día (ej: 8 horas) |
| **Máx. Horas Semanales** | Máximo de horas lectivas por semana (ej: 40 horas) |
| **Duración de Bloque** | Duración estándar de un bloque de clase (ej: 120 minutos) |

---

## 12. Módulo: Horarios

### 12.1 Vista por docente

- Seleccione un docente de la lista izquierda.
- Se muestra la grilla semanal con los horarios asignados.
- Colores diferenciados por curso.
- Badges [TEO] para teoría y [LAB] para laboratorio.

[SCREENSHOT: horarios]

### 12.2 Vista por ambiente

- Seleccione un ambiente de la lista.
- Se muestra la ocupación semanal del ambiente.
- Colores diferenciados por docente/curso.

### 12.3 Vista por ciclo

- Seleccione un ciclo (1-10).
- Se muestran todos los horarios del ciclo seleccionado.

### 12.4 Vista por día

- Seleccione un día de la semana.
- Se muestra el horario completo de ese día.
- **Filtros**: Texto, ciclo, tipo, estado, turno (mañana/tarde), pabellón.

### 12.5 Asignación manual

1. Haga clic en una celda vacía de la grilla.
2. Se abre el diálogo **"Asignar Horario"**.
3. Seleccione el curso, ambiente y tipo de clase.
4. El sistema verifica conflictos en tiempo real.
5. Confirme la asignación.

### 12.6 Generación automática

1. Vaya a la pestaña **"Gestión"**.
2. Haga clic en **"Generar Horario Automático"**.
3. El sistema asigna horarios automáticamente basándose en:
   - Disponibilidad de docentes.
   - Disponibilidad de ambientes.
   - Restricciones institucionales.
   - Reglas de prioridad configuradas.
4. Revise los conflictos detectados en la pestaña **"Conflictos"**.

### 12.7 Detección de conflictos

El sistema detecta automáticamente:

- **Cruce de horario**: Docente o ambiente asignado a dos clases simultáneas.
- **Exceso de carga**: Docente con más horas de las permitidas.
- **Conflicto de ambiente**: Ambiente con más asignaciones de las que puede容纳.

### 12.8 Publicación

Una vez resueltos todos los conflictos, el horario puede pasar a estado **PUBLICADO**, haciendo visible la información a todos los usuarios del sistema.

### 12.9 Modos de asignación

El sistema soporta tres modos configurables por período:

| Modo | Descripción |
|---|---|
| **AUTOMATICA** | Generación automática de horarios por el sistema |
| **VENTANAS** | Asignación exclusiva vía ventanas de atención (turnos) |
| **MIXTA** | Combinación de generación automática y ventanas |

---

## 13. Módulo: Mis Horarios (Docente)

Módulo exclusivo para el rol **docente** que muestra su horario personal.

[SCREENSHOT: mis-horarios]

### 13.1 Visualización

- **Header**: Avatar con iniciales, nombre completo, chip del período académico.
- **Estadísticas**: Total de horas semanales, bloques asignados, días con clase.
- **Cursos asignados**: Cards con color por curso, mostrando nombre, tipo de clase y ambiente.
- **Grid semanal**: Colores de fondo por curso, badges [TEO]/[LAB], ambientes mergeados.
- **Leyenda**: Dots de color por curso.

### 13.2 Carga no lectiva

Si su declaración está en estado VALIDADO_DPTO, APROBADO_FACULTAD o CERRADO, puede activar el toggle **"Mostrar Carga No Lectiva"** para visualizar actividades de investigación, gestión, tutoría, etc.

### 13.3 Exportación

| Formato | Descripción |
|---|---|
| **PDF** | Horario semanal en formato PDF con encabezado institucional |
| **Excel** | Horario en formato XLSX con colores y formato |
| **iCalendar** | Archivo .ics compatible con Google Calendar, Outlook, Apple Calendar |

---

## 14. Módulo: Ventanas de Atención

### 14.1 Lista de ventanas

- Vista de todas las ventanas de atención creadas.
- **Filtros**: Estado (Programada/En curso/Completada/Cancelada), propósito, rango de fechas.
- **Paginación**: 6 elementos por página.

[SCREENSHOT: ventanas]

### 14.2 Crear ventana

1. Haga clic en **"Nueva Ventana"**.
2. Configure:
   - **Fecha**: Día de la ventana.
   - **Hora inicio/fin**: Horario de atención.
   - **Propósito**: Declaración, Subsanación, Cambio de Horario o Contingencia.
   - **Intervalo**: Tiempo de atención por docente (5-60 minutos).
   - **Categoría de docente**: Filtro opcional por categoría.
3. Haga clic en **"Crear"**.

### 14.3 Propósitos de ventana

| Propósito | Descripción |
|---|---|
| **DECLARACION** | Para docentes sin horario asignado en el período |
| **SUBSANACION** | Para docentes con horario que necesitan correcciones |
| **CAMBIO** | Para solicitudes de cambio de horario o ambiente |
| **CONTINGENCIA** | Para casos excepcionales o incidencias |

### 14.4 Cola en tiempo real

Al iniciar una ventana:

- **En atención**: Docente siendo atendido actualmente.
- **Esperando**: Cola de docentes en espera.
- **Atendidos**: Docentes ya atendidos.
- Actualización en tiempo real vía WebSocket.

### 14.5 Distribución automática

El sistema puede distribuir automáticamente los docentes entre múltiples ventanas:

1. Configure la ventana base.
2. Haga clic en **"Obtener Distribución"**.
3. El sistema calcula cuántas ventanas se necesitan.
4. Confirme la creación automática.
5. Los docentes se distribuyen equitativamente.

---

## 15. Módulo: Declaraciones de Carga

### 15.1 Flujo de estados

La declaración de carga horaria sigue un flujo de 7 estados:

```
BORRADOR → ENVIADO → OBSERVADO_DPTO → VALIDADO_DPTO → OBSERVADO_FACULTAD → APROBADO_FACULTAD → CERRADO
```

[SCREENSHOT: declaraciones]

### 15.2 Descripción de estados

| Estado | Descripción | Responsable |
|---|---|---|
| **BORRADOR** | Declaración en borrador, editable | Docente |
| **ENVIADO** | Enviada al departamento para revisión | Docente |
| **OBSERVADO_DPTO** | Con observaciones del director de departamento | Director Dpto. |
| **VALIDADO_DPTO** | Validada por el director de departamento | Director Dpto. |
| **OBSERVADO_FACULTAD** | Con observaciones de la facultad | Decano |
| **APROBADO_FACULTAD** | Aprobada por el decano | Decano |
| **CERRADO** | Proceso finalizado y cerrado | Sistema |

### 15.3 Carga lectiva

La declaración incluye:

- **Cursos asignados**: Lista de cursos con horas semanales, tipo de clase y grupos.
- **Resumen de carga**: Total de horas teóricas, prácticas y de laboratorio.
- **Firma del docente**: Firma digital del docente que declara.

### 15.4 Carga no lectiva

Actividades no lectivas disponibles:

| Tipo | Descripción |
|---|---|
| PREPARACION_EVALUACION | Preparación de exámenes |
| INVESTIGACION | Actividades de investigación |
| TUTORIA | Tutoría a estudiantes |
| GESTION_ACADEMICA | Gestión académica administrativa |
| PROYECCION_SOCIAL | Proyección social |
| CAPACITACION | Capacitación y entrenamiento |
| OTRA | Otra actividad no lectiva |

### 15.5 Horario gráfico no lectivo

El módulo incluye un componente de **drag-and-drop** para gestionar horarios no lectivos:

- Grid semanal (Lunes a Sábado, 7:00 a 22:00).
- Bloques lectivos (azul) como referencia.
- Bloques no lectivos (ámbar) arrastrables.
- Almuerzo (12:00-14:00) bloqueado visualmente.
- Detección de conflictos en tiempo real.
- Controles rápidos: selector de bloque (1h/2h/3h), día y hora.

### 15.6 Firmas digitales

El flujo de firmas incluye:

1. **Firma del docente**: El docente firma su declaración jurada.
2. **Firma del director**: El director de departamento valida.
3. **Firma del decano**: El decano aprueba finalmente.

### 15.7 Validación a nivel de departamento

El director de departamento puede:

- **Validar**: Aprueba la declaración y la envía a facultad.
- **Observar**: Devuelve la declaración con observaciones para corrección.

### 15.8 Aprobación a nivel de facultad

El decano puede:

- **Aprobar**: Aprueba la declaración y la cierra.
- **Observar**: Devuelve la declaración con observaciones.

---

## 16. Módulo: CLAD

### 16.1 Descripción

CLAD (Declaración de Carga Lectiva en Actividades Dependientes) es para docentes que imparten clases en dependencias externas como Posgrado, CEPUNT, Filiales, etc.

[SCREENSHOT: clad]

### 16.2 Estados

| Estado | Descripción |
|---|---|
| **BORRADOR** | Declaración en borrador |
| **ENVIADO_DPTO** | Enviada al departamento |
| **OBSERVADO_DPTO** | Con observaciones del departamento |
| **VALIDADO_DPTO** | Validada por el departamento |
| **OBSERVADO_DEPENDENCIA** | Con observaciones de la dependencia |
| **VALIDADO_DEPENDENCIA** | Validada por la dependencia |
| **APROBADO_FINAL** | Aprobación final |

### 16.3 Tipos de dependencia

| Tipo | Descripción |
|---|---|
| POSGRADO | Programas de posgrado |
| SEGUNDA_ESPECIALIDAD | Segunda especialidad profesional |
| CEPUNT | Centro de Estudios de Posgrado UNT |
| FILIAL | Filiales regionales |
| CENTRO_PRODUCCION | Centros de producción |
| OTRO | Otra dependencia |

### 16.4 Operaciones

- **Crear declaración**: Complete los datos de la actividad dependiente.
- **Editar**: Modifique declaraciones en borrador o con observaciones.
- **Eliminar**: Solo declaraciones en borrador.
- **Descargar PDF**: Anexo 04 CLAD en formato PDF.

---

## 17. Módulo: Reportes

### 17.1 Reportes por docente

| Formato | Endpoint | Descripción |
|---|---|---|
| PDF | `/reportes/docente/:id/pdf` | Horario semanal del docente |
| Excel | `/reportes/docente/:id/excel` | Horario en formato XLSX |

### 17.2 Reportes por ambiente

| Formato | Endpoint | Descripción |
|---|---|---|
| PDF | `/reportes/ambiente/:id/pdf` | Horario del ambiente (aula/laboratorio) |
| Excel | `/reportes/ambiente/:id/excel` | Horario del ambiente en XLSX |

### 17.3 Reportes consolidados

| Reporte | Formato | Descripción |
|---|---|---|
| Consolidado de carga | PDF/Excel | Carga académica por departamento |
| Carga por modalidad | PDF | Distribución de carga por modalidad docente |
| Completo | Excel | Todos los horarios del período |
| Todos los ciclos | PDF/Excel | Horarios consolidados por ciclo |
| Operacional | PDF | Todas las asignaciones del período |
| Cursos | PDF | Lista de cursos |

### 17.4 Formatos oficiales

| Formato | Descripción |
|---|---|
| **F01-CAD** | Declaración de Carga Académica Docente |
| **F02-CAD** | Declaración Jurada de Incompatibilidad |
| **F03-CAD** | Horario Semanal Docente |

### 17.5 Reportes de gestión

| Reporte | Descripción |
|---|---|
| **Gestión** | KPIs generales del período |
| **Gestión de carga** | Métricas de carga académica |
| **Cumplimiento** | Porcentaje de cumplimiento por departamento |
| **Ejecutivo** | Reporte para decano con semáforo de estado |

### 17.6 Reportes por día

- Seleccione un día de la semana (1-6).
- Filtros opcionales: ciclo, tipo, búsqueda.
- Genera PDF con el horario completo de ese día.

---

## 18. Módulo: Administración

### 18.1 Gestión de usuarios

- CRUD completo de usuarios del sistema.
- Asignación de roles.
- Gestión de contraseñas.
- Registro de actividad.

[SCREENSHOT: usuarios]

### 18.2 Períodos académicos

- Crear y gestionar períodos académicos (ej: 2026-I, 2026-II).
- Configurar el **modo de asignación** por período (Automática/Ventanas/Mixta).
- Estados del período: Activo, Inactivo, Cerrado.

### 18.3 Parámetros de carga

- Configuración de límites de carga por modalidad docente.
- Parámetros de distribución de horas.

### 18.4 Configuración general

- **Nombre institucional**: Nombre de la universidad.
- **Nombre de facultad**: Nombre de la facultad.
- **Logo URL**: URL del logotipo institucional.
- **Colores del tema**: Colores primario, secundario y acento para modo claro y oscuro.

### 18.5 Campañas de ventanas

- Configuración de campañas de ventanas de atención por período.
- Distribución automática de docentes entre ventanas.

### 18.6 Auditoría

- Registro completo de acciones del sistema.
- Filtros por: período, usuario, acción, entidad, rango de fechas.
- Visualización de estado anterior y nuevo de cada cambio.

---

## 19. Preguntas frecuentes

### 1. ¿Qué hago si hay cruce de horario al asignar?

El sistema detecta automáticamente los conflictos de horario. Si aparece un cruce:

1. Vaya a **Horarios > Conflictos**.
2. Revise el tipo de conflicto y la descripción.
3. Modifique la asignación para resolver el conflicto (cambie día, hora o ambiente).
4. Haga clic en **"Resolver"** si ya no hay conflicto.

### 2. ¿Cuántas horas máximo puede tener un docente?

Los límites dependen de la modalidad de dedicación:

| Modalidad | Horas semanales máximas |
|---|---|
| Dedicación Exclusiva | 40 horas |
| Tiempo Completo (40 h) | 40 horas |
| Tiempo Parcial 20 h | 20 horas |
| Tiempo Parcial 12 h | 12 horas |
| Tiempo Parcial 10 h | 10 horas |
| Tiempo Parcial 8 h | 8 horas |

Estos valores pueden configurarse en **Configuración > Restricciones**.

### 3. ¿Cómo cambio la modalidad de asignación?

1. Vaya a **Configuración General**.
2. Busque la sección **"Modo de Período"**.
3. Seleccione el nuevo modo (Automática, Ventanas o Mixta).
4. Haga clic en **"Cambiar Modo"**.

> **Nota**: Solo puede cambiar el modo si no hay horarios asignados en el período.

### 4. ¿Por qué mi declaración aparece como "Observada"?

Su declaración fue observada por el director de departamento o el decano. Para subsanar:

1. Vaya a **Declaraciones > Verificar Declaración**.
2. Revise las observaciones registradas.
3. Realice las correcciones necesarias.
4. Reenvíe la declaración.

### 5. ¿Cómo genero el formato F03-CAD?

1. Vaya a **Reportes**.
2. Seleccione **"Formato F03-CAD"**.
3. Elija el docente y período.
4. Haga clic en **"Generar PDF"**.
5. El sistema descargará automáticamente el archivo.

### 6. ¿Qué hago si un ambiente no aparece disponible?

Verifique que:

1. El ambiente esté en estado **ACTIVO** (Gestión de Ambientes).
2. El ambiente esté asignado como compatible con el curso (Detalle del Curso > Ambientes).
3. No haya un horario asignado en ese horario para el ambiente.
4. El día esté activo en la configuración (Configuración > Días Activos).

### 7. ¿Cómo subo mi firma digital?

1. Vaya a su **Perfil**.
2. En la sección de firma, cargue una imagen de su firma.
3. La firma se utilizará automáticamente en las declaraciones juradas.

### 8. ¿Qué significa "debe_cambiar_password"?

Es un indicador de que es su primer inicio de sesión en el sistema. Debe cambiar su contraseña temporal por una nueva contraseña segura antes de poder acceder a las funcionalidades del sistema.

---

## 20. Solución de problemas

### Error 401: Token expirado

**Causa**: Su sesión ha expirado por inactividad.

**Solución**:
1. Cierre la sesión actual.
2. Vuelva a iniciar sesión con sus credenciales.
3. Si el problema persiste, contacte al administrador del sistema.

### Error 403: Sin permisos

**Causa**: Su usuario no tiene permisos para acceder al recurso solicitado.

**Solución**:
1. Verifique que está logueado con el usuario correcto.
2. Solicite al administrador que asigne los permisos necesarios.
3. Verifique que su rol tiene acceso a la funcionalidad que intenta usar.

### Error de conexión con backend

**Causa**: El servidor backend no está disponible.

**Solución**:
1. Verifique su conexión a internet.
2. Revise si el servidor está ejecutándose: `docker compose ps`.
3. Si usa Docker: `docker compose restart backend`.
4. Revise los logs: `docker compose logs -f backend`.

### No se generan reportes PDF

**Causa**: Puppeteer no puede generar el PDF.

**Solución**:
1. Verifique que Chromium está instalado en el contenedor backend.
2. En Docker, la variable `PUPPETEER_EXECUTABLE_PATH` debe apuntar a `/usr/bin/chromium-browser`.
3. Revise los logs del backend para errores específicos de Puppeteer.
4. Intente generar un reporte más sencillo (ej: lista de cursos).

### El horario no aparece en la grilla

**Causa**: El horario no fue publicado o hay un problema de sincronización.

**Solución**:
1. Verifique que el período académico seleccionado es el correcto.
2. Revise si el horario está en estado **PUBLICADO** o **CONFIRMADO**.
3. Actualice la página (F5).
4. Si es docente, verifique que su declaración esté en estado válido.
5. Contacte al coordinador académico para verificar la publicación.

### Error al importar CSV

**Causa**: El archivo CSV no tiene el formato correcto.

**Solución**:
1. Verifique que el archivo tiene las columnas: código, DNI, apellidos, nombres, email, tipo_docente, categoría, modalidad, departamento.
2. Asegúrese de que el archivo está en formato UTF-8.
3. Verifique que no hay filas vacías.
4. Revise que los valores de tipo_docente, categoría y modalidad coinciden con los valores del sistema.
5. Intente con un archivo más pequeño para identificar el problema.

---

## Historial de cambios

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0.0 | 10/07/2026 | Equipo de Desarrollo | Versión inicial del manual de usuario |
