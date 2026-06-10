# Horarios UNT — Sistema de Gestión de Horarios Académicos

## Universidad Nacional de Trujillo — Escuela de Ingeniería de Sistemas (EIS)

Sistema web completo para la gestión y asignación de horarios académicos, incluyendo administración de docentes, cursos, ambientes, disponibilidad docente y un módulo de atención por turnos con actualizaciones en tiempo real vía WebSocket.

---

## Diagrama de Arquitectura

```mermaid
graph TB
    subgraph "Frontend"
        A[Angular 17<br>Single Page App]
    end

    subgraph "Backend"
        B[NestJS 10<br>REST API]
        C[Chatbot Service<br>con IA]
        D[WebSocket Server<br>Socket.IO]
    end

    subgraph "Almacenamiento"
        E[(PostgreSQL 16<br>Base de Datos Principal)]
        F[(Redis 7<br>Caché y Pub/Sub)]
    end

    A -->|HTTP/HTTPS + WebSocket| B
    A -->|WebSocket| D
    B -->|SQL| E
    B -->|Commands/PubSub| F
    D --> F
    C -->|API| G[GROQ / Gemini API]
```

---

## Diagrama de Modelado de Datos (ER)

```mermaid
erDiagram
    FACULTAD ||--o{ ESCUELA : tiene
    ESCUELA ||--o{ DEPARTAMENTO : tiene
    DEPARTAMENTO ||--o{ DOCENTE : tiene
    ESCUELA ||--o{ CURSO : ofrece
    CURSO ||--o{ GRUPO : tiene
    CURSO ||--o{ DOCENTE_CURSO : tiene
    DOCENTE ||--o{ DOCENTE_CURSO : dicta
    DOCENTE ||--o{ DISPONIBILIDAD_DOCENTE : tiene
    DOCENTE ||--o{ DECLARACION_CARGA_HORARIA : presenta
    CURSO ||--o{ CURSO_AMBIENTE : requiere
    AMBIENTE ||--o{ CURSO_AMBIENTE : es_usado
    AMBIENTE ||--o{ HORARIO_ASIGNADO : asignado
    DOCENTE ||--o{ HORARIO_ASIGNADO : dicta
    GRUPO ||--o{ HORARIO_ASIGNADO : se_dicta
    PERIODO_ACADEMICO ||--o{ HORARIO_ASIGNADO : tiene
    PERIODO_ACADEMICO ||--o{ DECLARACION_CARGA_HORARIA : tiene
    PERIODO_ACADEMICO ||--o{ CAMPANA_VENTANAS : tiene
    CAMPANA_VENTANAS ||--o{ VENTANA_ATENCION : tiene
    VENTANA_ATENCION ||--o{ COLA_DOCENTES : tiene
    VENTANA_ATENCION ||--o{ SELECCION_TEMPORAL : genera
    HORARIO_ASIGNADO ||--o{ CONFLICTO_ASIGNACION : tiene
    HORARIO_ASIGNADO ||--o{ AUDITORIA_HORARIO : registra
    DIA_ACTIVO ||--o{ TURNO_HORARIO : define
    TURNO_HORARIO ||--o{ HORARIO_ASIGNADO : usa
    USUARIO ||--o{ DOCENTE : es
    USUARIO ||--o{ NOTIFICACION_DOCENTE : recibe

    FACULTAD {
        int id PK
        string codigo
        string nombre
    }

    ESCUELA {
        int id PK
        string codigo
        string nombre
        int facultad_id FK
    }

    DEPARTAMENTO {
        int id PK
        string codigo
        string nombre
        int escuela_id FK
    }

    DOCENTE {
        int id PK
        string codigo
        string nombres
        string apellidos
        string email
        string categoria
        string tipo_contrato
        string modalidad
        int departamento_id FK
    }

    CURSO {
        int id PK
        string codigo
        string nombre
        int creditos
        int horas_teoria
        int horas_laboratorio
        int ciclo
        boolean tiene_laboratorio
        int escuela_id FK
    }

    GRUPO {
        int id PK
        string codigo
        int curso_id FK
    }

    AMBIENTE {
        int id PK
        string codigo
        string nombre
        enum tipo
        int capacidad
        string pabellon
        string edificio
        string sede
        string equipamiento
        enum estado
    }

    CURSO_AMBIENTE {
        int id PK
        int curso_id FK
        int ambiente_id FK
        enum tipo_clase
    }

    DOCENTE_CURSO {
        int id PK
        int docente_id FK
        int curso_id FK
    }

    DISPONIBILIDAD_DOCENTE {
        int id PK
        int docente_id FK
        int dia
        string hora_inicio
        string hora_fin
        boolean disponible
        string periodo
    }

    TURNO_HORARIO {
        int id PK
        int dia_activo_id FK
        string hora_inicio
        string hora_fin
        string descripcion
    }

    DIA_ACTIVO {
        int id PK
        int dia_semana
        boolean activo
        string periodo
    }

    PERIODO_ACADEMICO {
        int id PK
        string codigo
        string nombre
        date fecha_inicio
        date fecha_fin
        enum estado
    }

    HORARIO_ASIGNADO {
        int id PK
        int docente_id FK
        int curso_id FK
        int grupo_id FK
        int ambiente_id FK
        int dia
        string hora_inicio
        string hora_fin
        enum tipo_clase
        enum estado
        string periodo
    }

    CONFLICTO_ASIGNACION {
        int id PK
        int horario_id FK
        enum tipo_conflicto
        string descripcion
        boolean resuelto
    }

    AUDITORIA_HORARIO {
        int id PK
        int horario_id FK
        string accion
        string realizado_por
        json cambios
        timestamp fecha
    }

    USUARIO {
        int id PK
        string email
        string password
        enum rol
        boolean activo
    }

    DECLARACION_CARGA_HORARIA {
        int id PK
        int docente_id FK
        string periodo FK
        enum estado
        int horas_solicitadas
        int horas_aprobadas
        json observaciones
    }

    CAMPANA_VENTANAS {
        int id PK
        string nombre
        date fecha_inicio
        date fecha_fin
        string periodo FK
        enum estado
    }

    VENTANA_ATENCION {
        int id PK
        int campaña_id FK
        int docente_id FK
        string fecha
        string hora_inicio
        string hora_fin
        enum estado
        int posicion_cola
    }

    COLA_DOCENTES {
        int id PK
        int ventana_id FK
        int docente_id FK
        int posicion
        enum estado
        timestamp fecha_entrada
    }

    SELECCION_TEMPORAL {
        int id PK
        int ventana_id FK
        int docente_id FK
        int curso_id FK
        int grupo_id FK
        int ambiente_id FK
        int dia
        string hora_inicio
        string hora_fin
        enum estado
        timestamp fecha_seleccion
    }

    NOTIFICACION_DOCENTE {
        int id PK
        int docente_id FK
        string mensaje
        enum tipo
        boolean leido
        timestamp fecha_envio
    }
```

