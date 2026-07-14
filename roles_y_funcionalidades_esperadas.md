# Roles y Funcionalidades Esperadas — Sistema de Gestión de Carga Académica UNT

## Introducción

Este documento define los roles del sistema de gestión de carga académica de la Universidad Nacional de Trujillo, sus responsabilidades, alcance de permisos, funcionalidades asociadas y escenarios de prueba. Sirve como guía para revisar y probar el sistema rol por rol, verificando que cada perfil tenga acceso exacto a lo que le corresponde y que las restricciones funcionen correctamente.

El sistema cubre un ciclo completo de gestión académica: configuración institucional, gestión de docentes y cursos, asignación de carga lectiva, declaración de carga por parte del docente, generación y aprobación de horarios, registro de carga adicional, reportes oficiales y seguimiento del proceso.

---

## Lista General de Roles

| # | Rol | Código | Nivel jerárquico | Alcance de datos |
|---|-----|--------|-------------------|------------------|
| 1 | Administrador del Sistema | `administradorsistema` | Global | Todos los datos, todas las facultades |
| 2 | Coordinador Académico | `coordinadoracademico` | Facultad / Escuela | Todos los departamentos de una escuela |
| 3 | Director de Escuela | `directorescuela` | Escuela | Todos los departamentos de una escuela |
| 4 | Director de Departamento | `directordepartamento` | Departamento | Un solo departamento |
| 5 | Decano | `decano` | Facultad | Todos los departamentos de una facultad |
| 6 | Secretaria(o) | `secretaria` | Departamento | Un solo departamento |
| 7 | Operador de Horarios | `operadorhorarios` | Global | Todos los datos (sin restricción de alcance) |
| 8 | Docente | `docente` | Individual | Solo sus propios datos |

---

## 1. Administrador del Sistema

### Propósito
Control total del sistema. Configura parámetros institucionales, gestiona usuarios, periodos académicos, y tiene visibilidad completa de todas las facultades, departamentos, escuelas, docentes, cursos, horarios y declaraciones.

### Módulos a los que accede
- Dashboard (carga completa, KPIs globales)
- Gestión de Usuarios (CRUD completo)
- Configuración del Sistema (restricciones, parámetros de carga, días activos, colores)
- Gestión de Docentes (CRUD, importación, exportación)
- Gestión de Cursos (CRUD, detalle, ambientes, grupos)
- Gestión de Ambientes (CRUD)
- Plan de Estudios
- Oferta Académica
- Asignación Lectiva (asignación de carga a docentes)
- Gestión de Horarios (asignación, intercambio, eliminación)
- Períodos Académicos (CRUD)
- Parámetros de Carga (máximos/mínimos de horas y cursos)
- Campañas de Ventanas (turnos de atención)
- Ventanas de Atención (gestión de turnos)
- Disponibilidad Docente (consulta global)
- Declaraciones (todas las declaraciones de todos los docentes)
- CLAD (Carga Lectiva Adicional)
- Documentaciones
- Análisis de Carga Académica
- Reportes (PDF, Excel — todos los formatos)
- Analytics
- Auditoría
- Notificaciones (envío global)
- Asistente IA

### Acciones que debería poder realizar
- Crear, editar, desactivar y eliminar usuarios de cualquier rol
- Asignar roles y contextos académicos (facultad, escuela, departamento) a usuarios
- Restablecer contraseñas de cualquier usuario
- Crear, editar y eliminar periodos académicos
- Configurar restricciones institucionales (franja horaria, bloque de almuerzo, duración de bloque, máximo de horas diarias/semanales)
- Configurar parámetros de carga (horas mín/máx semanales, cursos mín/máx por docente)
- Definir días activos del sistema
- Configurar colores institucionales, logo, nombre
- Crear, editar y eliminar docentes (CRUD completo)
- Importar docentes desde archivo
- Exportar listado de docentes
- Crear, editar y eliminar cursos, ambientes, grupos
- Gestionar planes de estudios y oferta académica
- Asignar carga lectiva a docentes (asignación lectiva)
- Generar, editar, asignar y eliminar horarios
- Realizar intercambio masivo de horarios
- Ver todas las declaraciones de carga de todos los docentes
- Aprobar o rechazar declaraciones a cualquier nivel
- Gestionar CLAD (carga lectiva adicional)
- Generar y descargar todos los reportes y formatos (F01, F02, F03-CAD, reportes ejecutivos, PDFs)
- Ver auditoría completa del sistema
- Enviar notificaciones a cualquier usuario
- Consultar analytics y análisis de carga
- Gestionar campañas de ventanas de atención

