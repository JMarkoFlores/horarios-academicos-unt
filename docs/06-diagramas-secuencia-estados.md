# Diagramas de Secuencia y Estados

| Campo    | Valor                                                              |
| -------- | ------------------------------------------------------------------ |
| Versión  | 1.0.0                                                              |
| Fecha    | 10/07/2026                                                         |
| Autor    | Equipo de Desarrollo — Escuela de Ingeniería de Sistemas, UNT     |
| Estado   | Revisado                                                           |

---

## 1. Diagramas de secuencia

### 1.1. Login y autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: Ingresa email y contraseña
    F->>B: POST /auth/login {email, password}
    B->>DB: SELECT usuario WHERE email = ?
    DB-->>B: usuario found
    B->>B: bcrypt.compare(password, hash)
    B->>B: Generar JWT token
    B-->>F: {token, usuario: {id, nombre, rol, ...}}
    F->>F: Guardar token en localStorage
    F->>F: Redirigir según rol (ROL_REDIRECT)
    F-->>U: Dashboard o perfil forzado
```

> El usuario ingresa credenciales. El backend valida contra PostgreSQL, genera un JWT y retorna los datos del usuario. El frontend almacena el token y redirige según el rol.

### 1.2. Asignación de carga lectiva por Secretaria

```mermaid
sequenceDiagram
    participant S as Secretaria
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    S->>F: Selecciona curso, docente, grupo
    F->>B: POST /asignacion-lectiva {docente_id, curso_plan_id, grupo_id, tipo_clase, seccion}
    B->>B: Validar cruce docente
    B->>B: Validar cruce ambiente
    B->>B: Validar disponibilidad docente
    alt Sin conflictos
        B->>DB: INSERT AsignacionLectiva (estado: PENDIENTE)
        DB-->>B: Asignación creada
        B-->>F: Asignación creada exitosamente
        F-->>S: Mensaje de éxito
    else Con conflictos
        B-->>F: Error: cruce detectado
        F-->>S: Mostrar error con detalles
    end
```

> La secretaria selecciona curso, docente y grupo. El backend valida cruce de docente, ambiente y disponibilidad. Si no hay conflictos, crea la asignación con estado PENDIENTE.

### 1.3. Registro de carga no lectiva por Docente

```mermaid
sequenceDiagram
    participant D as Docente
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    D->>F: Crear declaración (BORRADOR)
    F->>B: POST /declaraciones/docentes/:id
    B->>DB: INSERT DeclaracionCargaHoraria
    D->>F: Agregar actividad no lectiva
    F->>B: POST /carga-no-lectiva/declaracion/:id/actividad
    B->>DB: INSERT ActividadNoLectiva
    D->>F: Distribuir horarios (drag and drop)
    F->>B: POST /carga-no-lectiva/actividad/:id/horario
    B->>DB: INSERT HorarioNoLectivo
    D->>F: Guardar cambios
    F-->>D: Declaración guardada como BORRADOR
```

> El docente crea una declaración, agrega actividades no lectivas y distribuye sus horarios usando el componente de arrastrar y soltar.

### 1.4. Validación por Director de Departamento

```mermaid
sequenceDiagram
    participant DIR as Director Dpto
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    DIR->>F: Revisar declaración
    F->>B: GET /declaraciones/docentes/:id
    B->>DB: SELECT DeclaracionCargaHoraria
    DB-->>B: Declaración con datos completos
    B-->>F: Declaración para revisión
    alt Validar
        DIR->>F: Validar declaración
        F->>B: PATCH /declaraciones/:id/validar-departamento
        B->>DB: UPDATE estado → VALIDADO_DPTO
        B->>B: Registrar auditoría
        B-->>F: Estado actualizado
    else Observar
        DIR->>F: Observar declaración (motivo)
        F->>B: PATCH /declaraciones/:id/observar-departamento
        B->>DB: UPDATE estado → OBSERVADO_DPTO
        B->>DB: INSERT DeclaracionObservacion
        B->>B: Registrar auditoría
        B-->>F: Observación registrada
    end