---

## Stack tecnológico

| Capa       | Tecnología                       |
| ---------- | -------------------------------- |
| Backend    | NestJS 10 + TypeScript           |
| Frontend   | Angular 17 + Angular Material 17 |
| ORM        | TypeORM 0.3                      |
| Base datos | PostgreSQL 16                    |
| Caché/WS   | Redis 7 + Socket.IO              |
| Contenedor | Docker + Docker Compose          |
| IA         | GROQ / Gemini API                |

---

## Estructura del proyecto

```
horarios-academicos-unt/
├── backend/                  ← API NestJS
│   ├── src/
│   │   ├── auth/             ← JWT, Guards, Decoradores
│   │   ├── common/           ← Enums, Interceptors, Filters
│   │   ├── entities/         ← Entidades TypeORM
│   │   ├── database/         ← seed.ts y scripts de datos
│   │   └── migrations/       ← Migraciones de BD
│   └── data-source.ts
├── frontend/                 ← Aplicación Angular 17
│   └── src/app/
│       ├── core/             ← Guards, Interceptors, Services
│       ├── layout/           ← Sidebar + Topbar responsive
│       ├── auth/             ← Login
│       └── modules/
│           ├── dashboard/    ← KPIs y gráficos
│           ├── docentes/     ← CRUD Docentes
│           ├── cursos/       ← CRUD Cursos
│           ├── ambientes/    ← CRUD Ambientes
│           ├── disponibilidad/ ← Grilla disponibilidad
│           ├── reportes/     ← Descarga PDFs
│           ├── horarios/     ← Vista horarios (docente/ambiente/conflictos)
│           └── operador/     ← Sistema de turnos WebSocket
├── docker/                   ← Dockerfiles para dev/prod
└── docker-compose.yml
```