### Acciones que NO debería poder realizar
- No tiene restricciones de acceso. Este es el único rol con acceso ilimitado.

### Reportes y documentos asociados
- Todos los reportes del sistema (PDF y Excel)
- Formatos oficiales: F01, F02, F03-CAD
- Reportes de gestión de carga
- Reportes de cumplimiento
- Reportes ejecutivos
- Exportaciones de docentes, horarios, declaraciones

### Qué debería probarse
- [ ] Acceso correcto a todos los módulos sin restricción
- [ ] CRUD de usuarios con diferentes roles
- [ ] Asignación de contextos académicos a usuarios
- [ ] Restablecimiento de contraseñas
- [ ] Configuración de restricciones institucionales
- [ ] Configuración de parámetros de carga
- [ ] CRUD de docentes, cursos, ambientes
- [ ] Importación masiva de docentes
- [ ] Asignación de carga lectiva
- [ ] Generación y asignación de horarios
- [ ] Visualización de declaraciones de todos los docentes
- [ ] Aprobación de declaraciones a nivel departamento y facultad
- [ ] Generación de todos los reportes
- [ ] Acceso a auditoría completa
- [ ] Envío de notificaciones a cualquier usuario
- [ ] Verificar que ningún endpoint retorna 403 para este rol

---

## 2. Coordinador Académico

### Propósito
Gestión operativa de la carga académica dentro de una escuela o facultad. Es el responsable de mantener actualizados los docentes, cursos, ambientes y horarios. Coordina el proceso de asignación de carga lectiva y supervisa la generación de horarios.

### Módulos a los que accede
- Dashboard (datos de su escuela/facultad)
- Gestión de Docentes (CRUD, importación, exportación)
- Gestión de Cursos (CRUD, detalle, ambientes, grupos)
- Gestión de Ambientes (CRUD)
- Plan de Estudios (consulta)
- Oferta Académica (gestión)
- Asignación Lectiva (asignación de carga)
- Gestión de Horarios (asignación, intercambio, eliminación)
- Períodos Académicos (consulta)
- Campañas de Ventanas (gestión)
- Ventanas de Atención (gestión)
- Disponibilidad Docente (consulta de docentes de su alcance)
- Declaraciones (declaraciones de docentes de su alcance)
- CLAD (consulta y gestión de docentes de su alcance)
- Análisis de Carga Académica
- Reportes (PDF, Excel — de su alcance)
- Analytics
- Auditoría (de su alcance)
- Asistente IA

### Acciones que debería poder realizar
- Crear, editar y eliminar docentes dentro de su alcance
- Importar y exportar docentes
- Crear, editar y eliminar cursos, ambientes, grupos
- Gestionar oferta académica
- Asignar carga lectiva a docentes de su escuela
- Generar, editar, asignar y eliminar horarios
- Realizar intercambio de horarios
- Ver declaraciones de docentes de su alcance
- Observar declaraciones (enviar observaciones al docente)
- Generar reportes de su escuela/facultad
- Ver analytics de su alcance
- Ver auditoría de su alcance
- Gestionar campañas de ventanas

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar usuarios
- No puede configurar restricciones institucionales
- No puede configurar parámetros de carga
- No puede definir días activos
- No puede gestionar periodos académicos (solo consulta)
- No puede aprobar declaraciones a nivel de facultad (solo observar)
- No puede enviar notificaciones masivas
- No puede acceder a datos de otras escuelas/facultades

