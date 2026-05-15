# Horarios UNT — Sistema de Gestión de Horarios Académicos

## Universidad Nacional de Trujillo — Escuela de Ingeniería de Sistemas (EIS)

Sistema web completo para la gestión y asignación de horarios académicos, incluyendo administración de docentes, cursos, ambientes, disponibilidad docente y un módulo de atención por turnos con actualizaciones en tiempo real vía WebSocket.

---

## Requisitos previos

| Herramienta    | Versión mínima                    |
| -------------- | --------------------------------- |
| Node.js        | 20.x                              |
| npm            | 10.x                              |
| Docker         | 24.x                              |
| Docker Compose | 2.x                               |
| Angular CLI    | 17.x (`npm i -g @angular/cli@17`) |

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

---

## Estructura del proyecto

```
App-Examen/
├── backend/                  ← API NestJS
│   ├── src/
│   │   ├── auth/             ← JWT, Guards, Decoradores
│   │   ├── common/           ← Enums, Interceptors, Filters
│   │   ├── entities/         ← 17 entidades TypeORM
│   │   ├── database/         ← seed.ts
│   │   └── migrations/       ← migración inicial
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
└── docker-compose.yml
```

---

## Instalación y ejecución paso a paso

### Paso 1 — Levantar base de datos y Redis

```bash
docker-compose up -d
```

### Paso 2 — Configurar e iniciar el backend

```bash
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

El servidor estará disponible en: **http://localhost:3000**  
Swagger UI: **http://localhost:3000/api/docs**

### Paso 3 — Configurar e iniciar el frontend (nueva terminal)

```bash
cd frontend
npm install
npx ng serve --port 4200
```

La aplicación estará disponible en: **http://localhost:4200**

---

## Credenciales por defecto

| Usuario             | Contraseña | Rol   |
| ------------------- | ---------- | ----- |
| admin@unitru.edu.pe | Admin123!  | ADMIN |

---

## Variables de entorno (backend/.env)

| Variable          | Valor por defecto        |
| ----------------- | ------------------------ |
| DATABASE_HOST     | localhost                |
| DATABASE_PORT     | 5432                     |
| DATABASE_NAME     | horarios_unt             |
| DATABASE_USER     | unt_user                 |
| DATABASE_PASSWORD | unt_pass123              |
| JWT_SECRET        | horarios_unt_secret_2026 |
| JWT_EXPIRACION    | 8h                       |
| REDIS_URL         | redis://localhost:6379   |

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

---

## Scripts disponibles

```bash
# Backend
npm run start:dev        # Servidor de desarrollo con hot-reload
npm run build            # Compilar para producción
npm run migration:run    # Ejecutar migraciones pendientes
npm run migration:generate -- --name NombreMigracion
npm run migration:revert # Revertir última migración
npm run seed             # Poblar datos iniciales

# Frontend
npx ng serve             # Dev server en http://localhost:4200
npx ng build --no-progress  # Compilar (verificar errores)
```