---

## Requisitos previos

| Herramienta    | Versión mínima                    |
| -------------- | --------------------------------- |
| Node.js        | 20.x                              |
| npm            | 10.x                              |
| Docker         | 24.x                              |
| Docker Compose | 2.x                               |

---

## Instalación y ejecución

### Opción 1: Usando Docker Compose (Recomendado)

Este método levanta todos los servicios (PostgreSQL, Redis, Backend y Frontend) en contenedores.

1.  **Clonar el repositorio y configurar las variables de entorno:**
    ```bash
    cp .env.example .env
    cp backend/.env.example backend/.env
    ```

2.  **Levantar todos los contenedores:**
    ```bash
    docker-compose up -d --build
    ```

3.  **Esperar a que todos los servicios estén healthy y luego acceder:**
    - **Frontend**: http://localhost:8080
    - **Backend (API)**: http://localhost:3000
    - **Swagger UI (Docs)**: http://localhost:3000/api/docs
    - **pgAdmin (Admin BD)**: http://localhost:5052

### Opción 2: Desarrollo local con contenedores de BD y Redis

Este método es útil si quieres editar el código del backend o frontend con hot-reload.

1.  **Levantar solo BD y Redis con Docker Compose:**
    ```bash
    docker-compose up -d postgres redis pgadmin mailhog
    ```

2.  **Ejecutar el backend localmente:**
    ```bash
    cd backend
    npm install
    # Si es la primera vez o necesitas poblar la BD:
    # Asegúrate que backend/.env tenga DATABASE_PORT=5433
    npm run seed
    npm run start:dev
    ```

3.  **Ejecutar el frontend localmente en una nueva terminal:**
    ```bash
    cd frontend
    npm install
    npx ng serve --port 4200
    ```

---

## Credenciales por defecto

El seeder (`npm run seed`) crea los siguientes usuarios de prueba. **La contraseña de todos es `Admin123!`.**

| Usuario                | Contraseña | Rol                   |
| ---------------------- | ---------- | --------------------- |
| admin@unt.edu.pe       | Admin123!  | Administrador Sistema |
| director@unt.edu.pe    | Admin123!  | Director de Escuela   |
| coordinador@unt.edu.pe | Admin123!  | Coordinador Académico |
| operador@unt.edu.pe    | Admin123!  | Operador de Horarios  |
| docente@unt.edu.pe     | Admin123!  | Docente               |

---

## Variables de entorno

### Variables del proyecto principal (`/.env`)

| Variable                | Valor por defecto                |
| ----------------------- | --------------------------------- |
| `POSTGRES_CONTAINER_NAME` | horarios_postgres              |
| `POSTGRES_PORT`         | 5433                              |
| `POSTGRES_DB`           | horarios_unt                      |
| `POSTGRES_USER`         | unt_user                          |
| `POSTGRES_PASSWORD`     | unt_pass123                       |
| `PGADMIN_CONTAINER_NAME`| horarios_pgadmin                  |
| `PGADMIN_PORT`          | 5052                              |
| `PGADMIN_DEFAULT_EMAIL` | admin@localhost.com               |
| `PGADMIN_DEFAULT_PASSWORD` | admin123                       |
| `REDIS_CONTAINER_NAME`  | horarios_redis                    |
| `REDIS_PORT`            | 6379                              |
| `BACKEND_CONTAINER_NAME`| horarios_backend                  |
| `BACKEND_PORT`          | 3000                              |
| `JWT_SECRET`            | cambia-este-secreto-en-produccion |
| `JWT_EXPIRACION`        | 8h                                |
| `NODE_ENV`              | development                       |
| `FRONTEND_CONTAINER_NAME`| horarios_frontend                |
| `FRONTEND_PORT`         | 8080                              |
| `GROQ_API_KEY`          | (tu clave de GROQ)                |
| `GEMINI_API_KEY`        | (tu clave de Gemini)              |

