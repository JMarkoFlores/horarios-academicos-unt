# Manual de Instalación — Sistema de Horarios Académicos UNT

| Campo | Valor |
|-------|-------|
| **Versión** | 1.0.0 |
| **Fecha** | 10 de julio de 2026 |
| **Autor** | Equipo de Desarrollo — Escuela de Ingeniería de Sistemas, UNT |
| **Estado** | Revisado |

---

## 1. Requisitos previos

### 1.1. Versiones de software

| Software | Versión mínima | Versión recomendada | Notas |
|----------|---------------|---------------------|-------|
| Node.js | 20.x | 22.x | Incluye npm 10+ |
| PostgreSQL | 15 | 16 | Base de datos principal |
| Redis | 7 | 7.x | Cache y colas Bull |
| Git | 2.30+ | Latest | Control de versiones |
| Docker | 24+ | Latest | Opcional, para infraestructura local |

### 1.2. Herramientas opcionales

| Herramienta | Propósito |
|-------------|-----------|
| Docker Desktop | Ejecutar PostgreSQL y Redis localmente sin instalación nativa |
| pgAdmin 4 | Administración visual de PostgreSQL |
| Postman o Insomnia | Probar endpoints de la API |
| VS Code | Editor de código recomendado |
| Angular CLI | `npm install -g @angular/cli@17` para desarrollo del frontend |

### 1.3. Cuentas necesarias

| Servicio | Propósito | URL |
|----------|-----------|-----|
| GitHub | Repositorio del código fuente | https://github.com |
| Render | Despliegue de backend y frontend | https://render.com |
| Vercel | Despliegue del frontend (recomendado) | https://vercel.com |

---

## 2. Clonación del repositorio

```bash
# Clonar por HTTPS
git clone https://github.com/<organizacion>/horarios-academicos-unt.git

# O clonar por SSH
git clone git@github.com:<organizacion>/horarios-academicos-unt.git

# Entrar al directorio
cd horarios-academicos-unt
```

### Estructura resultante

```
horarios-academicos-unt/
├── backend/                  # API NestJS
├── frontend/                 # App Angular
├── docker/                   # Dockerfiles alternativos
├── docker-compose.yml        # Infraestructura local
├── render.yaml               # Blueprint Render
├── .github/workflows/        # CI/CD
├── .env.example              # Template de variables de entorno
├── AGENTS.md                 # Guía para agentes de IA
└── README.md                 # Readme principal
```

---

## 3. Instalación de dependencias

### 3.1. Backend

```bash
cd backend
npm ci
```

### 3.2. Frontend

```bash
cd frontend
npm ci
```

### 3.3. Angular CLI (opcional, para desarrollo local del frontend)

```bash
npm install -g @angular/cli@17
```

---

## 4. Configuración de variables de entorno

### 4.1. Archivo raíz `.env` (para Docker Compose)

Copiar el template y completar los valores:

```bash
cp .env.example .env
```

### 4.2. Archivo `backend/.env` (para desarrollo local sin Docker)

```bash
cp backend/.env.example backend/.env
```

### 4.3. Tabla de variables de entorno

#### Base de datos

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `DATABASE_HOST` | Host de PostgreSQL | `localhost` | Sí |
| `DATABASE_PORT` | Puerto de PostgreSQL | `5432` | Sí |
| `DATABASE_NAME` | Nombre de la base de datos | `horarios_unt` | Sí |
| `DATABASE_USER` | Usuario de PostgreSQL | `unt_user` | Sí |
| `DATABASE_PASSWORD` | Contraseña de PostgreSQL | `unt_pass123` | Sí |
| `DATABASE_SSL` | Habilitar SSL (Render lo requiere) | `false` | No |
| `DB_SYNC` | Sincronizar schema automáticamente | `true` | No |
| `DATABASE_LOGGING` | Log queries SQL | `false` | No |

#### JWT y seguridad

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `JWT_SECRET` | Secreto para firmar tokens JWT | — (generar uno seguro) | Sí |
| `JWT_EXPIRACION` | Tiempo de expiración del token | `8h` | No |