### Reportes y documentos asociados
- Reportes de docentes de su escuela
- Reportes de horarios de su escuela
- Reportes de carga académica de su escuela
- Exportaciones de docentes y horarios
- Formatos F01, F02 de su alcance

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar acceder a configuración del sistema (403)
- [ ] Restricción al intentar gestionar usuarios (403)
- [ ] CRUD de docentes dentro de su alcance
- [ ] Intento de crear docente fuera de su alcance (rechazado)
- [ ] Asignación de carga lectiva a docentes de su escuela
- [ ] Generación y asignación de horarios
- [ ] Visualización de declaraciones de docentes de su alcance
- [ ] Observación de declaraciones
- [ ] Generación de reportes de su escuela
- [ ] Verificar que no ve datos de otras escuelas
- [ ] Acceso a auditoría de su alcance

---

## 3. Director de Escuela

### Propósito
Autoridad académica de una escuela profesional. Supervisa el proceso de carga académica, valida declaraciones de sus departamentos, aprueba documentos oficiales y genera reportes para la decanatura.

### Módulos a los que accede
- Dashboard (datos de su escuela)
- Gestión de Horarios (consulta)
- Plan de Estudios (consulta)
- Oferta Académica (consulta)
- Declaraciones (declaraciones de departamentos de su escuela)
- Documentaciones (gestión de documentos oficiales)
- CLAD (consulta de docentes de su escuela)
- Análisis de Carga Académica
- Reportes (PDF, Excel — de su escuela)
- Analytics
- Auditoría (de su escuela)
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con datos de su escuela
- Ver y generar reportes de su escuela
- Ver declaraciones de docentes de todos los departamentos de su escuela
- Aprobar observaciones de departamentos
- Generar documentos oficiales (F01, F02, F03-CAD)
- Ver analytics de su escuela
- Ver auditoría de su escuela
- Gestionar documentaciones

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar docentes, cursos, ambientes
- No puede asignar carga lectiva
- No puede generar ni asignar horarios
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede gestionar periodos académicos
- No puede aprobar declaraciones a nivel de facultad (solo a nivel de escuela)
- No puede acceder a datos de otras escuelas

### Reportes y documentos asociados
- Reportes de carga académica de su escuela
- Formatos F01, F02, F03-CAD de su escuela
- Reportes de cumplimiento de su escuela
- Documentos oficiales para decanatura

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar crear docentes (403)
- [ ] Restricción al intentar asignar horarios (403)
- [ ] Restricción al intentar configurar el sistema (403)
- [ ] Visualización de declaraciones de departamentos de su escuela
- [ ] Generación de reportes de su escuela
- [ ] Generación de documentos oficiales
- [ ] Verificar que no ve datos de otras escuelas
- [ ] Acceso a analytics de su escuela
- [ ] Acceso a auditoría de su escuela

---

## 4. Director de Departamento

### Propósito
Autoridad académica de un departamento. Valida y aprueba las declaraciones de carga de los docentes de su departamento, supervisa la asignación de carga y genera reportes departamentales.

### Módulos a los que accede
- Dashboard (datos de su departamento)
- Declaraciones (declaraciones de docentes de su departamento)
- Documentaciones (gestión de documentos oficiales)
- CLAD (verificación de CLAD de su departamento)
- Reportes (PDF, Excel — de su departamento)
- Auditoría (de su departamento)
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con datos de su departamento
- Ver todas las declaraciones de carga de docentes de su departamento
- Aprobar declaraciones de carga a nivel de departamento
- Observar declaraciones (enviar observaciones al docente)
- Rechazar declaraciones con justificación
- Verificar CLAD de docentes de su departamento
- Generar reportes de su departamento
- Ver auditoría de su departamento
- Gestionar documentaciones oficiales

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar docentes, cursos, ambientes
- No puede asignar carga lectiva
- No puede generar ni asignar horarios
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede aprobar declaraciones a nivel de facultad (solo departamento)
- No puede acceder a datos de otros departamentos
- No puede ver horarios asignados (solo declaraciones)

