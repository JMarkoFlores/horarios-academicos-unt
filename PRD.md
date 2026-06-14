# PRD — Sistema de Gestión de Horarios Académicos UNT

## 1. Propósito de la aplicación

**Horarios UNT** es un sistema web integral para la gestión de horarios académicos de la Universidad Nacional de Trujillo (UNT), Escuela de Ingeniería de Sistemas (EIS). Automatiza todo el flujo de planificación, asignación y publicación de horarios de clases, reemplazando procesos manuales con hojas de cálculo.

El sistema permite crear períodos académicos, registrar docentes, cursos, grupos, ambientes (aulas/laboratorios), gestionar la disponibilidad horaria de los docentes, asignar horarios (de forma manual, automática o mediante un sistema de ventanas de atención en tiempo real), detectar conflictos y generar reportes en PDF/Excel.

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 + TypeScript 5.4 |
| ORM | TypeORM 0.3 |
| Base de datos | PostgreSQL 16 |
| Cache / Pub-Sub | Redis 7 |
| Frontend | Angular 17.3 + Angular Material 17.3 |
| Tiempo real | Socket.IO |
| Autenticación | Passport + JWT |
| Reportes PDF | Puppeteer, jsPDF |
| Reportes Excel | ExcelJS |
| Internacionalización | ngx-translate |
| Contenedores | Docker + Docker Compose |

## 3. Roles de usuario (8 roles)

| Rol | Descripción |
|---|---|
| Administrador del Sistema | Acceso total al sistema |
| Director de Escuela | Visualiza horarios, reportes, analíticas |
| Director de Departamento | Visualiza y gestiona su departamento |
| Coordinador Académico | Operaciones de gestión (CRUD maestros, asignaciones) |
| Decano | Visualización institucional |
| Secretaria | Opera ventanas de atención y cola de docentes |
| Operador de Horarios | Gestión operativa de horarios |
| Docente | Declara disponibilidad, ve sus horarios, declara carga lectiva |

## 4. Módulos funcionales (features a testear)

### 4.1 Autenticación y usuarios (`/auth`, `/usuarios`)
- Login con email y password (JWT)
- Refresh token
- Cambio y recuperación de contraseña
- CRUD de usuarios del sistema (solo admin)
- Roles y permisos (RBAC)

### 4.2 Gestión de facultades, escuelas y departamentos (`/facultades`, `/escuelas`, `/departamentos`)
- CRUD completo de facultades
- CRUD completo de escuelas (programas profesionales)
- CRUD completo de departamentos académicos
- Jerarquía: Facultad → Escuela → Departamento

### 4.3 Gestión de docentes (`/docentes`)
- CRUD de docentes con datos personales y contractuales
- Filtros por: categoría, tipo de contrato, tipo docente, modalidad, departamento
- Asignación de cursos a docentes (habilitación)
- Asignación de ambientes a docentes
- Jerarquía institucional (Principal > Asociado > Auxiliar)
- Carga docente por día
- Detección de carga desequilibrada

### 4.4 Gestión de cursos (`/cursos`)
- CRUD de cursos con: código, nombre, créditos, horas teoría/práctica/laboratorio, ciclo, prerequisitos
- Asignación de ambientes compatibles por curso

### 4.5 Gestión de grupos/secciones (`/grupos`)
- CRUD de grupos por período académico
- Configuración de cupo máximo

### 4.6 Gestión de ambientes (aulas/laboratorios) (`/ambientes`)
- CRUD de ambientes con: tipo (AULA, LABORATORIO, AUDITORIO, TALLER, SEMINARIO, SALA_COMPUTACIÓN), capacidad, ubicación (pabellón, piso, edificio), coordenadas
- Grilla de disponibilidad/ocupación semanal
- Cálculo de distancia entre ambientes
- Alertas de traslado para docentes con clases consecutivas

### 4.7 Disponibilidad docente (`/disponibilidad`)
- Grilla semanal para que docentes declaren su disponibilidad
- Soporte para múltiples bloques horarios por día
- Resumen de horas disponibles por docente
- Restricciones institucionales (franjas prohibidas)