### Variables del backend (`/backend/.env`)

Solo necesarias si ejecutas el backend localmente (fuera de Docker).

| Variable              | Valor por defecto        |
| --------------------- | ------------------------ |
| `DATABASE_HOST`       | localhost                |
| `DATABASE_PORT`       | 5433                     |
| `DATABASE_NAME`       | horarios_unt             |
| `DATABASE_USER`       | unt_user                 |
| `DATABASE_PASSWORD`   | unt_pass123              |
| `JWT_SECRET`          | horarios_unt_secret_2026 |
| `JWT_EXPIRACION`      | 8h                       |
| `REDIS_HOST`          | localhost                |
| `REDIS_PORT`          | 6379                     |
| `REDIS_URL`           | redis://localhost:6379   |

---

## Descripción de los módulos

| Módulo             | Ruta                  | Descripción                                                                 |
| ------------------ | --------------------- | --------------------------------------------------------------------------- |
| **Login**          | `/login`              | Autenticación JWT                                                           |
| **Dashboard**      | `/app/dashboard`      | KPIs del sistema y gráficos de distribución                                 |
| **Docentes**       | `/app/docentes`       | CRUD de docentes con filtros y paginación                                   |
| **Cursos**         | `/app/cursos`         | CRUD de cursos con prerequisitos y ambientes                                |
| **Ambientes**      | `/app/ambientes`      | CRUD de aulas/laboratorios con equipamiento                                 |
| **Disponibilidad** | `/app/disponibilidad` | Grilla semanal de disponibilidad por docente                                |
| **Reportes**       | `/app/reportes`       | Descarga de PDFs por docente/ambiente/gestión                               |
| **Horarios**       | `/app/horarios`       | Vista de grilla horaria (docente, ambiente, conflictos, gestión automática) |
| **Operador**       | `/app/operador`       | Sistema de turnos con grilla interactiva y WebSocket en tiempo real         |
| **Chatbot**        | (API `/api/chatbot`)  | Asistente virtual IA para consultas de disponibilidad                       |

---

## Scripts disponibles

### Backend

```bash
npm run start:dev        # Servidor de desarrollo con hot-reload
npm run build            # Compilar para producción
npm run start:prod       # Ejecutar código compilado
npm run migration:run    # Ejecutar migraciones pendientes
npm run migration:generate -- --name NombreMigracion  # Generar nueva migración
npm run migration:revert # Revertir última migración
npm run seed             # Poblar datos iniciales
npm run seed:horarios-ciclo-I   # Seed de horarios ciclo I
npm run seed:horarios-ciclo-III # Seed de horarios ciclo III
npm run seed:horarios-ciclo-V   # Seed de horarios ciclo V
npm run seed:horarios-ciclo-VII # Seed de horarios ciclo VII
npm run lint             # Linter
npm run test             # Ejecutar tests
```

### Frontend

```bash
npm run start            # Dev server en http://localhost:4200
npm run build            # Compilar para producción
npm run lint             # Linter
```

### Docker

```bash
docker-compose up -d         # Levantar servicios en segundo plano
docker-compose up -d --build # Reconstruir y levantar servicios
docker-compose down          # Detener y borrar contenedores (mantiene volúmenes)
docker-compose logs -f       # Ver logs de todos los servicios
docker-compose logs -f backend  # Ver logs solo del backend
docker-compose exec backend npm run seed  # Ejecutar seed dentro del contenedor backend (si es que el contenedor tiene el código fuente)
```

---

## Cómo ejecutar el Seed

### Ejecutarlo LOCALMENTE (Recomendado):

1.  **Asegúrate de que los contenedores de Postgres y Redis estén corriendo:**
    ```bash
    docker-compose up -d postgres redis
    ```
2.  **Ve a la carpeta del backend:**
    ```bash
    cd backend
    ```
3.  **Verifica que tu `backend/.env` tenga la configuración correcta de la BD:**
    ```env
    DATABASE_HOST=localhost
    DATABASE_PORT=5433
    DATABASE_NAME=horarios_unt
    DATABASE_USER=unt_user
    DATABASE_PASSWORD=unt_pass123
    ```
4.  **Ejecuta el seed:**
    ```bash
    npm run seed
    ```