### Reportes y documentos asociados
- Reportes de carga académica de su departamento
- Formatos F01, F02 de su departamento
- Reportes de declaraciones aprobadas/observadas

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar crear docentes (403)
- [ ] Restricción al intentar asignar horarios (403)
- [ ] Restricción al intentar aprobar declaraciones a nivel de facultad (403)
- [ ] Aprobación de declaraciones a nivel de departamento
- [ ] Observación de declaraciones
- [ ] Rechazo de declaraciones
- [ ] Verificación de CLAD
- [ ] Generación de reportes de su departamento
- [ ] Verificar que no ve datos de otros departamentos
- [ ] Acceso a auditoría de su departamento

---

## 5. Decano

### Propósito
Autoridad máxima de una facultad. Aprueba las declaraciones de carga a nivel de facultad, supervisa el proceso completo y genera reportes para la gestión institucional.

### Módulos a los que accede
- Dashboard (datos de su facultad)
- Declaraciones (todas las declaraciones de departamentos de su facultad)
- CLAD (consulta de docentes de su facultad)
- Análisis de Carga Académica
- Reportes (PDF, Excel — de su facultad)
- Analytics
- Auditoría (de su facultad)
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con datos de su facultad
- Ver todas las declaraciones de carga de todos los departamentos de su facultad
- Aprobar declaraciones de carga a nivel de facultad (aprobación final)
- Observar declaraciones de cualquier departamento de su facultad
- Verificar CLAD de docentes de su facultad
- Generar reportes de su facultad
- Ver analytics de su facultad
- Ver auditoría de su facultad

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar docentes, cursos, ambientes
- No puede asignar carga lectiva
- No puede generar ni asignar horarios
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede gestionar periodos académicos
- No puede acceder a datos de otras facultades
- No puede aprobar declaraciones a nivel institucional (solo facultad)

### Reportes y documentos asociados
- Reportes de carga académica de su facultad
- Formatos F01, F02, F03-CAD de su facultad
- Reportes de cumplimiento de su facultad
- Reportes ejecutivos para gestión institucional

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar crear docentes (403)
- [ ] Restricción al intentar asignar horarios (403)
- [ ] Restricción al intentar configurar el sistema (403)
- [ ] Aprobación de declaraciones a nivel de facultad
- [ ] Observación de declaraciones de cualquier departamento
- [ ] Generación de reportes de su facultad
- [ ] Verificar que no ve datos de otras facultades
- [ ] Acceso a analytics de su facultad
- [ ] Acceso a auditoría de su facultad

---

## 6. Secretaria(o)

### Propósito
Soporte administrativo del departamento. Gestiona ventanas de atención, procesa trámites docentes, y apoya en la carga administrativa del proceso de asignación de carga académica.

### Módulos a los que accede
- Dashboard (datos de su departamento)
- Asignación Lectiva (consulta y gestión de asignaciones de su departamento)
- Ventanas de Atención (gestión de turnos)
- Campañas de Ventanas (gestión)
- Declaraciones (consulta de declaraciones de su departamento)
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con datos de su departamento
- Ver y gestionar asignaciones lectivas de docentes de su departamento
- Gestionar ventanas de atención (turnos del día)
- Gestionar campañas de ventanas
- Ver declaraciones de docentes de su departamento
- Consultar disponibilidad docente de su departamento

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar docentes, cursos, ambientes
- No puede generar ni asignar horarios
- No puede aprobar ni rechazar declaraciones
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede acceder a datos de otros departamentos
- No puede generar reportes oficiales

### Reportes y documentos asociados
- Consulta de asignaciones lectivas
- Reportes de turnos de atención

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar crear docentes (403)
- [ ] Restricción al intentar generar horarios (403)
- [ ] Restricción al intentar aprobar declaraciones (403)
- [ ] Gestión correcta de ventanas de atención
- [ ] Consulta de asignaciones lectivas de su departamento
- [ ] Verificar que no ve datos de otros departamentos

---

## 7. Operador de Horarios

### Propósito
Especialista en generación y gestión de horarios académicos. Tiene acceso global para generar, modificar y optimizar horarios en cualquier departamento, pero no modifica la estructura académica (docentes, cursos).