### 4.8 Asignación de horarios (`/horarios`)
- Asignación manual de horarios
- Asignación masiva automática (algoritmo greedy)
- Publicación de horarios auto-generados
- Reasignación y actualización de horarios existentes
- Limpieza de horarios en estado BORRADOR/CONFLICTO
- Exportación iCalendar (.ics) por docente

### 4.9 Sistema de ventanas de atención (turnos) (`/ventanas`, `/campanas-ventanas`)
- **Campañas de ventanas:** Configuración de campañas con reglas de prioridad, fechas, bloques horarios
- **Ventanas de atención:** Sesiones individuales con estado (PROGRAMADA → EN CURSO → COMPLETADA/CANCELADA) y categorías (DECLARACIÓN, SUBSANACIÓN, CAMBIO, CONTINGENCIA)
- **Cola de docentes:** Fila ordenada por jerarquía con estados (ESPERANDO → EN ATENCIÓN → COMPLETADO/AUSENTE)
- **Selección temporal de celdas:** El operador selecciona celdas en una grilla visual mientras atiende al docente; expiran a los 30 min
- **Validación en tiempo real:** Verifica restricciones institucionales, disponibilidad, límites de carga, conflictos antes de confirmar
- **WebSocket en tiempo real:** Eventos de cola actualizada, celda seleccionada/liberada, horario confirmado
- **Distribución de docentes:** Asignación inteligente entre múltiples ventanas

### 4.10 Detección de conflictos (`/horarios/conflictos`)
Detección de 12 tipos de conflicto:
- SIN_DOCENTE, SIN_AMBIENTE
- CRUCE_DOCENTE, CRUCE_AMBIENTE, CRUCE_GRUPO
- CARGA_INSUFICIENTE, CARGA_EXCEDIDA
- SIN_DISPONIBILIDAD
- CAPACIDAD_INSUFICIENTE
- DESCANSO_MÍNIMO
- FRANJA_INSTITUCIONAL
- DÍA_NO_LABORABLE
- Resolución de conflictos

### 4.11 Períodos académicos (`/periodos`)
- CRUD de períodos con fechas y estados
- Flujo de estados: planificación → asignaciónhorarios → encurso → finalizado

### 4.12 Configuración del sistema (`/configuracion`)
- Restricciones institucionales
- Días no laborables
- Turnos horarios
- Días activos por semana
- Parámetros de carga (horas mín/máx por categoría docente)
- Configuración general (nombre institucional, logo, colores)

### 4.13 Pre-asignaciones (`/preasignaciones`)
- Asignación anticipada de docentes a cursos con o sin horario definido

### 4.14 Declaración de carga horaria docente (`/declaracion-carga-horaria`)
- Formulario F03-CAD con flujo de trabajo completo:
  NO INICIADO → BORRADOR → PENDIENTE ENVÍO → ENVIADO DOCENTE → OBSERVADO DPTO → SUBSANADO → VALIDADO DPTO → OBSERVADO FACULTAD → APROBADO FACULTAD → CERRADO
- Firmas digitales (docente, director departamento, decano)
- Carga lectiva (desde horarios asignados) + carga no lectiva

### 4.15 Reportes (`/reportes`)
- PDF: horario por docente, aula, laboratorio, ciclo, día, completo, operacional, gestión
- Excel: horario completo (por hojas), por ambiente, por ciclo, por docente
- Formulario F03-CAD en PDF

### 4.16 Dashboard y analíticas (`/dashboard`, `/analytics`)
- KPIs del período actual
- Métricas personales para docentes
- Mapas de calor de ocupación
- Análisis de carga docente

### 4.17 Notificaciones (`/notificaciones`)
- Canales: correo electrónico y Telegram
- Preferencias de notificación por docente
- Historial de notificaciones con estados (PENDIENTE, ENVIADO, ENTREGADO, FALLIDO)

### 4.18 Chatbot IA (`/chatbot`)
- Asistente conversacional con GROQ/Gemini
- Consultas contextuales sobre horarios y datos del sistema

### 4.19 Auditoría (`/auditoria`)
- Historial completo de cambios en horarios
- Registro de: usuario, acción, datos anteriores/nuevos, IP, motivo

### 4.20 Importación de datos (`/data-import`)
- Importación masiva desde CSV/Excel

## 5. Entidades principales (30 tablas)