#### Redis

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `REDIS_HOST` | Host de Redis | `localhost` | Sí |
| `REDIS_PORT` | Puerto de Redis | `6379` | Sí |
| `REDIS_TTL` | TTL del cache en segundos | `300` | No |
| `REDIS_URL` | URL completa de Redis | `redis://localhost:6379` | No |

#### Servidor

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `NODE_ENV` | Entorno de ejecución | `development` | No |
| `PORT` | Puerto del backend | `3000` | No |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:4200` | Sí |
| `AUTO_SEED` | Ejecutar seed si BD está vacía | `false` | No |

#### Servicios externos (opcionales)

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | — | No |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | — | No |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | — | No |
| `GROQ_API_KEY` | API key de GROQ para chatbot IA | — | No |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | — | No |

#### Correo (opcional)

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|-----------|
| `CORREO_HOST` | Host SMTP | `smtp.gmail.com` | No |
| `CORREO_PORT` | Puerto SMTP | `587` | No |
| `CORREO_USER` | Email remitente | — | No |
| `CORREO_PASS` | Contraseña de app SMTP | — | No |

#### Docker Compose (solo para infraestructura local)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `POSTGRES_CONTAINER_NAME` | Nombre del contenedor PostgreSQL | `horarios_postgres` |
| `POSTGRES_PORT` | Puerto externo de PostgreSQL | `5433` |
| `PGADMIN_PORT` | Puerto de pgAdmin | `5052` |
| `REDIS_CONTAINER_NAME` | Nombre del contenedor Redis | `horarios_redis` |
| `REDIS_PORT` | Puerto externo de Redis | `6380` |
| `BACKEND_PORT` | Puerto externo del backend | `3000` |
| `FRONTEND_PORT` | Puerto externo del frontend | `8080` |

> **Importante:** Nunca commitear archivos `.env` al repositorio. Están incluidos en `.gitignore`.

---

## 5. Desarrollo local con Docker Compose

### 5.1. Levantar infraestructura

```bash
# Desde la raíz del proyecto
docker compose up -d postgres redis
```

Esto inicia:
- PostgreSQL en puerto `5433` (mapeado desde 5432 del contenedor)
- Redis en puerto `6380` (mapeado desde 6379 del contenedor)
- pgAdmin en `http://localhost:5052`
- MailHog en `http://localhost:8025` (web) y puerto `1025` (SMTP)

### 5.2. Semilla de datos

```bash
cd backend

# Esperar a que PostgreSQL esté listo
docker compose exec postgres pg_isready -U unt_user -d horarios_unt

# Ejecutar seed completo
npm run seed
```

El seed crea:
- 7 usuarios del sistema (admin, director, coordinador, operador, docente)
- Todos con contraseña: `Admin123!`
- Todos con `debe_cambiar_password: true`
- Estructura académica: facultades, escuelas, departamentos
- 50+ cursos del Plan de Estudios 2018
- Horarios demo por ciclo (I, III, V, VII, IX)
- 23 declaraciones en diferentes estados
- Disponibilidades de docentes

### 5.3. Iniciar el backend

```bash
cd backend
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`.
Swagger docs: `http://localhost:3000/api/docs`

### 5.4. Iniciar el frontend

```bash
cd frontend
ng serve
```

El frontend estará disponible en `http://localhost:4200`.

### 5.5. pgAdmin (opcional)

Acceder a `http://localhost:5052` con:
- Email: `admin@localhost.com`
- Contraseña: `admin123`

Configurar el servidor PostgreSQL con host `postgres`, puerto `5432`, usuario `unt_user`.

### 5.6. MailHog (opcional)

- Web UI: `http://localhost:8025`
- SMTP: `localhost:1025`

---

## 6. Despliegue en Render (Backend) — Estado actual

El backend está desplegado en Render utilizando Docker.

### 6.1. Estructura del `render.yaml`

El archivo `render.yaml` en la raíz define:

| Servicio | Tipo | Plan | Imagen |
|----------|------|------|--------|
| `horarios-backend` | Web Service | Free | `./backend/Dockerfile` |
| `horarios-frontend` | Web Service | Free | `./frontend/Dockerfile` |
| `horarios-redis` | Redis | Free | — |
| `horarios-db` | PostgreSQL | — (managed) | — |

### 6.2. Variables de entorno en Render

Las variables se configuran automáticamente desde `render.yaml`:

| Variable | Fuente |
|----------|--------|
| `DATABASE_HOST` | Desde `horarios-db` |
| `DATABASE_PORT` | Desde `horarios-db` |
| `DATABASE_NAME` | Desde `horarios-db` |
| `DATABASE_USER` | Desde `horarios-db` |
| `DATABASE_PASSWORD` | Desde `horarios-db` |
| `REDIS_HOST` | Desde `horarios-redis` |
| `REDIS_PORT` | Desde `horarios-redis` |
| `JWT_SECRET` | Auto-generado |
| `DATABASE_SSL` | `true` |
| `DB_SYNC` | `true` |
| `AUTO_SEED` | `true` |

### 6.3. Configuración del servicio web

- **Build Command:** (automático via Dockerfile)
- **Start Command:** `dumb-init -- node dist/src/main`
- **Health Check Path:** `/health`
- **Puerto:** 3000

### 6.4. Dockerfile del backend

El Dockerfile usa un build multi-etapa sobre `node:22-alpine`:

1. **Builder:** instala dependencias, compila TypeScript
2. **Production:** instala Chromium (para Puppeteer), crea usuario no-root, ejecuta la app

### 6.5. Auto-seed

Con `AUTO_SEED=true`, el backend verifica al iniciar si la tabla `usuario` está vacía. Si lo está, ejecuta el seed automáticamente.

### 6.6. Swagger

Disponible en producción: `https://horarios-backend-bxkb.onrender.com/api/docs`

---

## 7. Despliegue en Vercel (Frontend) — Recomendado

Vercel ofrece CDN global, builds rápidos y preview deploys por PR.

### 7.1. Conexión del repositorio

1. Ir a https://vercel.com/new
2. Importar el repositorio de GitHub
3. Seleccionar el directorio raíz del proyecto

### 7.2. Configuración de build

| Parámetro | Valor |
|-----------|-------|
| Framework Preset | Angular |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist/frontend/browser` |
| Install Command | `npm ci` |

### 7.3. Variables de entorno en Vercel

| Variable | Valor |
|----------|-------|
| `API_URL` | `https://horarios-backend-bxkb.onrender.com` |

### 7.4. Rewrites para SPA routing

Crear archivo `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

### 7.5. Ventajas de Vercel sobre Render para el frontend

| Aspecto | Vercel | Render |
|---------|--------|--------|
| CDN global | Sí | No |
| Cold start | <1s | 30s+ (free tier) |
| Preview deploys | Automático por PR | No |
| Builds | ~30s | ~2min |
| HTTPS | Automático | Automático |
| Costo | Gratis para open source | Gratis (con limitaciones) |

---

## 8. Despliegue en Render (Frontend) — Estado actual

### 8.1. Configuración Docker

El frontend se despliega como servicio Docker en Render:

- **Dockerfile:** `./frontend/Dockerfile`
- **Build arg:** `API_URL=https://horarios-backend-bxkb.onrender.com`
- **Puerto:** 80 (Nginx)
- **Health Check:** `/health`

### 8.2. Dockerfile del frontend

Multi-etapa sobre `node:22-alpine` + `nginx:alpine`:

1. **Builder:** `npm ci`, reemplaza URL de API con `sed`, ejecuta `npm run build`
2. **Production:** copia archivos a Nginx, configura SPA routing

### 8.3. Nginx

Configurado con:
- SPA routing (fallback a `index.html`)
- Gzip compression
- Cache de assets estáticos (30 días)
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Health check endpoint en `/health`

### 8.4. Limitaciones del plan gratuito

- **Cold start:** ~30-60 segundos tras inactividad
- **RAM:** 512 MB máximo
- **Build timeout:** 20 minutos

---

## 9. CI/CD con GitHub Actions

### 9.1. Pipeline `ci.yml` — Integración continua

Se ejecuta en push/PR a `main` o `develop`:

```
┌─────────────┐    ┌─────────────┐
│ Backend CI  │    │ Frontend CI │
│ (lint/build │    │ (build/test)│
│  /test)     │    │             │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └────────┬─────────┘
                │
       ┌────────▼────────┐
       │   E2E Tests     │
       │  (Playwright)   │
       └─────────────────┘
```

**Servicios en CI:** PostgreSQL 15, Redis 7