### Módulos a los que accede
- Dashboard (datos globales)
- Gestión de Horarios (asignación, intercambio, eliminación)
- Disponibilidad Docente (consulta global)
- Declaraciones (consulta global)
- Analytics
- Reportes (horarios)
- Auditoría
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con datos globales
- Generar, editar, asignar y eliminar horarios en cualquier departamento
- Realizar intercambio masivo de horarios
- Ver disponibilidad docente de todos los docentes
- Ver declaraciones de todos los docentes (solo consulta)
- Generar reportes de horarios
- Ver analytics de horarios
- Ver auditoría de horarios

### Acciones que NO debería poder realizar
- No puede crear, editar ni eliminar docentes, cursos, ambientes
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede aprobar ni rechazar declaraciones
- No puede asignar carga lectiva
- No puede gestionar periodos académicos
- No puede generar reportes que no sean de horarios

### Reportes y documentos asociados
- Reportes de horarios por docente, curso, ambiente
- Exportaciones de horarios (PDF, Excel)
- Reportes de conflictos de horario

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar crear docentes (403)
- [ ] Restricción al intentar configurar el sistema (403)
- [ ] Restricción al intentar aprobar declaraciones (403)
- [ ] Asignación de horarios en cualquier departamento
- [ ] Intercambio de horarios
- [ ] Eliminación de horarios
- [ ] Generación de reportes de horarios
- [ ] Verificar que no puede modificar la estructura académica

---

## 8. Docente

### Propósito
Profesor de la universidad. Declara su carga académica, registra su disponibilidad, consulta sus horarios asignados y gestiona sus documentos oficiales.

### Módulos a los que accede
- Dashboard (datos propios)
- Disponibilidad Docente (gestión de su disponibilidad)
- Declaraciones (declaración de carga académica)
- CLAD (carga lectiva adicional)
- Mis Horarios (consulta de horarios asignados)
- Mis Ventanas (consulta de turnos de atención)
- Notificaciones
- Perfil (actualización de datos personales)
- Asistente IA

### Acciones que debería poder realizar
- Ver dashboard con sus propios datos (horas asignadas, declaración, estado)
- Registrar y editar su disponibilidad semanal
- Crear, editar y enviar declaraciones de carga académica
- Eliminar declaraciones en borrador
- Ver estado de sus declaraciones (pendiente, aprobada, observada, rechazada)
- Registrar carga adicional (CLAD)
- Ver sus horarios asignados
- Verificar conflictos de horario
- Generar PDF de su horario
- Exportar su horario a Excel
- Consultar sus turnos de atención
- Ver y gestionar sus notificaciones
- Actualizar su perfil (foto, datos personales)
- Cambiar contraseña

### Acciones que NO debería poder realizar
- No puede ver horarios de otros docentes
- No puede ver declaraciones de otros docentes
- No puede modificar datos de docentes, cursos o ambientes
- No puede asignar ni eliminar horarios
- No puede aprobar ni rechazar declaraciones
- No puede configurar restricciones ni parámetros del sistema
- No puede gestionar usuarios
- No puede generar reportes institucionales
- No puede acceder a datos de otros docentes

### Reportes y documentos asociados
- PDF de su horario personal
- Exportación Excel de su horario
- Declaración de carga académica (formato propio)
- Formato F01 (declaración jurada)

### Qué debería probarse
- [ ] Acceso correcto a módulos asignados
- [ ] Restricción al intentar acceder a gestión de docentes (403)
- [ ] Restricción al intentar acceder a configuración (403)
- [ ] Restricción al intentar ver horarios de otro docente (403)
- [ ] Restricción al intentar ver declaraciones de otro docente (403)
- [ ] Registro de disponibilidad semanal
- [ ] Creación y envío de declaración de carga
- [ ] Edición de declaración en borrador
- [ ] Eliminación de declaración en borrador
- [ ] Visualización de horarios asignados
- [ ] Generación de PDF del horario
- [ ] Exportación Excel del horario
- [ ] Verificación de conflictos de horario
- [ ] Registro de carga adicional (CLAD)
- [ ] Actualización de perfil y foto
- [ ] Cambio de contraseña
- [ ] Visualización de notificaciones