| Grupo | Entidades |
|---|---|
| Académicas | Facultad, Escuela, Departamento, Curso, Grupo, PeriodoAcademico |
| Docentes | Docente, DocenteCurso, Usuario |
| Infraestructura | Ambiente, CursoAmbiente |
| Horarios | HorarioAsignado, DisponibilidadDocente, ConflictoAsignacion, Preasignacion |
| Ventanas | CampañaVentanas, VentanaAtencion, ColaDocentes, SeleccionTemporal |
| Declaraciones | DeclaracionCargaHoraria |
| Configuración | ConfiguracionGeneral, RestriccionInstitucional, DiaNoLaborable, ParametrosCarga, TurnoHorario, DiaActivo, ReglasPrioridadGlobales |
| Notificaciones | NotificacionDocente, PreferenciasNotificacion |
| Auditoría | AuditoriaHorario |

## 6. Prerrequisitos para testing

### Test Data (Seed)
El proyecto incluye seed data con 5 usuarios predefinidos:
| Usuario | Email | Password | Rol |
|---|---|---|---|
| Admin | admin@unt.edu.pe | Admin123! | Administrador Sistema |
| Director | director@unt.edu.pe | Admin123! | Director de Escuela |
| Coordinador | coordinador@unt.edu.pe | Admin123! | Coordinador Académico |
| Operador | operador@unt.edu.pe | Admin123! | Operador de Horarios |
| Docente | docente@unt.edu.pe | Admin123! | Docente |

### Infraestructura requerida
- PostgreSQL 16 corriendo
- Redis 7 corriendo
- Backend NestJS en puerto 3000
- Frontend Angular en puerto 4200 (dev) o 8080 (producción)
- Ejecutar `npm run seed` para poblar la base de datos

## 7. Flujo de trabajo end-to-end crítico

1. Admin crea período académico
2. Admin/Coordinador registra facultades, escuelas, departamentos
3. Coordinador registra docentes, cursos, ambientes
4. Coordinador configura compatibilidad curso-ambiente
5. Coordinador habilita docentes para cursos
6. Docentes declaran disponibilidad horaria semanal
7. Coordinador asigna horarios (manual/automático/ventanas)
8. Se detectan y resuelven conflictos
9. Se publican horarios
10. Docentes visualizan sus horarios y exportan a iCal/PDF
11. Se generan reportes institucionales

## 8. Casos de prueba recomendados por módulo

### Autenticación
- Login exitoso con cada rol
- Login con credenciales inválidas
- Refresh token
- Cambio de contraseña
- Acceso a rutas sin token (debe rechazar)

### Docentes
- CRUD completo (crear, leer, actualizar, eliminar)
- Filtrar por categoría, tipo, departamento
- Asignar/desasignar cursos a docente
- Asignar ambientes a docente
- Soft-delete y reactivación

### Cursos
- CRUD completo
- Asignar ambientes compatibles
- Búsqueda por código/nombre/ciclo

### Ambientes
- CRUD completo
- Ver grilla de disponibilidad
- Calcular distancia entre ambientes
- Alertas de traslado

### Disponibilidad
- Guardar grilla semanal completa
- Actualizar disponibilidad existente
- Ver resumen de horas disponibles

### Horarios (asignación)
- Asignación manual exitosa
- Asignación con conflicto (docente ocupado, ambiente ocupado)
- Generación automática
- Reasignación
- Publicación de horarios auto-generados

### Ventanas (turnos)
- Crear campaña de ventanas
- Generar ventanas desde campaña
- Iniciar ventana y cargar cola
- Llamar siguiente docente
- Marcar docente como ausente
- Selección temporal de celda
- Confirmar selecciones
- Finalizar ventana
- Eventos WebSocket en tiempo real

### Conflictos
- Detección de cruce de docente
- Detección de cruce de ambiente
- Detección de capacidad insuficiente
- Resolución de conflictos

### Reportes
- Generar PDF de horario docente
- Generar Excel completo
- Generar PDF operacional/de gestión

### Declaración de carga horaria
- Flujo completo: borrador → envío → validación departamento → aprobación facultad
- Subsanación de observaciones
- Firmas digitales

### Configuración
- CRUD de restricciones institucionales
- Gestión de días no laborables
- Parámetros de carga docente
- Configuración institucional (logo, colores)
