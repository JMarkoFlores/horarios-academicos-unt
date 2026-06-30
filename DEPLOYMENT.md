# Despliegue en Render

## Requisitos

1. Cuenta en [Render](https://render.com/)
2. Repositorio en GitHub con el código del proyecto
3. Render debe tener acceso a tu repositorio de GitHub

## Despliegue Automático (render.yaml)

El archivo `render.yaml` configura automáticamente todos los servicios en Render.

### Pasos:

1. **Conectar Repositorio**
   - Ve a [Render Dashboard](https://dashboard.render.com)
   - Click en **New +** → **Blueprint**
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el `render.yaml`

2. **Revisar Configuración**
   - Render mostrará los servicios a crear:
     - `horarios-db` — PostgreSQL
     - `horarios-redis` — Redis
     - `horarios-backend` — API NestJS (Docker)
     - `horarios-frontend` — Angular + Nginx (Docker)
   - Verifica que los nombres y planes sean correctos

3. **Aplicar**
   - Haz click en **Apply**
   - Render aprovisionará los servicios en orden:
     1. PostgreSQL y Redis primero
     2. Backend cuando la BD esté lista
     3. Frontend cuando el backend esté listo

4. **Esperar**
   - El despliegue inicial toma ~5-10 min
   - Puedes ver logs en tiempo real desde el Dashboard

5. **Seed Inicial**
   - El backend ejecuta `AUTO_SEED=true` automáticamente al iniciar
   - Puebla la BD con datos demo (23 usuarios, cursos, horarios, etc.)
   - Todos los usuarios tienen contraseña `Admin123!` y `debe_cambiar_password: true`

## Despliegue Manual (sin render.yaml)

Si prefieres crear cada servicio por separado:

### 1. PostgreSQL
- **New +** → **PostgreSQL**
- Database name: `horarios_db`
- User: `horarios`
- Plan: Free
- Guarda las credenciales internas

### 2. Redis
- **New +** → **Redis**
- Name: `horarios-redis`
- Plan: Free
- Maxmemory Policy: `allkeys-lru`
- Guarda la conexión interna

### 3. Backend (Web Service - Docker)
- **New +** → **Web Service**
- Environment: **Docker**
- Dockerfile Path: `./backend/Dockerfile`
- Context: `./backend`
- Health Check Path: `/health`

**Variables de entorno:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_HOST` | *(de PostgreSQL)* |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | `horarios_db` |
| `DATABASE_USER` | `horarios` |
| `DATABASE_PASSWORD` | *(de PostgreSQL)* |
| `DATABASE_SSL` | `true` |
| `DB_SYNC` | `true` |
| `AUTO_SEED` | `true` |
| `JWT_SECRET` | *(generar string seguro)* |
| `JWT_EXPIRACION` | `7d` |
| `REDIS_HOST` | *(de Redis)* |
| `REDIS_PORT` | `6379` |
| `REDIS_TTL` | `1800` |
| `FRONTEND_URL` | *(URL del frontend, se agrega después)* |

### 4. Frontend (Web Service - Docker)
- **New +** → **Web Service**
- Environment: **Docker**
- Dockerfile Path: `./frontend/Dockerfile`
- Context: `./frontend`
- Health Check Path: `/health`
- No requiere variables de entorno (el API_URL se define en el Dockerfile)

### 5. Post-deploy: Actualizar FRONTEND_URL
- Despliega primero el frontend y obtén su URL
- Ve al backend en Render → Environment
- Agrega `FRONTEND_URL` = `https://horarios-frontend.onrender.com`
- Haz **Manual Deploy** → **Clear build cache & deploy**

## URLs Finales

| Servicio | URL |
|---|---|
| Frontend | `https://horarios-frontend.onrender.com` |
| API | `https://horarios-backend.onrender.com` |
| Swagger Docs | `https://horarios-backend.onrender.com/api/docs` |
| Health Check | `https://horarios-backend.onrender.com/health` |

## Usuarios Demo (seed)

| Rol | Email |
|---|---|
| Admin | `admin@unt.edu.pe` |
| Director | `director@unt.edu.pe` |
| Coordinador | `coordinador@unt.edu.pe` |
| Operador | `operador@unt.edu.pe` |
| Docente | `docente1@unt.edu.pe` ... |

Todos: `Admin123!` | `debe_cambiar_password: true`

## Actualizaciones

- Haz push a la rama conectada en GitHub
- Render detecta el cambio, reconstruye y despliega automáticamente
- Usa la opción **Manual Deploy** → **Clear build cache & deploy** si hay errores de caché

## Solución de Problemas

### Backend no arranca
- Revisa los logs en Render Dashboard
- Verifica que PostgreSQL y Redis estén "Available"
- Si hay error de `relation "X" does not exist`, reinicia el backend: **Manual Deploy** → **Deploy**

### Seed falla
- Revisa que `DB_SYNC=true` (crea tablas automáticamente)
- Si la BD está vacía, `AUTO_SEED=true` ejecuta el seed al iniciar
- Si el seed ya se ejecutó antes, la tabla usuario tiene datos y no se repite

### Conexión a BD
- Render PostgreSQL solo acepta conexiones SSL
- Asegúrate de que `DATABASE_SSL=true`
- El backend usa `{ rejectUnauthorized: false }` para SSL

### Frontend no carga
- Verifica que la compilación Angular no tenga errores
- Revisa que el `nginx.conf` use `listen 80` (Render detecta EXPOSE 80)