**Pasos del backend-ci:**
1. Checkout → Node 20 → Cache node_modules
2. `npm ci` → Lint → Build
3. Esperar PostgreSQL → Sync schema → Tests con coverage

**Pasos del frontend-ci:**
1. Checkout → Node 20 → Cache node_modules
2. `npm ci` → Build → Unit tests

**Pasos de e2e-tests:**
1. Instalar dependencias de ambos
2. Sync schema → Seed → Iniciar backend
3. Esperar backend → Ejecutar Playwright (Chromium)

### 9.2. Pipeline `deploy.yml` — Despliegue

Se ejecuta solo en push a `main`:

```
┌──────────────────┐     ┌─────────────┐
│ build-and-push   │────▶│   deploy    │
│ (GHCR images)    │     │ (SSH pull + │
│                  │     │  up -d)     │
└──────────────────┘     └─────────────┘
```

1. Build de imágenes Docker (backend + frontend)
2. Push a GitHub Container Registry (GHCR) con tags `latest` + SHA
3. SSH al servidor → Pull imágenes → `docker-compose up -d`

**Secrets requeridos:** `GHCR_TOKEN`, `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`

### 9.3. Pipeline `pr-check.yml` — Validación de PR

Se ejecuta en PR a `develop`:

1. Valida nombre de branch (`feature/*` o `hotfix/*`)
2. Build de backend y frontend
3. Comenta en el PR si el build falla

---

## 10. Checklist de verificación post-instalación

### Backend

| # | Verificación | Comando / URL | Resultado esperado |
|---|-------------|---------------|-------------------|
| 1 | Health check | `GET /health` | `{ "status": "ok" }` |
| 2 | Swagger docs | `GET /api/docs` | Página de documentación Swagger |
| 3 | Login | `POST /auth/login` con `admin@unt.edu.pe` / `Admin123!` | Token JWT + datos usuario |
| 4 | Perfil | `GET /auth/perfil` con token | Datos del usuario autenticado |
| 5 | Docentes | `GET /docentes` con token de admin | Lista paginada de docentes |

### Frontend

| # | Verificación | Acción | Resultado esperado |
|---|-------------|--------|-------------------|
| 1 | Página de login | Abrir `http://localhost:4200` | Formulario de login |
| 2 | Login exitoso | Ingresar con credenciales de admin | Redirección a `/app/dashboard` |
| 3 | Sidebar | Navegar por el menú | Módulos visibles según rol |
| 4 | Cambio de contraseña | Primer login con `Admin123!` | Forzado a cambiar contraseña |

### Infraestructura

| # | Verificación | Comando | Resultado esperado |
|---|-------------|---------|-------------------|
| 1 | PostgreSQL | `docker compose exec postgres pg_isready` | `accepting connections` |
| 2 | Redis | `docker compose exec redis redis-cli ping` | `PONG` |
| 3 | pgAdmin | Abrir `http://localhost:5052` | Interfaz de pgAdmin |
| 4 | MailHog | Abrir `http://localhost:8025` | Interfaz de MailHog |

### Credenciales de prueba

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | admin@unt.edu.pe | Admin123! | administradorsistema |
| Director | director@unt.edu.pe | Admin123! | directorescuela |
| Coordinador | coordinador@unt.edu.pe | Admin123! | coordinadoracademico |
| Operador | operador@unt.edu.pe | Admin123! | operadorhorarios |
| Docente | docente@unt.edu.pe | Admin123! | docente |
| Secretaria | secretaria@unt.edu.pe | Admin123! | secretaria |

> **Nota:** Todos los usuarios tienen `debe_cambiar_password: true`. El primer login forzará el cambio de contraseña.

---

## 11. Testing de Accesibilidad WCAG 2.1 AA

El sistema implementa accesibilidad WCAG 2.1 Level AA para garantizar que todos los usuarios, incluyendo personas con discapacidades visuales, motoras o cognitivas, puedan usar el sistema equitativamente.

### 11.1. Verificación Rápida (5 minutos)

```bash
# Abrir en navegador
http://localhost:4200/auth/login

# Navegar solo con teclado:
# 1. Tab: avance al siguiente elemento
# 2. Shift+Tab: retroceso
# 3. Enter: activar botón
# 4. Observar: outline azul (focus indicator)

# ✅ Esperado: todos los botones/inputs accesibles sin mouse
# ❌ Problema: si no hay outline visible → accesibilidad deficiente
```