---

## Matriz Resumen de Permisos por Módulo

| Módulo | Admin | Coordinador | Dir. Escuela | Dir. Dpto. | Decano | Secretaria | Operador | Docente |
|--------|:-----:|:-----------:|:------------:|:----------:|:------:|:----------:|:--------:|:-------:|
| Usuarios | CRUD | — | — | — | — | — | — | — |
| Configuración | CRUD | — | — | — | — | — | — | — |
| Parámetros de Carga | CRUD | — | — | — | — | — | — | — |
| Períodos | CRUD | R | — | — | — | — | — | — |
| Docentes | CRUD | CRUD | — | — | — | — | — | R (propio) |
| Cursos | CRUD | CRUD | — | — | — | — | — | — |
| Ambientes | CRUD | CRUD | — | — | — | — | — | — |
| Plan de Estudios | CRUD | R | R | — | — | — | — | — |
| Oferta Académica | CRUD | CRUD | R | — | — | R | — | — |
| Asignación Lectiva | CRUD | CRUD | — | — | — | R | — | — |
| Horarios | CRUD | CRUD | R | — | — | — | CRUD | R (propio) |
| Disponibilidad | R | R | — | — | — | R | R | CRUD (propio) |
| Declaraciones | CRUD | R (alcance) | R (alcance) | Aprobar/Obs. | Aprobar | R (alcance) | R | CRUD (propio) |
| CLAD | CRUD | R (alcance) | R (alcance) | Verificar | R (alcance) | — | — | CRUD (propio) |
| Documentaciones | — | — | CRUD | CRUD | R | — | — | — |
| Análisis de Carga | R | R | R | — | R | — | — | — |
| Reportes | Todos | Alcance | Alcance | Alcance | Alcance | — | Horarios | Propio |
| Analytics | R | R | R | — | R | — | R | — |
| Auditoría | R | R (alcance) | R (alcance) | R (alcance) | R (alcance) | — | R | — |
| Ventanas | CRUD | CRUD | — | — | — | CRUD | — | R (propio) |
| Notificaciones | Envío | — | — | — | — | — | — | R (propio) |
| Dashboard | Global | Escuela | Escuela | Departamento | Facultad | Departamento | Global | Propio |

**Leyenda:** CRUD = Crear, Leer, Actualizar, Eliminar | R = Lectura/Consulta | Obs = Observar | Aprobar = Aprobar/Rechazar | — = Sin acceso

---

## Diagrama del Flujo de Aprobación de Declaraciones

```
Docente crea declaración (borrador)
  ↓
Docente envía declaración → Estado: PENDIENTE
  ↓
Director de Departamento revisa
  ├── Aprueba → Estado: APROBADO_DEPTO → Decano revisa
  ├── Observa → Estado: OBSERVADO → Docente corrige y reenvía
  └── Rechaza → Estado: RECHAZADO (fin del proceso)
        ↓
Decano revisa
  ├── Aprueba → Estado: APROBADO (final) → Se incluye en reportes
  ├── Observa → Estado: OBSERVADO → Docente corrige y reenvía
  └── Rechaza → Estado: RECHAZADO (fin del proceso)
```

---

## Criterios Generales de Prueba por Rol

Para cada rol, además de las pruebas específicas listadas, verificar:

1. **Autenticación:** El rol solo puede iniciar sesión con credenciales válidas
2. **Dashboard:** Muestra datos del alcance correcto (global, facultad, escuela, departamento, propio)
3. **Navegación:** Solo ve los módulos que le corresponden en el sidebar
4. **Rutas:** No puede acceder a rutas no autorizadas por URL directa
5. **API:** Los endpoints del backend rechazan requests no autorizados (403)
6. **Alcance:** No ve datos de niveles superiores a los que tiene permiso
7. **Operaciones:** Las operaciones permitidas funcionan correctamente
8. **Restricciones:** Las operaciones no autorizadas son bloqueadas
9. **Contraseña:** Puede cambiar su contraseña y se refleja el cambio
10. **Foto de perfil:** Puede subir, ver y eliminar su foto de perfil