```

> El Director de Departamento revisa la declaración. Puede validarla (transición a VALIDADO_DPTO) u observarla con un motivo (transición a OBSERVADO_DPTO).

### 1.5. Aprobación final por Decano

```mermaid
sequenceDiagram
    participant DEC as Decano
    participant F as Frontend
    participant B as Backend
    participant DB as PostgreSQL

    DEC->>F: Revisar declaración
    F->>B: GET /declaraciones/docentes/:id
    B-->>F: Declaración con datos completos
    DEC->>F: Firmar y aprobar
    F->>B: PATCH /declaraciones/:id/aprobar-facultad
    B->>DB: UPDATE estado → APROBADO_FACULTAD
    B->>DB: UPDATE firma_decano_url, fecha_firma_decano
    B->>B: Registrar auditoría
    B-->>F: Declaración aprobada
    F-->>DEC: Mensaje de éxito
```

> El Decano revisa la declaración validada por el Director de Departamento, la firma digitalmente y la aprueba, transicionando a APROBADO_FACULTAD.

---

## 2. Diagramas de estados

### 2.1. Ciclo de vida de Declaración de Carga

```mermaid
stateDiagram-v2
    [*] --> BORRADOR
    BORRADOR --> ENVIADO : Docente envía
    ENVIADO --> OBSERVADO_DPTO : Director observa
    ENVIADO --> VALIDADO_DPTO : Director valida
    OBSERVADO_DPTO --> ENVIADO : Docente corrige y reenvía
    VALIDADO_DPTO --> OBSERVADO_FACULTAD : Decano observa
    VALIDADO_DPTO --> APROBADO_FACULTAD : Decano aprueba
    OBSERVADO_FACULTAD --> VALIDADO_DPTO : Corrección y reenvío
    APROBADO_FACULTAD --> CERRADO : Cierre automático
    CERRADO --> REABIERTO : Reapertura excepcional
    REABIERTO --> ENVIADO : Reenvío
```

> La declaración de carga sigue un flujo lineal de 8 estados: BORRADOR → ENVIADO → OBSERVADO_DPTO / VALIDADO_DPTO → OBSERVADO_FACULTAD / APROBADO_FACULTAD → CERRADO / REABIERTO.

### 2.2. Ciclo de vida de Horario Asignado

```mermaid
stateDiagram-v2
    [*] --> BORRADOR
    BORRADOR --> CONFLICTO : Detección de conflicto
    BORRADOR --> CONFIRMADO : Sin conflictos
    CONFIRMADO --> PUBLICADO : Publicación masiva
    CONFLICTO --> BORRADOR : Resolución de conflicto
    PUBLICADO --> CERRADO : Cierre del período
```

> El horario asignado pasa por 5 estados: BORRADOR (creación), CONFLICTO (si hay cruce), CONFIRMADO (sin conflictos), PUBLICADO (visible para todos), CERRADO (período finalizado).

### 2.3. Ciclo de vida de Asignación de Carga Lectiva

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    PENDIENTE --> CONFIRMADO : Docente/Secretaria confirma
    PENDIENTE --> RECHAZADO : Docente rechaza
    RECHAZADO --> PENDIENTE : Reasignación
```

> La asignación de carga lectiva tiene 3 estados: PENDIENTE (recién creada), CONFIRMADO (aceptada), RECHAZADO (rechazada por el docente).

### 2.4. Ciclo de vida de CLAD

```mermaid
stateDiagram-v2
    [*] --> BORRADOR
    BORRADOR --> ENVIADO_DPTO : Docente envía
    ENVIADO_DPTO --> OBSERVADO_DPTO : Director observa
    ENVIADO_DPTO --> VALIDADO_DPTO : Director valida
    OBSERVADO_DPTO --> ENVIADO_DPTO : Corrección
    VALIDADO_DPTO --> OBSERVADO_DEPENDENCIA : Coordinador observa
    VALIDADO_DPTO --> VALIDADO_DEPENDENCIA : Coordinador valida
    OBSERVADO_DEPENDENCIA --> VALIDADO_DPTO : Corrección
    VALIDADO_DEPENDENCIA --> APROBADO_FINAL : Decano aprueba
```

> El CLAD sigue un flujo de 7 estados con validación en departamento y dependencia, terminando con aprobación final del Decano.

### 2.5. Ciclo de vida de Período Académico

```mermaid
stateDiagram-v2
    [*] --> PLANIFICACION
    PLANIFICACION --> ASIGNACION_HORARIOS : Inicio de asignación
    ASIGNACION_HORARIOS --> EN_CURSO : Publicación de horarios
    EN_CURSO --> FINALIZADO : Fin del período
```

> El período académico tiene 4 estados: PLANIFICACION, ASIGNACION_HORARIOS, EN_CURSO, FINALIZADO.