### 11.2. Testing Automatizado (Lighthouse)

```bash
# 1. Abrir Developer Tools (F12)
# 2. Tab "Lighthouse"
# 3. Seleccionar "Accessibility"
# 4. Click "Analyze page load"
# 5. ✅ Score debe ser >= 95/100

Áreas a verificar:
- ✅ Contraste de colores >= 4.5:1
- ✅ Etiquetas de formulario asociadas
- ✅ Botones con propósitos claros
- ✅ Imágenes con texto alternativo (alt)
- ✅ Indicadores de focus visible
```

### 11.3. Testing con Screen Reader (NVDA - Gratis)

```bash
# Descargar e instalar
https://www.nvaccess.org/download/

# Iniciar NVDA
Ctrl + Alt + N

# Navegar:
- Tab: siguiente elemento
- Shift+Tab: elemento anterior
- Arrow Keys: navegar dentro de tablas/listas

# ✅ Esperado: 
- Escuchar: "Email input, edit text"
- Escuchar: "Submit button"
- Escuchar: "Alert, email is required" (cuando error)

# ❌ Problema:
- Silencio o anuncio incorrecto
- Errores no anunciados
- Elementos no etiquetados
```

### 11.4. Keyboard Navigation Checklist

| Página | Funcionalidad | Acceso por Teclado | Status |
|--------|---------------|-------------------|--------|
| Login | Email input | Tab, Enter | ✅ |
| Login | Password input | Tab, Enter | ✅ |
| Login | Submit | Tab, Enter | ✅ |
| Dashboard | KPI cards | Tab, Arrow Keys | ✅ |
| Dashboard | Tabla | Tab, Arrow Down | ✅ |
| Docentes | Crear docente | Tab, Enter | ✅ |
| Docentes | Editar | Tab, Enter, Escape (cerrar) | ✅ |
| Formularios | Validación | Tab away = error visible | ✅ |

```bash
# Quick test script
1. Iniciar navegador (http://localhost:4200)
2. NO USAR MOUSE durante 5 minutos
3. Tab por todas las funciones principales
4. Verificar: outline azul visible siempre
5. Verificar: sin traps (Escape cierra diálogos)
```

### 11.5. Color Contrast Verification

```bash
# Herramienta online: https://webaim.org/resources/contrastchecker/

Ratios mínimos (WCAG 2.1 AA):
- Texto normal: 4.5:1
- Texto grande (>18px): 3:1
- Elementos UI: 3:1

Ejemplo en el sistema:
- Texto (#1F2937) on Fondo (#F9FAFB): 14.5:1 ✅
- Botón (white on #6366F1): 6.2:1 ✅
- Link (#0284C7 on white): 5.4:1 ✅
```

### 11.6. Recursos de Testing

| Herramienta | Propósito | URL |
|-------------|-----------|-----|
| **axe DevTools** | Audit automatizado (browser) | https://www.deque.com/axe/devtools/ |
| **Lighthouse** | Built-in en Chrome DevTools | Presionar F12 |
| **NVDA** | Screen reader gratuito | https://www.nvaccess.org/ |
| **WAVE** | Evaluación web accessibility | https://wave.webaim.org/ |
| **Color Contrast** | Validar ratios | https://webaim.org/resources/contrastchecker/ |

### 11.7. Documentación de Accesibilidad

Ver: [docs/02-guia-accesibilidad.md](02-guia-accesibilidad.md) para:
- Estándares WCAG 2.1 AA implementados
- Detalles de componentes accesibles
- Procedimientos de testing completos
- Checklist pre-release

Ver: [docs/CHECKLIST-ACCESIBILIDAD.md](CHECKLIST-ACCESIBILIDAD.md) para:
- Checklist de validación paso-a-paso
- Procedimientos de testing manual
- Métricas de compliance
- Escala de severidad de issues

---

## Historial de cambios

| Versión | Fecha | Autor | Descripción del cambio |
|---------|-------|-------|------------------------|
| 1.0.0 | 10/07/2026 | Equipo de Desarrollo | Versión inicial del manual de instalación |
