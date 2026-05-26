# Guía de Despliegue en Render

Esta guía explica cómo desplegar el Sistema de Horarios Académicos UNT en Render usando Docker.

## Requisitos Previos

1. Cuenta en [Render](https://render.com/)
2. Repositorio en GitHub con el código del proyecto
3. Render debe tener acceso a tu repositorio de GitHub

## Estructura del Proyecto

```
horarios-academicos-unt/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.yml
└── render.yaml
```

## Despliegue Automático con render.yaml

Render puede desplegar automáticamente el proyecto usando el archivo `render.yaml`:

### Pasos:

1. **Conectar Repositorio a Render**
   - Ve a Render Dashboard
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub

2. **Usar render.yaml**
   - Render detectará automáticamente el archivo `render.yaml`
   - Configurará los servicios: backend, frontend, PostgreSQL y Redis
   - Las variables de entorno se configuran automáticamente

3. **Variables de Entorno Adicionales**
   - Después del despliegue inicial, configura las siguientes variables en el servicio backend:
     - `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram
     - `CORREO_HOST`, `CORREO_PORT`, `CORREO_USER`, `CORREO_PASS`: Configuración SMTP
     - `ALERTA_DISTANCIA_MAX`: Distancia máxima para alertas
     - `UMBRAL_DESEQUILIBRIO`: Umbral de desequilibrio

## Despliegue Manual

Si prefieres desplegar manualmente cada servicio:

### 1. Desplegar PostgreSQL

1. En Render Dashboard, crea un nuevo "PostgreSQL" database
2. Configura:
   - Database Name: `horarios_db`
   - User: `horarios`
   - Plan: Free (o el plan que prefieras)
3. Anota las credenciales proporcionadas por Render

### 2. Desplegar Redis

1. En Render Dashboard, crea un nuevo "Redis" instance
2. Configura:
   - Name: `horarios-redis`
   - Plan: Free
   - Maxmemory Policy: `allkeys-lru`
3. Anota las credenciales proporcionadas por Render

### 3. Desplegar Backend

1. Crea un nuevo "Web Service"
2. Configura:
   - Name: `horarios-backend`
   - Environment: Docker
   - Dockerfile Path: `./backend/Dockerfile`
   - Context: `./backend`
   - Branch: `main` (o tu rama principal)
3. Variables de Entorno:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `DATABASE_HOST`: (de PostgreSQL)
   - `DATABASE_PORT`: `5432`
   - `DATABASE_NAME`: `horarios_db`
   - `DATABASE_USER`: (de PostgreSQL)
   - `DATABASE_PASSWORD`: (de PostgreSQL)
   - `REDIS_HOST`: (de Redis)
   - `REDIS_PORT`: (de Redis)
   - `REDIS_TTL`: `1800`
   - `JWT_SECRET`: (genera uno seguro)
   - `JWT_EXPIRACION`: `7d`
   - `FRONTEND_URL`: (URL del frontend después de desplegar)
   - `TELEGRAM_BOT_TOKEN`: (tu token de Telegram)
   - `CORREO_HOST`: (tu servidor SMTP)
   - `CORREO_PORT`: `587`
   - `CORREO_USER`: (tu email SMTP)
   - `CORREO_PASS`: (tu contraseña SMTP)
   - `ALERTA_DISTANCIA_MAX`: `50`
   - `UMBRAL_DESEQUILIBRIO`: `4`

### 4. Desplegar Frontend

1. Crea un nuevo "Web Service"
2. Configura:
   - Name: `horarios-frontend`
   - Environment: Docker
   - Dockerfile Path: `./frontend/Dockerfile`
   - Context: `./frontend`
   - Branch: `main` (o tu rama principal)
3. No requiere variables de entorno adicionales

## Migraciones de Base de Datos

Después de desplegar el backend, necesitas ejecutar las migraciones de la base de datos:

1. Accede a la consola del servicio backend en Render
2. Ejecuta:
   ```bash
   npm run migration:run
   ```

## Verificar el Despliegue

1. **Backend Health Check**
   - Accede a `https://horarios-backend.onrender.com/health`
   - Deberías ver una respuesta exitosa

2. **Frontend Health Check**
   - Accede a `https://horarios-frontend.onrender.com/health`
   - Deberías ver "healthy"

3. **Aplicación**
   - Accede a `https://horarios-frontend.onrender.com`
   - La aplicación debería cargar correctamente

## Desarrollo Local con Docker

Para ejecutar el proyecto localmente usando Docker:

1. Copia `.env.example` a `.env` en la raíz del backend:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Actualiza las variables de entorno en `.env` según sea necesario

3. Ejecuta docker-compose:
   ```bash
   docker-compose up -d
   ```

4. Los servicios estarán disponibles en:
   - Frontend: http://localhost:80
   - Backend: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - PgAdmin: http://localhost:5050
   - Mailhog: http://localhost:8025

## Solución de Problemas

### Backend no se conecta a la base de datos
- Verifica que las variables de entorno de la base de datos sean correctas
- Asegúrate de que la base de datos esté en estado "Available" en Render

### Frontend no se conecta al backend
- Verifica que `FRONTEND_URL` en el backend apunte a la URL correcta del frontend
- Asegúrate de que el backend esté en estado "Available"

### Migraciones no se ejecutan
- Ejecuta las migraciones manualmente desde la consola del servicio backend
- Verifica que las credenciales de la base de datos sean correctas

### Redis connection errors
- Verifica que las credenciales de Redis sean correctas
- Asegúrate de que Redis esté en estado "Available"

## Variables de Entorno Importantes

### Backend
- `JWT_SECRET`: Debe ser una cadena segura y única para producción
- `DATABASE_PASSWORD`: Usar la generada por Render, no valores predeterminados
- `TELEGRAM_BOT_TOKEN`: Obtener de @BotFather en Telegram
- `CORREO_PASS`: Usar contraseñas de aplicación de Google, no la contraseña normal

### Frontend
- El frontend obtiene la URL del backend desde las variables de entorno del backend

## Actualizaciones

Para actualizar el despliegue:
1. Haz push de los cambios a GitHub
2. Render detectará automáticamente los cambios
3. Reconstruirá y desplegará las actualizaciones
4. Los servicios se reiniciarán con la nueva versión
