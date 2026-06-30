# Checklist Funcional — Sistema de Gestión de Carga Académica UNT

> **Propósito:** Documento guía para pruebas funcionales módulo por módulo, rol por rol.
> Describir el comportamiento esperado de un sistema **completo y coherente**, no solo lo implementado actualmente.
> Cada sección incluye: funcionalidades ideales, acceso por rol, y escenarios a probar.

---

## Índice

1. [Autenticación y Seguridad](#1-autenticación-y-seguridad)
2. [Gestión de Usuarios, Roles y Perfiles](#2-gestión-de-usuarios-roles-y-perfiles)
3. [Gestión de Períodos Académicos](#3-gestión-de-períodos-académicos)
4. [Gestión de Facultades, Escuelas y Departamentos](#4-gestión-de-facultades-escuelas-y-departamentos)
5. [Gestión de Planes de Estudio / Currículas](#5-gestión-de-planes-de-estudio--currículas)
6. [Gestión de Docentes](#6-gestión-de-docentes)
7. [Gestión de Cursos](#7-gestión-de-cursos)
8. [Gestión de Ambientes](#8-gestión-de-ambientes)
9. [Oferta Académica por Período](#9-oferta-académica-por-período)
10. [Asignación de Carga Lectiva a Docentes](#10-asignación-de-carga-lectiva-a-docentes)
11. [Declaración de Carga Horaria (Escuela/Secretaría)](#11-declaración-de-carga-horaria-escuela-secretaría)
12. [Declaración de Carga No Lectiva (Docente)](#12-declaración-de-carga-no-lectiva-docente)
13. [Carga Lectiva Adicional (CLAD)](#13-carga-lectiva-adicional-clad)
14. [Disponibilidad Horaria del Docente](#14-disponibilidad-horaria-del-docente)
15. [Gestión de Horarios Semanales](#15-gestión-de-horarios-semanales)
16. [Sistema de Ventanas de Atención](#16-sistema-de-ventanas-de-atención)
17. [Preasignaciones](#17-preasignaciones)
18. [Configuración del Sistema](#18-configuración-del-sistema)
19. [Reportes Operacionales (Formatos Oficiales)](#19-reportes-operacionales-formatos-oficiales)
20. [Reportes de Gestión](#20-reportes-de-gestión)
21. [Dashboard Administrativo](#21-dashboard-administrativo)
22. [Análisis y Analítica](#22-análisis-y-analítica)
23. [Notificaciones](#23-notificaciones)
24. [Auditoría y Trazabilidad](#24-auditoría-y-trazabilidad)
25. [Chatbot / Asistente IA](#25-chatbot--asistente-ia)
26. [Importación de Datos](#26-importación-de-datos)
27. [Documentación y Ayuda](#27-documentación-y-ayuda)
28. [Matriz de Acceso por Rol](#28-matriz-de-acceso-por-rol)

---

## Roles del Sistema

| # | Rol | Descripción |
|---|-----|-------------|
| 1 | **Administrador del Sistema** | Configuración global, usuarios, parámetros, mantenimiento |
| 2 | **Coordinador Académico** | Planificación académica, oferta, asignación, supervisión general |
| 3 | **Director de Escuela** | Supervisión de su escuela, aprobación de declaraciones y horarios |
| 4 | **Director de Departamento** | Supervisión de su departamento, validación de carga docente |
| 5 | **Decano** | Visión global de la facultad, aprobaciones finales, reportes ejecutivos |
| 6 | **Secretaria de Departamento/Escuela** | Operación diaria: asignación, declaración, trámites |
| 7 | **Operador de Horarios** | Gestión de ventanas, asignación de horarios, conflictos |
| 8 | **Docente** | Consulta de horarios, declaración de carga, disponibilidad, CLAD |

---

## 1. Autenticación y Seguridad

### 1.1 Funcionalidades esperadas

- Login con email institucional y contraseña.
- JWT con expiración configurable.
- Logout (invalidación de token).
- Cambio de contraseña obligatorio en primer ingreso (`debe_cambiar_password`).
- Recuperación de contraseña por correo electrónico.
- Bloqueo de cuenta tras N intentos fallidos.
- Verificación de token expirado en backend (`GET /auth/verify`).
- Rate limiting en endpoints de autenticación.
- Sesiones concurrentes (允不允许 múltiples sesiones activas).
- Registro de intentos de acceso (log de seguridad).

### 1.2 Acceso por rol

| Puede hacer | Roles |
|------------|-------|
| Login | Todos |
| Cambiar contraseña propia | Todos |
| Forzar cambio de contraseña a otro usuario | Administrador |
| Ver log de intentos de acceso | Administrador |
| Bloquear/desbloquear usuarios | Administrador |

### 1.3 Qué debo probar

- [ ] Login con credenciales correctas → redirige al dashboard.
- [ ] Login con credenciales incorrectas → muestra error, no revela si el usuario existe.
- [ ] Primer ingreso → se obliga a cambiar contraseña antes de continuar.
- [ ] Token expirado → se redirige al login con mensaje informativo.
- [ ] Acceso a ruta protegida sin token → redirige al login.
- [ ] Acceso a módulo no autorizado → muestra 403 o redirige.
- [ ] Rate limiting → tras N intentos fallidos, se bloquea temporalmente.
- [ ] Logout → el token deja de funcionar.
- [ ] Cambio de contraseña → la nueva contraseña queda activa inmediatamente.

---

## 2. Gestión de Usuarios, Roles y Perfiles

### 2.1 Funcionalidades esperadas

**Altas:**
- Crear usuario con: nombre, email institucional, DNI, rol, estado (activo/inactivo).
- Asociar usuario a docente (si aplica).
- Asignar uno o más roles.
- Establecer contraseña inicial y marcar `debe_cambiar_password: true`.
- Asignar alcance (facultad, escuela, departamento) según el rol.

**Bajas:**
- Desactivar usuario (soft delete) sin eliminar registros históricos.
- Reactivar usuario desactivado.

**Modificaciones:**
- Editar nombre, email, DNI, roles, alcance.
- Resetear contraseña de otro usuario.
- Cambiar estado activo/inactivo.

**Consultas:**
- Listar usuarios con filtros: rol, estado, facultad, departamento, búsqueda por nombre/email/DNI.
- Ver detalle de un usuario: datos personales, rol, alcance, último acceso, historial de cambios.

**Perfiles:**
- Cada usuario puede ver y editar su propio perfil (nombre, teléfono, dirección).
- Subir foto de perfil (opcional).
- Ver historial de actividad propia.

### 2.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Listar usuarios | CRUD | Ver | Ver (su escuela) | Ver (su dpto) | Ver (su facultad) | - | - | - |
| Crear usuario | Sí | No | No | No | No | No | No | No |
| Editar usuario | Sí | No | No | No | No | No | No | No |
| Desactivar usuario | Sí | No | No | No | No | No | No | No |
| Resetear contraseña | Sí | No | No | No | No | No | No | No |
| Ver su perfil | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Editar su perfil | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |

### 2.3 Qué debo probar

- [ ] Administrador puede crear un nuevo usuario con rol válido.
- [ ] Administrador puede asignar alcance (facultad/departamento) al usuario.
- [ ] Al desactivar un usuario, este no puede hacer login.
- [ ] Al reactivar un usuario, puede hacer login nuevamente.
- [ ] Un usuario no administrador NO puede acceder al módulo de usuarios.
- [ ] Un director de escuela solo ve usuarios de su escuela.
- [ ] Un docente solo ve su propio perfil.
- [ ] El cambio de perfil propio se refleja inmediatamente.
- [ ] No se pueden crear dos usuarios con el mismo email.
- [ ] No se pueden crear dos usuarios con el mismo DNI.

---

## 3. Gestión de Períodos Académicos

### 3.1 Funcionalidades esperadas

**Altas:**
- Crear período con: código (ej. `2026-I`), nombre, fecha inicio, fecha fin, estado.
- Estados posibles: `PLANIFICACION`, `ASIGNACION_HORARIOS`, `EN_CURSO`, `FINALIZADO`.
- Solo un período puede estar activo (`is_active: true`) a la vez.

**Modificaciones:**
- Editar nombre, fechas, estado del período.
- Activar/desactivar período.
- Cerrar período (cambiar a `FINALIZADO`).

**Consultas:**
- Listar todos los períodos con estado y fechas.
- Ver detalle de período: cursos ofertados, asignaciones, declaraciones vinculadas.
- Filtrar por estado.

**Reglas de negocio:**
- No se puede eliminar un período que tenga asignaciones o declaraciones asociadas.
- Al cambiar estado a `FINALIZADO`, se bloquean ediciones en módulos dependientes.
- El período activo determina la oferta académica visible.

### 3.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Listar períodos | CRUD | CRUD | Ver | Ver | Ver | Ver | Ver | Ver |
| Crear período | Sí | Sí | No | No | No | No | No | No |
| Editar período | Sí | Sí | No | No | No | No | No | No |
| Activar/desactivar | Sí | Sí | No | No | No | No | No | No |
| Cerrar período | Sí | Sí | No | No | No | No | No | No |

### 3.3 Qué debo probar

- [ ] Crear un período nuevo con fechas válidas.
- [ ] Activar un período desactiva el anterior.
- [ ] No se puede crear un período con fechas superpuestas a otro activo.
- [ ] Un período `FINALIZADO` bloquea ediciones en asignaciones y horarios.
- [ ] Solo el coordinador o admin pueden crear/editar períodos.
- [ ] El docente solo puede ver períodos, no modificarlos.

---

## 4. Gestión de Facultades, Escuelas y Departamentos

### 4.1 Funcionalidades esperadas

**Facultades:**
- CRUD completo: código, nombre, decano, estado.
- Asociar escuelas a la facultad.

**Escuelas:**
- CRUD completo: código, nombre, facultad padre, director, estado.
- Asociar departamentos a la escuela.

**Departamentos:**
- CRUD completo: código, nombre, escuela padre, director, estado.

**Estructura jerárquica:**
- Facultad → Escuela → Departamento.
- Cada nivel tiene un responsable (Decano, Director de Escuela, Director de Departamento).

**Consultas:**
- Árbol jerárquico completo de la organización.
- Conteo de docentes por departamento, escuela, facultad.
- Conteo de cursos por departamento.

### 4.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Docente |
|--------|-------|--------|--------------|-----------|--------|---------|
| CRUD Facultades | Sí | Ver | Ver (su facultad) | Ver | Ver (su facultad) | Ver |
| CRUD Escuelas | Sí | Ver | CRUD (su facultad) | Ver | Ver (su facultad) | Ver |
| CRUD Departamentos | Sí | Ver | Ver (su escuela) | CRUD (su escuela) | Ver (su facultad) | Ver |

### 4.3 Qué debo probar

- [ ] Crear una facultad nueva y asociarle escuelas.
- [ ] Crear una escuela dentro de una facultad.
- [ ] Crear un departamento dentro de una escuela.
- [ ] Asignar un director de departamento y que este pueda acceder a su departamento.
- [ ] Asignar un director de escuela y que este pueda acceder a su escuela.
- [ ] Un docente solo puede ver la estructura, no modificarla.

---

## 5. Gestión de Planes de Estudio / Currículas

### 5.1 Funcionalidades esperadas

**Planes de Estudio:**
- CRUD: código, nombre, año de aprobación, estado (`ACTIVO`, `DESACTUALIZADO`, `ELIMINADO`).
- Asociar a escuela profesional.
- Solo un plan puede estar activo por escuela a la vez.

**Cursos del Plan:**
- Agregar cursos al plan: código, nombre, ciclo (I-IX), tipo (`ESPECIALIDAD`, `OBLIGATORIO_GENERAL`, `OBLIGATORIO_PROFESIONAL`, `ELECTIVO`), horas teoría, horas práctica, horas laboratorio, prerrequisitos.
- Editar curso del plan.
- Eliminar curso del plan (solo si no tiene asignaciones activas).
- Importar plan desde archivo (Excel/CSV).
- Exportar plan a Excel/PDF.

**Reglas de negocio:**
- Un curso no puede tener horas negativas.
- Las horas totales deben ser coherentes (teoría + práctica + laboratorio > 0).
- Un curso solo puede ser prerrequisito de otro si pertenece al mismo plan.
- No se puede eliminar un plan que tenga horarios asignados en un período activo.

### 5.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| CRUD Planes | Sí | Sí | Ver/Editar (su escuela) | Ver | Ver | Ver | Ver |
| CRUD Cursos del Plan | Sí | Sí | Sí (su escuela) | Ver | Ver | Ver | Ver |
| Importar plan | Sí | Sí | No | No | No | No | No |
| Exportar plan | Sí | Sí | Sí (su escuela) | Ver | Ver | Ver | Ver |

### 5.3 Qué debo probar

- [ ] Crear un plan de estudios nuevo con 3+ ciclos.
- [ ] Agregar cursos a un ciclo con horas teoría/práctica/laboratorio.
- [ ] Establecer prerrequisitos entre cursos del mismo plan.
- [ ] Intentar agregar un curso con horas negativas → error de validación.
- [ ] Importar un plan desde archivo Excel → se crean los cursos correctamente.
- [ ] Exportar el plan a PDF → documento completo y legible.
- [ ] Un director de escuela solo ve planes de su escuela.
- [ ] Un docente solo puede consultar, no modificar.

---

## 6. Gestión de Docentes

### 6.1 Funcionalidades esperadas

**Altas:**
- Crear docente con: IBM/N° documento, nombre completo, DNI (unique, nullable), email, categoría (`PRINCIPAL`, `ASOCIADO`, `AUXILIAR`, `SIN_CATEGORIA`, `JEFE_PRACTICA`), tipo (`ORDINARIO`, `CONTRATADO`, `JEFE_PRACTICA_CONTRATADO`), modalidad (`DEDICACION_EXCLUSIVA`, `TIEMPO_COMPLETO_40`, `TIEMPO_PARCIAL_20/12/10/8`), departamento, escuela, facultad.
- Vincular automáticamente a un usuario del sistema.
- Establecer horas máximas según modalidad.

**Bajas:**
- Desactivar docente (no eliminar si tiene historial).

**Modificaciones:**
- Editar datos personales, categoría, tipo, modalidad, departamento.
- Cambiar modalidad → recalcular horas máximas permitidas.

**Consultas:**
- Listar docentes con filtros: departamento, escuela, categoría, tipo, modalidad, estado, búsqueda por nombre/DNI/IBM.
- Ver detalle: datos personales, carga asignada, horarios, declaraciones, disponibilidad.
- Ver carga docente actual: horas asignadas vs. horas máximas por modalidad.

**Reglas de negocio:**
- Un docente de `DEDICACION_EXCLUSIVA` tiene carga máxima mayor que uno de `TIEMPO_PARCIAL_8`.
- No se puede asignar más horas de las permitidas por la modalidad.
- Un docente solo puede pertenecer a un departamento como principal.
- La categoría y tipo determinan si puede ser jefe de práctica.

### 6.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| CRUD Docentes | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver (su facultad) | Ver | - |
| Ver detalle docente | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí (el propio) |
| Cambiar modalidad | Sí | Sí | No | No | No | No | No |
| Reactivar docente | Sí | Sí | No | No | No | No | No |
| Ver carga docente | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí (el propio) |

### 6.3 Qué debo probar

- [ ] Crear un docente con categoría PRINCIPAL y modalidad DEDICACION_EXCLUSIVA.
- [ ] Crear un docente con categoría AUXILIAR y modalidad TIEMPO_PARCIAL_8.
- [ ] Verificar que las horas máximas se calculan correctamente según modalidad.
- [ ] Asignar más horas de las permitidas → el sistema debe rechazar.
- [ ] Cambiar modalidad de TIEMPO_PARCIAL a TIEMPO_COMPLETO → horas máximas se actualizan.
- [ ] Un docente solo ve su propio detalle, no el de otros.
- [ ] Un director de departamento solo ve docentes de su departamento.
- [ ] Desactivar un docente → no aparece en listados para nuevas asignaciones.

---

## 7. Gestión de Cursos

### 7.1 Funcionalidades esperadas

**Altas:**
- Crear curso con: código, nombre, tipo (`ESPECIALIDAD`, `OBLIGATORIO_GENERAL`, `OBLIGATORIO_PROFESIONAL`, `ELECTIVO`), ciclo, horas semanales, plan de estudio al que pertenece.
- Asociar ambientes compatibles (aula, laboratorio, taller).
- Asociar grupos (sección A, B, C, etc.).

**Modificaciones:**
- Editar datos del curso.
- Asociar/desasociar ambientes.
- Gestionar grupos: crear, editar, eliminar grupo.

**Consultas:**
- Listar cursos con filtros: ciclo, tipo, plan de estudio, departamento, búsqueda por nombre/código.
- Ver detalle: info general, ambientes asignados, grupos activos, horarios asignados.
- Ver cuántos docentes imparten el curso.

**Reglas de negocio:**
- Un curso de LABORATORIO solo puede asignarse a ambientes tipo LABORATORIO.
- Un curso de ESPECIALIDAD puede requerir ambiente específico.
- Los grupos determinan la capacidad de alumnos atendidos.
- No se puede eliminar un curso que tenga horarios asignados en período activo.

### 7.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| CRUD Cursos | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver | Ver | Ver |
| Asociar ambientes | Sí | Sí | No | No | No | No | No |
| Gestionar grupos | Sí | Sí | No | No | No | No | No |
| Ver detalle | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Ver (los propios) |

### 7.3 Qué debo probar

- [ ] Crear un curso obligatorio general con horas de teoría y práctica.
- [ ] Asociar ambientes tipo LABORATORIO a un curso de laboratorio.
- [ ] Crear grupos (A, B) para un curso con alta demanda.
- [ ] Verificar que un curso de LABORATORIO no se pueda asignar a un AULA.
- [ ] Buscar un curso por nombre o código → aparece en resultados.
- [ ] Un docente solo ve los cursos que imparte.

---

## 8. Gestión de Ambientes

### 8.1 Funcionalidades esperadas

**Altas:**
- Crear ambiente con: código, nombre, tipo (`AULA`, `LABORATORIO`, `AUDITORIO`, `TALLER`, `SEMINARIO`, `SALA_COMPUTACION`), capacidad, estado (`ACTIVO`, `MANTENIMIENTO`, `RESERVADO`, `INACTIVO`), sede, piso.
- Asociar equipamiento disponible.

**Bajas:**
- Desactivar ambiente (no eliminar si tiene historial de uso).

**Modificaciones:**
- Editar datos, cambiar estado, actualizar capacidad.

**Consultas:**
- Listar ambientes con filtros: tipo, estado, sede, capacidad mínima, búsqueda por código/nombre.
- Ver detalle: datos, equipamiento, horarios asignados, disponibilidad semanal.
- Ver conflictos de ambientes (doble asignación en mismo horario).

**Reglas de negocio:**
- No se puede asignar un curso a un ambiente `INACTIVO` o `MANTENIMIENTO`.
- La capacidad del ambiente debe ser ≥ número de alumnos del grupo.
- Un ambiente en estado `RESERVADO` no acepta nuevas asignaciones.
- Un LABORATORIO no puede usarse para un curso de teoría puro.

### 8.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| CRUD Ambientes | Sí | Sí | Ver | Ver | Ver | Ver | Ver | Ver |
| Cambiar estado | Sí | Sí | No | No | No | No | No | No |
| Ver disponibilidad | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver conflictos | Sí | Sí | Sí | Sí | Sí | Sí | Sí | - |

### 8.3 Qué debo probar

- [ ] Crear un ambiente tipo LABORATORIO con capacidad 30.
- [ ] Cambiar estado a MANTENIMIENTO → no aparece para nuevas asignaciones.
- [ ] Intentar asignar un curso a un ambiente INACTIVO → error.
- [ ] Verificar que la capacidad del ambiente se respeta al asignar grupo.
- [ ] Ver disponibilidad semanal de un ambiente → muestra horarios ocupados.
- [ ] Detectar conflicto de ambiente → dos cursos en mismo horario/lugar.

---

## 9. Oferta Académica por Período

### 9.1 Funcionalidades esperadas

**Gestión de oferta:**
- Generar oferta a partir del plan de estudios para un período específico.
- Editar oferta: agregar/quitar cursos, modificar ciclos ofrecidos.
- Publicar oferta (hacer visible a docentes y escuelas).
- Cerrar oferta (bloquear ediciones).

**Contenido de la oferta:**
- Curso, ciclo, tipo, horas semanales, número de grupos estimados, ambientes necesarios.
- Prerrequisitos activos.
- Departamento responsable.
- Estado de cada ítem de oferta.

**Consultas:**
- Ver oferta completa del período.
- Filtrar por ciclo, departamento, tipo de curso.
- Ver cuántos grupos se necesitan por curso.
- Ver ambientes requeridos vs. disponibles.

**Reglas de negocio:**
- Solo se puede generar oferta para un período en estado `PLANIFICACION`.
- Los cursos deben existir en un plan de estudios activo.
- La oferta determina qué puede asignarse en el módulo de asignación lectiva.
- No se puede ofrecer un curso que no esté en el plan vigente de la escuela.

### 9.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| Generar oferta | Sí | Sí | No | No | No | No | No |
| Editar oferta | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver | Ver | Ver |
| Publicar oferta | Sí | Sí | No | No | No | No | No |
| Ver oferta | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí |

### 9.3 Qué debo probar

- [ ] Generar oferta a partir del plan de estudios 2018 para el período 2026-I.
- [ ] Verificar que solo aparecen cursos de planes activos.
- [ ] Editar oferta: agregar un grupo adicional a un curso.
- [ ] Publicar oferta → queda visible para todos los roles pertinentes.
- [ ] Intentar generar oferta para un período `EN_CURSO` → error.
- [ ] Un director de escuela solo ve la oferta de su escuela.

---

## 10. Asignación de Carga Lectiva a Docentes

### 10.1 Funcionalidades esperadas

**Asignación individual:**
- Seleccionar docente → ver horas asignadas vs. máximo permitido.
- Seleccionar curso de la oferta del período.
- Seleccionar tipo de clase (`TEORIA`, `PRACTICA`, `LABORATORIO`).
- Seleccionar grupo.
- El sistema valida automáticamente:
  - No exceder horas máximas del docente.
  - No generar cruce de horario con otra asignación del mismo docente.
  - Disponibilidad del docente en el horario propuesto.
  - Compatible con la modalidad del docente.

**Asignación masiva:**
- Asignar un mismo curso a múltiples docentes de golpe.
- Asignar múltiples cursos a un docente de golpe.
- Asignación automática (el sistema sugiere asignaciones óptimas).

**Gestión de estados:**
- `PENDIENTE` → `CONFIRMADO` → `RECHAZADO`.
- Confirmación individual o masiva.
- Rechazo con motivo obligatorio.

**Consultas:**
- Ver todas las asignaciones del período.
- Filtrar: docente, curso, departamento, escuela, estado, ciclo.
- Ver carga asignada por docente (horas teoría, práctica, laboratorio, total).
- Detectar conflictos de asignación.

**Reglas de negocio:**
- Un docente `TIEMPO_PARCIAL_8` no puede exceder 8 horas/semana.
- Un docente `DEDICACION_EXCLUSIVA` tiene mayor carga (hasta 40h).
- Un docente no puede tener dos clases en el mismo horario.
- La asignación debe respetar la disponibilidad declarada por el docente.
- Un docente contratado puede tener menor prioridad que uno nombrado.
- No se puede asignar un curso que no esté en la oferta del período.

### 10.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| Asignar carga | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver | Sí (su dpto) | - |
| Confirmar/rechazar | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No | No |
| Ver asignaciones | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí (las propias) |
| Asignación masiva | Sí | Sí | No | No | No | No | No |
| Asignación automática | Sí | Sí | No | No | No | No | No |

### 10.3 Qué debo probar

- [ ] Asignar un curso de TEORÍA a un docente con tiempo completo → acepta.
- [ ] Intentar exceder las horas máximas del docente → rechaza.
- [ ] Asignar dos cursos al mismo docente en el mismo horario → detecta conflicto.
- [ ] Asignar un curso de LABORATORIO → solo sugiere ambientes tipo laboratorio.
- [ ] Confirmar una asignación → cambia estado a CONFIRMADO.
- [ ] Rechazar una asignación con motivo → cambia estado a RECHAZADO.
- [ ] Un docente solo ve sus propias asignaciones.
- [ ] Un secretario solo puede asignar docentes de su departamento.
- [ ] Asignación masiva: seleccionar 3 docentes y asignarles el mismo curso → crea 3 registros.

---

## 11. Declaración de Carga Horaria (Escuela/Secretaría)

### 11.1 Funcionalidades esperadas

**Creación:**
- Secretaria de escuela crea declaración para un docente y período.
- Agrega ítems: curso, tipo de clase, horas semanales, grupo, observaciones.
- El sistema valida que el total de horas no exceda la modalidad del docente.

**Flujo de aprobación:**
- `BORRADOR` → la secretaria puede editar libremente.
- `CONFIRMADO` → la secretaria envía a revisión del departamento.
- `CERRADO` → el departamento o facultad ha revisado y cerrado.
- Estados intermedios según flujo: `ENVIADO_DPTO`, `OBSERVADO_DPTO`, `VALIDADO_DPTO`, `OBSERVADO_FACULTAD`, `VALIDADO_FACULTAD`.

**Observaciones:**
- El director de departamento puede agregar observaciones a ítems específicos.
- La secretaria puede responder a observaciones y corregir.
- Cada observación queda registrada con autor y fecha.

**Consultas:**
- Ver todas las declaraciones del período.
- Filtrar: docente, departamento, escuela, estado.
- Ver resumen: total horas teoría, práctica, laboratorio, general.
- Comparar declaración vs. asignación real.
- Exportar declaración a PDF/Excel.

**Reglas de negocio:**
- Una declaración en `BORRADOR` puede editarse libremente.
- Una declaración `CONFIRMADO` solo puede ser observada, no editada directamente.
- El total de horas debe ser ≤ horas máximas del docente por modalidad.
- No se puede declarar un curso que no exista en el plan de estudios.
- Las observaciones deben ser resueltas antes de la validación final.

### 11.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| Crear declaración | Sí | Sí | No | No | No | Sí (su escuela) | No |
| Editar declaración | Sí | Sí | No | No | No | Sí (BORRADOR) | No |
| Confirmar/enviar | Sí | Sí | No | No | No | Sí (su escuela) | No |
| Observar declaración | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No | No |
| Validar/cerrar | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No | No |
| Ver declaración | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí (su escuela) | Sí (la propia) |
| Exportar PDF/Excel | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí (la propia) |

### 11.3 Qué debo probar

- [ ] Secretaria crea una declaración en BORRADOR → puede editar libremente.
- [ ] Secretaria confirma → pasa a CONFIRMADO, no puede editar más.
- [ ] Director de departamento observa un ítem → queda registrado con autor y fecha.
- [ ] Secretaria responde observación y corrige → vuelve a enviarse.
- [ ] Director de departamento valida → pasa a VALIDADO_DPTO.
- [ ] Intentar declarar más horas de las permitidas por modalidad → error.
- [ ] Decano puede ver declaraciones de toda su facultad.
- [ ] Docente solo ve su propia declaración.
- [ ] Exportar declaración a PDF → documento completo con todos los ítems.

---

## 12. Declaración de Carga No Lectiva (Docente)

### 12.1 Funcionalidades esperadas

**Creación por el docente:**
- El docente declara actividades no lectivas: investigación, extensión, administrativas, tutorías, etc.
- Cada ítem tiene: actividad, horas semanales, período, descripción.
- El sistema valida que el total de horas no lectivas + lectivas ≤ modalidad.

**Flujo:**
- `BORRADOR` → el docente puede editar.
- `CONFIRMADO` → el docente envía a revisión.
- El departamento revisa y aprueba/rechaza.

**Consultas:**
- Ver declaraciones propias del período.
- Ver historial de declaraciones.
- El departamento ve todas las declaraciones de sus docentes.

**Reglas de negocio:**
- Las horas no lectivas se descuentan del total permitido por modalidad.
- Un docente `TIEMPO_PARCIAL_8` con 4h lectivas solo puede declarar 4h no lectivas.
- Las actividades no lectivas deben estar predefinidas (catálogo).

### 12.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|------------|---------|
| Crear declaración | Sí | No | No | No | No | Sí (la propia) |
| Editar declaración | Sí | No | No | No | No | Sí (BORRADOR) |
| Confirmar/enviar | Sí | No | No | No | No | Sí (la propia) |
| Revisar/aprobar | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Ver | No |
| Ver declaraciones | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Ver | Sí (las propias) |

### 12.3 Qué debo probar

- [ ] Docente crea declaración no lectiva en BORRADOR → puede editar.
- [ ] Docente confirma → pasa a CONFIRMADO.
- [ ] Intentar declarar horas no lectivas que excedan el disponible → error.
- [ ] Director de departamento aprueba → queda registrada.
- [ ] Docente ve el historial de sus declaraciones no lectivas.
- [ ] Un docente no puede ver las declaraciones de otro docente.

---

## 13. Carga Lectiva Adicional (CLAD)

### 13.1 Funcionalidades esperadas

**Solicitud:**
- Docente solicita carga adicional (CLAD) para un período.
- Indica: curso, tipo de clase, horas, institución/dependencia, tipo de dependencia (`POSGRADO`, `SEGUNDA_ESPECIALIDAD`, `CEPUNT`, `FILIAL`, `CENTRO_PRODUCCION`, `OTRO`).
- Adjunta justificación/documento de respaldo.

**Flujo de aprobación (multi-nivel):**
- `BORRADOR` → docente edita.
- `ENVIADO_DPTO` → el departamento revisa.
- `OBSERVADO_DPTO` → el departamento observa, docente corrige.
- `VALIDADO_DPTO` → el departamento aprueba.
- `OBSERVADO_DEPENDENCIA` → la dependencia (facultad) observa.
- `VALIDADO_DEPENDENCIA` → la dependencia aprueba.
- `APROBADO_FINAL` → aprobación final, se registra como carga adicional.

**Consultas:**
- Ver solicitudes propias del período.
- Ver solicitudes pendientes de revisión (departamento/facultad).
- Ver historial completo de solicitudes.
- Filtrar: docente, dependencia, estado, período.

**Reglas de negocio:**
- El total de horas CLAD + lectivas normales no debe exceder un porcentaje configurable del máximo.
- Un docente solo puede tener una solicitud activa por dependencia.
- La aprobación del departamento es requisito previo a la aprobación de la dependencia.
- Cada cambio de estado queda registrado con autor y timestamp.

### 13.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|---------|
| Crear solicitud | Sí | No | No | No | No | No | Sí (la propia) |
| Editar solicitud | Sí | No | No | No | No | No | Sí (BORRADOR) |
| Revisar/departamento | Sí | Sí | No | Sí (su dpto) | No | No | No |
| Revisar/facultad | Sí | Sí | Sí (su escuela) | No | Sí (su facultad) | No | No |
| Ver solicitudes | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Ver | Sí (las propias) |

### 13.3 Qué debo probar

- [ ] Docente crea solicitud CLAD en BORRADOR.
- [ ] Docente envía → pasa a ENVIADO_DPTO.
- [ ] Director de departamento aprueba → VALIDADO_DPTO.
- [ ] Decano/facultad aprueba → APROBADO_FINAL.
- [ ] Director de departamento observa → OBSERVADO_DPTO, docente puede corregir.
- [ ] Intentar solicitar CLAD que exceda el límite → error.
- [ ] Verificar que cada cambio de estado queda registrado con autor.
- [ ] Docente solo ve sus propias solicitudes.

---

## 14. Disponibilidad Horaria del Docente

### 14.1 Funcionalidades esperadas

**Gestión por el docente:**
- Definir disponibilidad semanal: días y franjas horarias en las que puede impartir clases.
- Marcar restricciones: no disponible los lunes por la mañana, solo disponible hasta las 14:00, etc.
- Guardar como "plantilla" para períodos futuros.

**Gestión por el coordinador:**
- Ver disponibilidad de todos los docentes del departamento.
- Editar disponibilidad de un docente (con justificación).
- Bloquear franjas institucionales (feriados, días no laborables).

**Consultas:**
- Ver grilla semanal de disponibilidad por docente.
- Filtrar por departamento, escuela, modalidad.
- Ver cuántos docentes están disponibles en cada franja.
- Detectar franjas con baja disponibilidad (riesgo de conflicto).

**Reglas de negocio:**
- La disponibilidad determina en qué horarios se puede asignar carga lectiva.
- Un docente `TIEMPO_PARCIAL_8` tiene menos franjas disponibles que uno de `DEDICACION_EXCLUSIVA`.
- Las franjas institucionales bloquean la disponibilidad de todos los docentes.
- La disponibilidad se hereda de períodos anteriores si no se modifica.

### 14.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|------------|---------|
| Ver disponibilidad | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí | Sí (la propia) |
| Editar disponibilidad | Sí | Sí | No | Sí (su dpto) | No | Sí (la propia) |
| Bloquear franjas institucionales | Sí | Sí | No | No | No | No |
| Ver estadísticas de disponibilidad | Sí | Sí | Sí (su escuela) | Sí (su dpto) | No | No |

### 14.3 Qué debo probar

- [ ] Docente marca disponibilidad lunes a viernes de 8:00 a 12:00.
- [ ] Coordinador ve la disponibilidad de todos los docentes de un departamento.
- [ ] Intentar asignar carga en una franja donde el docente NO está disponible → el sistema advierte.
- [ ] Bloquear una franja institucional → ningún docente puede ser asignado ahí.
- [ ] Verificar que la disponibilidad se respeta al asignar carga lectiva.

---

## 15. Gestión de Horarios Semanales

### 15.1 Funcionalidades esperadas

**Creación de horarios:**
- Asignar curso + docente + ambiente + día + hora inicio/fin + grupo.
- El sistema valida automáticamente:
  - No cruce de docente (mismo docente, dos cursos en mismo horario).
  - No cruce de ambiente (mismo ambiente, dos cursos en mismo horario).
  - No cruce de grupo (mismo grupo, dos cursos en mismo horario).
  - Disponibilidad del docente.
  - Compatible con tipo de ambiente (laboratorio para cursos de lab).
  - Descanso mínimo entre clases.
  - Respeto de franjas institucionales.
  - No asignar en días no laborables.

**Modificación:**
- Cambiar horario de una asignación existente.
- Mover un curso a otro ambiente.
- Reasignar docente a un curso.
- Intercambiar horarios entre dos cursos.

**Estados del horario:**
- `BORRADOR` → se puede editar libremente.
- `CONFIRMADO` → se han revisado y validado los horarios.
- `PUBLICADO` → visible para docentes y stakeholders.
- `CONFLICTO` → hay conflictos detectados que resolver.
- `CERRADO` → no se pueden hacer cambios.

**Resolución de conflictos:**
- Detectar automáticamente todos los conflictos.
- Clasificar por tipo: `SIN_DOCENTE`, `SIN_AMBIENTE`, `CRUCE_DOCENTE`, `CRUCE_AMBIENTE`, `CRUCE_GRUPO`, `CARGA_INSUFICIENTE`, `CARGA_EXCEDIDA`, `SIN_DISPONIBILIDAD`, `CAPACIDAD_INSUFICIENTE`, `DESCANSO_MINIMO`, `FRANJA_INSTITUCIONAL`, `DIA_NO_LABORABLE`.
- Sugerir soluciones alternativas.
- Resolver conflicto manualmente o automáticamente.

**Consultas:**
- Ver grilla semanal completa (todos los cursos, todos los ambientes).
- Filtrar por: departamento, escuela, ciclo, docente, ambiente, día.
- Ver grilla por docente (horario personal).
- Ver grilla por ambiente (ocupación de cada sala).
- Ver grilla por grupo (horario de un grupo específico).
- Detectar huecos (horarios sin asignar).
- Ver estadísticas: % de ocupación de ambientes, % de carga docente.

**Reglas de negocio:**
- Un docente no puede tener dos clases simultáneas.
- Un ambiente no puede tener dos cursos simultáneos.
- Un grupo no puede tener dos cursos simultáneos.
- El descanso mínimo entre clases es configurable.
- No se puede asignar en franja de almuerzo (configurable).
- Las horas máximas diarias del docente son configurables.
- Las horas máximas semanales del docente dependen de su modalidad.

### 15.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Crear horario | Sí | Sí | No | No | No | No | Sí | No |
| Editar horario | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver | No | Sí | No |
| Confirmar/publicar | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No | No | No |
| Resolver conflictos | Sí | Sí | Sí (su escuela) | Sí (su dpto) | No | No | Sí | No |
| Ver grilla completa | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | Sí | No |
| Ver mi horario | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver grilla por ambiente | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Detectar conflictos | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí | No | Sí | No |

### 15.3 Qué debo probar

- [ ] Crear un horario: curso + docente + ambiente + día + hora → se registra.
- [ ] Intentar asignar el mismo docente a dos cursos en mismo horario → detecta conflicto.
- [ ] Intentar asignar el mismo ambiente a dos cursos en mismo horario → detecta conflicto.
- [ ] Resolver un conflicto manualmente → conflicto desaparece.
- [ ] Publicar horarios → el docente puede ver su horario.
- [ ] Ver grilla por ambiente → muestra ocupación de cada sala por día.
- [ ] Verificar que no se asigna en día no laborable.
- [ ] Verificar que el descanso mínimo se respeta.
- [ ] Verificar que las horas máximas diarias del docente se respetan.
- [ ] Un docente solo ve su propio horario, no el de otros.

---

## 16. Sistema de Ventanas de Atención

### 16.1 Funcionalidades esperadas

**Gestión de campañas:**
- Crear campaña de ventanas con: nombre, período, fechas de inicio/fin, estado (`BORRADOR`, `GENERADO`, `PUBLICADO`, `EN_CURSO`, `CERRADO`, `CANCELADO`).
- Configurar categorías de ventana: `DECLARACION`, `SUBSANACION`, `CAMBIO`, `CONTINGENCIA`.
- Generar ventanas automáticas según reglas de prioridad.

**Gestión de ventanas individuales:**
- Crear ventana: docente, fecha/hora inicio, fecha/hora fin, categoría, estado.
- Asignar turnos a docentes dentro de una ventana.
- Estado de cada turno: `EN_COLA`, `ATENDIDO`, `NO_PRESENTADO`, `CANCELADO`.

**Cola de atención:**
- Vista en tiempo real de la cola (WebSocket).
- Operador puede: llamar al siguiente, marcar como atendido, marcar como no presentado.
- Tiempo de espera estimado.
- Notificación al docente cuando es su turno.

**Reglas de negocio:**
- Un docente solo puede tener un turno activo por campaña.
- La prioridad de turnos se determina por reglas configurables (categoría docente, modalidad, etc.).
- Las ventanas tienen duración configurable.
- Un docente que no se presente pierde su turno y debe重新tomar uno.

### 16.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Operador | Docente |
|--------|-------|--------|--------------|-----------|----------|---------|
| CRUD Campañas | Sí | Sí | No | No | No | No |
| Generar ventanas | Sí | Sí | No | No | No | No |
| Publicar campaña | Sí | Sí | No | No | No | No |
| Gestionar cola | Sí | Sí | No | No | Sí | No |
| Tomar turno | Sí | No | No | No | No | Sí |
| Ver mi turno | Sí | No | No | No | No | Sí |
| Ver cola en tiempo real | Sí | Sí | No | No | Sí | Sí (su turno) |

### 16.3 Qué debo probar

- [ ] Coordinador crea campaña de ventanas para el período.
- [ ] Se generan automáticamente las ventanas según reglas de prioridad.
- [ ] Docente toma un turno → aparece en la cola.
- [ ] Operador llama al siguiente → el docente recibe notificación.
- [ ] Operador marca como atendido → turno finaliza.
- [ ] Un docente no puede tomar dos turnos en la misma campaña.
- [ ] La cola se actualiza en tiempo real (WebSocket).
- [ ] Un docente que no se presenta → su turno se marca como NO_PRESENTADO.

---

## 17. Preasignaciones

### 17.1 Funcionalidades esperadas

**Creación:**
- Coordinador crea preasignaciones: docente + curso + período.
- Las preasignaciones son intenciones, no asignaciones finales.
- Permiten planificar antes de la asignación definitiva.

**Gestión:**
- Editar preasignación.
- Eliminar preasignación.
- Convertir preasignación en asignación definitiva.
- Rechazar preasignación con motivo.

**Consultas:**
- Ver preasignaciones del período.
- Filtrar: docente, curso, departamento, estado.
- Ver preasignaciones pendientes de conversión.

**Reglas de negocio:**
- Una preasignación no reserva horario ni ambiente.
- La conversión a asignación definitiva pasa por las mismas validaciones que una asignación nueva.
- Las preasignaciones expiran al finalizar el período de planificación.

### 17.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Secretaria | Docente |
|--------|-------|--------|--------------|-----------|------------|---------|
| CRUD Preasignaciones | Sí | Sí | Ver (su escuela) | Ver (su dpto) | Ver | Ver (las propias) |
| Convertir a asignación | Sí | Sí | No | No | No | No |

### 17.3 Qué debo probar

- [ ] Coordinador crea una preasignación → se registra como pendiente.
- [ ] Coordinador convierte preasignación en asignación → se valida y crea.
- [ ] Intentar convertir una preasignación que genera conflicto → error.
- [ ] Eliminar una preasignación → desaparece del listado.

---

## 18. Configuración del Sistema

### 18.1 Funcionalidades esperadas

**Parámetros generales:**
- Logo de la institución (subir imagen).
- Colores del sistema (personalización visual).
- Nombre de la institución.
- Moneda, idioma por defecto.

**Parámetros de carga:**
- Duración mínima de bloque (ej. 45 min).
- Franja horaria institucional (ej. 12:00-13:00 almuerzo).
- Bloque de almuerzo obligatorio.
- Máximo de horas diarias por docente.
- Máximo de horas semanales por modalidad.
- Descanso mínimo entre clases.

**Restricciones institucionales:**
- CRUD de restricciones: nombre, tipo, valor, descripción, estado.
- Activar/desactivar restricciones.

**Días activos:**
- Configurar qué días de la semana están activos (lunes a viernes).
- Marcar días no laborables (feriados, intermedios).

**Configuración de notificaciones:**
- Activar/desactivar canales (email, in-app, push).
- Plantillas de notificación.

**Parámetros de seed/reset:**
- Cargar datos iniciales del sistema.
- Resetear configuración a valores por defecto.

### 18.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Otros |
|--------|-------|--------|--------------|-----------|--------|-------|
| Ver configuración | Sí | Ver | Ver | Ver | Ver | Ver |
| Editar configuración | Sí | No | No | No | No | No |
| Gestionar restricciones | Sí | No | No | No | No | No |
| Gestionar días activos | Sí | No | No | No | No | No |
| Ejecutar seed/reset | Sí | No | No | No | No | No |

### 18.3 Qué debo probar

- [ ] Administrador cambia el logo → se refleja en toda la aplicación.
- [ ] Administrador modifica horas máximas diarias → se aplica en asignaciones.
- [ ] Administrador marca un día como no laborable → no se asignan clases ese día.
- [ ] Solo el administrador puede acceder a configuración.
- [ ] Un coordinador intenta acceder → denegado.

---

## 19. Reportes Operacionales (Formatos Oficiales)

### 19.1 Funcionalidades esperadas

**Reportes por docente:**
- Horario semanal del docente (PDF).
- Carga lectiva asignada (PDF/Excel).
- Declaración de carga horaria (PDF oficial).
- Constancia de servicios docentes.

**Reportes por curso:**
- Horario del curso por grupo.
- Lista de alumnos por grupo (si aplica).
- Distribución de horas por curso.

**Reportes por ambiente:**
- Horario de uso del ambiente (PDF/Excel).
- Ocupación por ambiente (ocupados vs. disponibles).
- Mapa de asignación de ambientes.

**Reportes por departamento:**
- Resumen de carga docente del departamento.
- Distribución de horas por tipo de clase.
- Docentes con carga completa vs. parcial.

**Reportes por escuela:**
- Resumen de toda la carga de la escuela.
- Comparativo entre declaraciones y asignaciones reales.
- Estado de declaraciones de todas las escuelas.

**Reportes por período:**
- Resumen general del período.
- Horarios completos (todos los días, todos los ambientes).
- Estadísticas de ocupación.

**Reportes especiales:**
- Formato F01 (carga lectiva oficial).
- Formato F02 (carga no lectiva).
- Formato F03-CAD (carga adicional docente).
- Reporte de conflictos sin resolver.
- Reporte de docentes sin asignación.

### 19.2 Acceso por rol

| Reporte | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Docente |
|---------|-------|--------|--------------|-----------|--------|------------|---------|
| Horario propio | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Horario otro docente | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | No |
| Carga docente propio | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Carga docente completo | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | No |
| Formato F01/F02/F03 | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | No |
| Horarios por ambiente | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Resumen período | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | Sí | No |
| Reportes de gestión | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No | No |

### 19.3 Qué debo probar

- [ ] Generar horario del docente en PDF → documento completo y correcto.
- [ ] Generar formato F01 → contiene todos los datos oficiales.
- [ ] Generar reporte de ocupación de ambientes → muestra estadísticas correctas.
- [ ] Un docente solo puede generar sus propios reportes.
- [ ] Un director de departamento solo ve reportes de su departamento.
- [ ] Los PDFs son legibles y tienen formato profesional.
- [ ] Los Excel contienen todos los datos sin truncar.
- [ ] Generar reporte de conflictos → lista todos los conflictos activos.

---

## 20. Reportes de Gestión

### 20.1 Funcionalidades esperadas

**Reporte de gestión de carga:**
- KPIs: total docentes, total cursos, horas asignadas, tasa de ocupación.
- Distribución por departamento/escuela.
- Comparativo entre períodos.

**Reporte de cumplimiento:**
- % de declaraciones completadas vs. total esperadas.
- % de horarios publicados vs. total de oferta.
- % de resolución de conflictos.

**Reporte ejecutivo:**
- Resumen para decano/rectoría.
- Semáforo de estado por facultad/departamento.
- Indicadores clave de gestión.

**Reportes comparativos:**
- Período actual vs. período anterior.
- Tendencias de carga docente.
- Evolución de oferta académica.

### 20.2 Acceso por rol

| Reporte | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano |
|---------|-------|--------|--------------|-----------|--------|
| Gestión de carga | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) |
| Cumplimiento | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) |
| Ejecutivo | Sí | Sí | No | No | Sí (su facultad) |
| Comparativos | Sí | Sí | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) |

### 20.3 Qué debo probar

- [ ] Generar reporte de gestión de carga → muestra KPIs correctos.
- [ ] Generar reporte de cumplimiento → porcentajes coherentes.
- [ ] Generar reporte ejecutivo → semáforo de estado visible.
- [ ] Comparar dos períodos → muestra diferencias.
- [ ] Un decano solo ve reportes de su facultad.

---

## 21. Dashboard Administrativo

### 21.1 Funcionalidades esperadas

**Panel principal:**
- Resumen ejecutivo: total docentes, cursos, ambientes, horas asignadas.
- Gráficos: distribución de carga por departamento, por tipo de clase, por modalidad.
- Indicadores de progreso: % de asignación completada, % de conflictos resueltos.
- Accesos rápidos a módulos frecuentes.

**Tab de Carga Académica:**
- KPIs de carga: total horas asignadas, horas disponibles, tasa de ocupación.
- Funnel de progreso: oferta → asignación → confirmación → publicación.
- Gráfico de barras por departamento.
- Top docentes con mayor carga.
- Docentes sin declarar carga.

**Tab de Horarios:**
- Estado de horarios: borrador, confirmados, publicados.
- Conflictos pendientes.
- Ocupación de ambientes.

**Tab de Declaraciones:**
- Resumen de declaraciones por estado.
- Declaraciones pendientes de revisión.
- Observaciones abiertas.

**Personalización:**
- Cada rol ve widgets relevantes a sus funciones.
- El dashboard se adapta al alcance del usuario (facultad, escuela, departamento).

### 21.2 Acceso por rol

| Widget | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Resumen general | Todo | Todo | Su escuela | Su dpto | Su facultad | Su escuela | Su scope | Propio |
| Carga académica | Todo | Todo | Su escuela | Su dpto | Su facultad | Su escuela | No | Propio |
| Horarios | Todo | Todo | Su escuela | Su dpto | Su facultad | Su scope | Su scope | Propio |
| Declaraciones | Todo | Todo | Su escuela | Su dpto | Su facultad | Su escuela | No | Propio |
| Accesos rápidos | Todos | Todos | Relevantes | Relevantes | Relevantes | Relevantes | Relevantes | Relevantes |

### 21.3 Qué debo probar

- [ ] El dashboard carga correctamente al hacer login.
- [ ] Los KPIs muestran datos coherentes con la BD.
- [ ] Los gráficos se renderizan correctamente.
- [ ] Un docente solo ve su propio resumen.
- [ ] Un director de escuela solo ve datos de su escuela.
- [ ] Los accesos rápidos llevan al módulo correcto.
- [ ] El dashboard se adapta al rol del usuario.

---

## 22. Análisis y Analítica

### 22.1 Funcionalidades esperadas

**Análisis de carga:**
- Distribución de horas por tipo de clase, departamento, escuela.
- Heatmap de carga docente.
- Análisis de tendencias entre períodos.

**Análisis de ocupación:**
- Ocupación de ambientes por día, por hora, por tipo.
- Ambientes subutilizados vs. sobrecargados.
- Sugerencias de reasignación.

**Análisis de conflictos:**
- Tipos de conflicto más frecuentes.
- Tiempo promedio de resolución.
- Docentes/ambientes con más conflictos.

**Análisis predictivo:**
- Proyección de carga para períodos futuros.
- Detección anticipada de problemas de capacidad.

### 22.2 Acceso por rol

| Análisis | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano |
|----------|-------|--------|--------------|-----------|--------|
| Carga | Todo | Todo | Su escuela | Su dpto | Su facultad |
| Ocupación | Todo | Todo | Su escuela | Su dpto | Su facultad |
| Conflictos | Todo | Todo | Su escuela | Su dpto | Su facultad |
| Predictivo | Sí | Sí | No | No | Sí (su facultad) |

### 22.3 Qué debo probar

- [ ] Ver heatmap de carga docente → colores coherentes.
- [ ] Ver análisis de ocupación → ambientes identificados como subutilizados/sobrecargos.
- [ ] Ver análisis de conflictos → muestra tipos más frecuentes.
- [ ] Los datos de análisis son coherentes con los datos reales.

---

## 23. Notificaciones

### 23.1 Funcionalidades esperadas

**Tipos de notificación:**
- Asignación de carga lectiva.
- Cambio de estado de declaración.
- Observación en declaración.
- Aprobación/rechazo de CLAD.
- Conflictos detectados en horarios.
- Ventanas de atención próximas.
- Recordatorios de plazos.
- Cambios en configuración del sistema.

**Canales:**
- In-app (centro de notificaciones).
- Email (opcional, configurable).
- WebSocket (tiempo real).

**Gestión:**
- Marcar como leída/no leída.
- Eliminar notificación.
- Filtrar por tipo, fecha, estado.
- Preferencias de notificación por tipo.

**Reglas de negocio:**
- Solo se envían notificaciones a usuarios afectados.
- Las notificaciones se mantienen histórico (no se eliminan automáticamente).
- El usuario puede configurar qué tipos de notificación recibe.

### 23.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Ver notificaciones | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Marcar leída | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Configurar preferencias | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Enviar notificación manual | Sí | Sí | No | No | No | No | No | No |

### 23.3 Qué debo probar

- [ ] Al asignar carga a un docente, este recibe notificación.
- [ ] Al observar una declaración, la secretaria recibe notificación.
- [ ] Las notificaciones aparecen en tiempo real (WebSocket).
- [ ] El usuario puede marcar notificación como leída.
- [ ] El usuario puede configurar qué notificaciones recibe por email.

---

## 24. Auditoría y Trazabilidad

### 24.1 Funcionalidades esperadas

**Registro de auditoría:**
- Toda acción relevante queda registrada: quién, qué, cuándo, dónde, antes/después.
- Entidades auditadas: horarios, carga lectiva, declaraciones, usuarios, configuración.

**Consultas:**
- Filtrar por: período, usuario, acción, entidad, rango de fechas.
- Ver detalle: valores anteriores vs. nuevos valores.
- Exportar historial de auditoría.

**Reportes de auditoría:**
- Actividad por usuario.
- Cambios por entidad.
- Acciones en un rango de tiempo.
- Usuarios más activos.

### 24.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Docente |
|--------|-------|--------|--------------|-----------|--------|---------|
| Ver auditoría | Sí | Sí (su scope) | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No |
| Exportar auditoría | Sí | Sí (su scope) | No | No | No | No |
| Ver detalle cambio | Sí | Sí (su scope) | Sí (su escuela) | Sí (su dpto) | Sí (su facultad) | No |

### 24.3 Qué debo probar

- [ ] Al modificar un horario, queda registro con valores anteriores y nuevos.
- [ ] Al confirmar una declaración, queda registro con autor y timestamp.
- [ ] Un director de departamento solo ve auditoría de su departamento.
- [ ] Exportar auditoría a Excel → contiene todos los campos.
- [ ] Un docente NO puede acceder a auditoría.

---

## 25. Chatbot / Asistente IA

### 25.1 Funcionalidades esperadas

**Consultas naturales:**
- "¿Cuántos docentes tiene el departamento de Sistemas?"
- "¿Cuál es la ocupación del laboratorio 1 esta semana?"
- "¿Cuántos conflictos hay sin resolver?"
- "¿Qué cursos ofrece la escuela de Sistemas en el período 2026-I?"

**Acciones asistidas:**
- "Genera el reporte de carga del departamento X".
- "Muestra el horario del docente Y".
- "¿Qué ambientes están libres el martes a las 10am?"

**Integración:**
- Conecta con la base de datos en tiempo real.
- Respuestas contextuales al rol del usuario.
- Historial de conversaciones.

### 25.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Usar chatbot | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Ver historial propio | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |

### 25.3 Qué debo probar

- [ ] Hacer una consulta sobre datos del sistema → respuesta correcta.
- [ ] El chatbot respeta los permisos del usuario (no muestra datos de otros departamentos).
- [ ] El historial de conversación se guarda.
- [ ] Las respuestas son coherentes con los datos reales.

---

## 26. Importación de Datos

### 26.1 Funcionalidades esperadas

**Tipos de importación:**
- Docentes (desde Excel/CSV).
- Cursos (desde Excel/CSV).
- Ambientes (desde Excel/CSV).
- Planes de estudios (desde Excel/CSV).
- Asignaciones (desde plantilla oficial).

**Proceso:**
- Subir archivo → validación → vista previa → confirmar importación.
- Mostrar errores por fila antes de importar.
- Permitir ignorar errores y importar filas válidas.
- Generar reporte de importación (cuántos éxitos, cuántos errores).

**Reglas de negocio:**
- No duplicar registros existentes (o actualizar, según configuración).
- Validar integridad referencial (el departamento debe existir, etc.).
- Los datos inválidos se reportan pero no bloquean la importación completa.

### 26.2 Acceso por rol

| Acción | Admin | Coord. | Dir. Escuela | Dir. Dpto | Otros |
|--------|-------|--------|--------------|-----------|-------|
| Importar datos | Sí | Sí | No | No | No |
| Ver reporte de importación | Sí | Sí | No | No | No |

### 26.3 Qué debo probar

- [ ] Importar lista de docentes desde Excel → se crean correctamente.
- [ ] Importar archivo con errores → se reportan las filas con problemas.
- [ ] Importar un docente que ya existe → se actualiza o se omite (según config).
- [ ] Importar plan de estudios desde Excel → se crean cursos y ciclos.

---

## 27. Documentación y Ayuda

### 27.1 Funcionalidades esperadas

- Ayuda contextual en cada módulo.
- Guía de uso por rol.
- Glossario de términos.
- FAQ (preguntas frecuentes).
- Contacto de soporte.
- Release notes (versiones del sistema).

### 27.2 Acceso por rol

| Acción | Todos los roles |
|--------|----------------|
| Ver ayuda | Sí |
| Ver guía por rol | Sí (la correspondiente a su rol) |
| Ver glossario | Sí |

### 27.3 Qué debo probar

- [ ] Desde cualquier módulo, hay acceso a ayuda contextual.
- [ ] La ayuda muestra información relevante al módulo actual.
- [ ] El docente ve una guía diferente a la del coordinador.

---

## 28. Matriz de Acceso por Rol

### Resumen de accesos por módulo

| Módulo | Admin | Coord. | Dir. Escuela | Dir. Dpto | Decano | Secretaria | Operador | Docente |
|--------|-------|--------|--------------|-----------|--------|------------|----------|---------|
| Autenticación | CRUD | - | - | - | - | - | - | - |
| Usuarios | CRUD | Ver | - | - | - | - | - | - |
| Períodos | CRUD | CRUD | Ver | Ver | Ver | Ver | Ver | Ver |
| Estructura Org. | CRUD | Ver | CRUD(esc) | CRUD(dpto) | Ver | Ver | Ver | Ver |
| Planes de Estudio | CRUD | CRUD | CRUD(esc) | Ver | Ver | Ver | Ver | Ver |
| Docentes | CRUD | CRUD | Ver(esc) | Ver(dpto) | Ver(fac) | Ver | Ver | Perfil |
| Cursos | CRUD | CRUD | Ver(esc) | Ver(dpto) | Ver(fac) | Ver | Ver | Ver |
| Ambientes | CRUD | CRUD | Ver | Ver | Ver | Ver | Ver | Ver |
| Oferta Académica | CRUD | CRUD | Ver(esc) | Ver(dpto) | Ver(fac) | Ver | Ver | Ver |
| Asignación Lectiva | CRUD | CRUD | Ver(esc) | Ver(dpto) | Ver(fac) | CRUD(dpto) | - | - |
| Declaración Carga | CRUD | CRUD | Ver/Rev(esc) | Ver/Rev(dpto) | Ver/Rev(fac) | CRUD(esc) | - | Ver(propia) |
| Declaración No Lectiva | CRUD | - | - | Ver/Rev(dpto) | - | - | Ver | CRUD(propia) |
| CLAD | CRUD | Ver/Rev | Ver/Rev(esc) | Ver/Rev(dpto) | Ver/Rev(fac) | Ver | Ver | CRUD(propia) |
| Disponibilidad | CRUD | CRUD | Ver(esc) | CRUD(dpto) | Ver(fac) | Ver | Ver | CRUD(propia) |
| Horarios | CRUD | CRUD | Ver(esc) | Ver(dpto) | Ver(fac) | Ver | CRUD | Ver(propio) |
| Ventanas | CRUD | CRUD | - | - | - | - | CRUD | CRUD(turno) |
| Preasignaciones | CRUD | CRUD | Ver(esc) | Ver(dpto) | - | Ver | - | Ver(propia) |
| Configuración | CRUD | Ver | Ver | Ver | Ver | Ver | Ver | Ver |
| Reportes Oper. | Todos | Todos | Escuela | Dpto | Facultad | Escuela | Scope | Propios |
| Reportes Gestión | Todos | Todos | Escuela | Dpto | Facultad | - | - | - |
| Dashboard | Todo | Todo | Escuela | Dpto | Facultad | Escuela | Scope | Propio |
| Analítica | Todos | Todos | Escuela | Dpto | Facultad | - | - | - |
| Notificaciones | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD(propia) |
| Auditoría | CRUD | Ver(esc) | Ver(esc) | Ver(dpto) | Ver(fac) | - | - | - |
| Chatbot | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Importación | Sí | Sí | - | - | - | - | - | - |

---

## Apéndice: Flujo Típico de Carga Académica

Para facilitar la comprensión del ciclo completo, este es el flujo típico que el sistema debería soportar:

```
1. CONFIGURACIÓN INICIAL (Admin)
   └→ Crear período → Configurar parámetros → Cargar plan de estudios

2. OFERTA ACADÉMICA (Coordinador)
   └→ Generar oferta del período → Publicar oferta

3. ASIGNACIÓN DE CARGA (Secretaria/Coordinador)
   └→ Asignar carga lectiva a docentes → Confirmar asignaciones

4. DECLARACIONES (Secretaria/Docente)
   └→ Secretaria crea declaración de carga horaria
   └→ Docente declara carga no lectiva (si aplica)
   └→ Docente solicita CLAD (si aplica)

5. REVISIÓN Y APROBACIÓN (Director Dpto / Decano)
   └→ Revisar declaraciones → Observar/Validar
   └→ Revisar CLAD → Observar/Validar

6. GESTIÓN DE HORARIOS (Operador/Coordinador)
   └→ Generar/asignar horarios → Resolver conflictos → Publicar

7. VENTANAS DE ATENCIÓN (Coordinador/Operador)
   └→ Crear campaña → Generar ventanas → Atender docentes

8. SEGUIMIENTO (Todos)
   └→ Dashboard → Reportes → Auditoría → Notificaciones

9. CIERRE (Admin/Coordinador)
   └→ Cerrar período → Generar reportes finales
```

---

## Apéndice: Estados Clave del Sistema

| Entidad | Estados | Transiciones típicas |
|---------|---------|---------------------|
| Período | PLANIFICACION → ASIGNACION_HORARIOS → EN_CURSO → FINALIZADO | Secuencial |
| Horario | BORRADOR → CONFIRMADO → PUBLICADO → CERRADO | Secuencial (CONFLICTO como rama) |
| Asignación Lectiva | PENDIENTE → CONFIRMADO / RECHAZADO | Bifurcado |
| Declaración Carga | BORRADOR → CONFIRMADO → CERRADO | Secuencial (con observaciones intermedias) |
| CLAD | BORRADOR → ENVIADO_DPTO → VALIDADO_DPTO → VALIDADO_DEPENDENCIA → APROBADO_FINAL | Multi-nivel |
| Ventana | BORRADOR → GENERADO → PUBLICADO → EN_CURSO → CERRADO | Secuencial |
| Campaña Ventana | BORRADOR → GENERADO → PUBLICADO → EN_CURSO → CERRADO / CANCELADO | Secuencial |
| Ambiente | ACTIVO ↔ MANTENIMIENTO / RESERVADO / INACTIVO | Bidireccional |
| Usuario | ACTIVO ↔ INACTIVO | Bidireccional |

---

> **Última actualización:** Este documento refleja el estado arquitectónico del sistema al 25 de junio de 2026.
> Úsalo como checklist viviente: marca con `[x]` las funcionalidades que verifiques exitosamente.
