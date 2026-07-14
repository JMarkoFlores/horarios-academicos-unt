# Manual de Instalación — Sistema Horarios UNT

Este documento describe paso a paso cómo instalar, configurar y poner en marcha el **Sistema de Gestión de Horarios y Carga Académica Docente de la Universidad Nacional de Trujillo (UNT)** en un entorno Windows. Las instrucciones incluyen desarrollo local, ejecución con Docker Compose y despliegue en Render.

---

## 1. Requisitos previos

Antes de comenzar, asegúrate de contar con las siguientes herramientas instaladas y configuradas en tu equipo Windows:

| Herramienta | Versión mínima | Observación |
|-------------|----------------|-------------|
| Node.js     | 20.x           | Descargar desde [nodejs.org](https://nodejs.org/). Incluye npm. |
| npm         | 10.x           | Se instala junto con Node.js. Verificar con `npm -v`. |
| Docker      | 24.x           | Instalar **Docker Desktop para Windows**. Asegurar que WSL2 esté habilitado. |
| Docker Compose | 2.x        | Incluido en Docker Desktop. |
| Git         | 2.x            | Descargar desde [git-scm.com](https://git-scm.com/). |

### Recomendaciones para Windows

- Ejecuta PowerShell o el símbolo del sistema como **administrador** al instalar dependencias globales.
- Configura Docker Desktop para usar el backend de **WSL2** en lugar de Hyper-V para mejor rendimiento.
- Si utilizas WSL2, los comandos de Linux también son válidos; este manual utiliza comandos compatibles con PowerShell.

---

## 2. Variables de entorno

El proyecto utiliza dos archivos de variables de entorno principales. Ambos deben crearse a partir de los archivos de ejemplo incluidos en el repositorio.

### 2.1 Variables del proyecto raíz (`.env`)

Estas variables configuran los contenedores de infraestructura (PostgreSQL, Redis, pgAdmin) y los parámetros generales del sistema.

En PowerShell, ejecuta:

```powershell
Copy-Item .env.example .env
```

| Variable | Valor por defecto | Propósito |
|----------|-------------------|-----------|
| `POSTGRES_CONTAINER_NAME` | `horarios_postgres` | Nombre del contenedor de PostgreSQL. |
| `POSTGRES_PORT` | `5432` | Puerto interno del contenedor de PostgreSQL. |
| `POSTGRES_DB` | `horarios_unt` | Nombre de la base de datos. |
| `POSTGRES_USER` | `unt_user` | Usuario de PostgreSQL. |
| `POSTGRES_PASSWORD` | `unt_pass123` | Contraseña de PostgreSQL. |
| `PGADMIN_CONTAINER_NAME` | `horarios_pgadmin` | Nombre del contenedor de pgAdmin. |
| `PGADMIN_PORT` | `5052` | Puerto expuesto en el host para pgAdmin. |
| `PGADMIN_DEFAULT_EMAIL` | `admin@localhost.com` | Correo de acceso a pgAdmin. |
| `PGADMIN_DEFAULT_PASSWORD` | `admin123` | Contraseña de acceso a pgAdmin. |
| `REDIS_CONTAINER_NAME` | `horarios_redis` | Nombre del contenedor de Redis. |
| `REDIS_PORT` | `6380` | Puerto expuesto en el host para Redis. |
| `REDIS_HOST` | `redis` | Host interno de Redis dentro de la red de Docker. |
| `REDIS_TTL` | `300` | Tiempo de vida por defecto de la caché en segundos. |
| `REDIS_URL` | `redis://redis:6379` | URL de conexión interna a Redis. |
| `BACKEND_CONTAINER_NAME` | `horarios_backend` | Nombre del contenedor del backend. |
| `BACKEND_PORT` | `3000` | Puerto expuesto en el host para el backend. |
| `FRONTEND_CONTAINER_NAME` | `horarios_frontend` | Nombre del contenedor del frontend. |
| `FRONTEND_PORT` | `8080` | Puerto expuesto en el host para el frontend (Nginx). |
| `JWT_SECRET` | `cambia-este-secreto-en-produccion` | Secreto para firmar tokens JWT. |
| `JWT_EXPIRACION` | `8h` | Tiempo de expiración de los tokens JWT. |
| `NODE_ENV` | `production` | Modo de ejecución (`development` o `production`). |
| `FRONTEND_URL` | `http://localhost:8080` | URL del frontend, utilizada para CORS. |
| `GROQ_API_KEY` | *(vacío)* | Clave de API para el chatbot con GROQ. |
| `GEMINI_API_KEY` | *(vacío)* | Clave de API para el chatbot con Gemini. |
| `CLOUDINARY_CLOUD_NAME` | *(vacío)* | Nombre de cuenta de Cloudinary. |
| `CLOUDINARY_API_KEY` | *(vacío)* | Clave de API de Cloudinary. |
| `CLOUDINARY_API_SECRET` | *(vacío)* | Secreto de API de Cloudinary. |

### 2.2 Variables del backend (`backend/.env`)

Estas variables son necesarias cuando se ejecuta el backend de forma local, fuera de Docker.

En PowerShell, ejecuta:

```powershell
Copy-Item backend\.env.example backend\.env
```

| Variable | Valor recomendado para desarrollo local en Windows | Propósito |
|----------|------------------------------------------------------|-----------|
| `DATABASE_HOST` | `localhost` | Host donde corre PostgreSQL. |
| `DATABASE_PORT` | `5433` | Puerto expuesto en el host para PostgreSQL (Docker Compose mapea `5433:5432`). |
| `DATABASE_NAME` | `horarios_unt` | Nombre de la base de datos. |
| `DATABASE_USER` | `unt_user` | Usuario de PostgreSQL. |
| `DATABASE_PASSWORD` | `unt_pass123` | Contraseña de PostgreSQL. |
| `JWT_SECRET` | `horarios_unt_secret_2026` | Secreto para firmar JWT. |
| `JWT_EXPIRACION` | `8h` | Expiración de JWT. |
| `REDIS_HOST` | `localhost` | Host donde corre Redis. |
| `REDIS_PORT` | `6380` | Puerto expuesto en el host para Redis (Docker Compose mapea `6380:6379`). |
| `REDIS_TTL` | `300` | Tiempo de vida de la caché. |
| `REDIS_URL` | `redis://localhost:6380` | URL de conexión a Redis desde el host. |
| `NODE_ENV` | `development` | Modo de ejecución del backend. |
| `PORT` | `3000` | Puerto en el que escucha el backend. |
| `FRONTEND_URL` | `http://localhost:4200` | URL del frontend para configurar CORS. |
| `GROQ_API_KEY` | *(vacío)* | Clave del chatbot IA. |
| `CLOUDINARY_CLOUD_NAME` | *(vacío)* | Configuración de Cloudinary para almacenamiento de firmas. |
| `CLOUDINARY_API_KEY` | *(vacío)* | Clave de Cloudinary. |
| `CLOUDINARY_API_SECRET` | *(vacío)* | Secreto de Cloudinary. |
| `CORREO_HOST` | `smtp.gmail.com` | Servidor SMTP para notificaciones. |
| `CORREO_PORT` | `587` | Puerto SMTP. |
| `CORREO_USER` | *(configurar)* | Cuenta de correo emisora. |
| `CORREO_PASS` | *(configurar)* | Contraseña o clave de aplicación del correo. |
| `TELEGRAM_BOT_TOKEN` | *(vacío)* | Token del bot de Telegram para alertas. |
| `ALERTA_DISTANCIA_MAX` | `50` | Distancia máxima para alertas geográficas. |
| `UMBRAL_DESEQUILIBRIO` | `4` | Umbral de desequilibrio de carga. |

> **Importante:** No comitees archivos `.env` con credenciales reales. Verifica que estén incluidos en `.gitignore`.

---

## 3. Instalación del backend

El backend está construido con **NestJS 10** y **TypeScript**. A continuación se describe la instalación para desarrollo local en Windows, utilizando PostgreSQL y Redis mediante Docker Compose.

### 3.1 Levantar la infraestructura de base de datos y caché

Desde la raíz del proyecto, ejecuta:

```powershell
docker-compose up -d postgres redis pgadmin mailhog
```

**Propósito:** Inicia los contenedores necesarios para que el backend funcione:
- `postgres`: base de datos PostgreSQL 16.
- `redis`: servidor de caché Redis 7.
- `pgadmin`: interfaz web para administrar PostgreSQL.
- `mailhog`: servidor SMTP de prueba para capturar correos electrónicos.

Espera unos segundos hasta que los healthchecks indiquen que los servicios están saludables.

### 3.2 Instalar dependencias del backend

```powershell
cd backend
npm install
```

**Propósito:** Descarga todas las dependencias de Node.js definidas en `backend/package.json`.

### 3.3 Ejecutar el seed inicial

```powershell
npm run seed
```

**Propósito:** Puebla la base de datos con datos de prueba: usuarios, docentes, cursos, ambientes, configuración institucional, horarios, etc.

Credenciales de prueba generadas por el seed (todos con contraseña `Admin123!`):

| Rol | Email |
|-----|-------|
| Administrador del Sistema | `admin@unt.edu.pe` |
| Director de Escuela | `director@unt.edu.pe` |
| Coordinador Académico | `coordinador@unt.edu.pe` |
| Operador de Horarios | `operador@unt.edu.pe` |
| Docente | `docente@unt.edu.pe` |

### 3.4 Iniciar el backend en modo desarrollo

```powershell
npm run start:dev
```

**Propósito:** Levanta la API REST en `http://localhost:3000` con recarga en caliente (hot-reload).

Al iniciar, el sistema también expone:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/health`

### 3.5 Scripts adicionales del backend

| Comando | Propósito |
|---------|-----------|
| `npm run build` | Compila la aplicación para producción. |
| `npm run start:prod` | Ejecuta la aplicación ya compilada. |
| `npm run lint` | Ejecuta ESLint y corrige errores de estilo. |
| `npm test` | Ejecuta los tests unitarios con Jest. |
| `npm run test:cov` | Ejecuta los tests y genera reporte de cobertura. |
| `npm run test:e2e` | Ejecuta tests end-to-end. |
| `npm run migration:run` | Ejecuta migraciones pendientes de TypeORM. |
| `npm run migration:generate -- --name NombreMigracion` | Genera una nueva migración a partir de los cambios en las entidades. |
| `npm run migration:revert` | Revierte la última migración aplicada. |
| `npm run seed:horarios-ciclo-I` | Carga horarios del ciclo I. |
| `npm run seed:horarios-ciclo-III` | Carga horarios del ciclo III. |
| `npm run seed:horarios-ciclo-V` | Carga horarios del ciclo V. |
| `npm run seed:horarios-ciclo-VII` | Carga horarios del ciclo VII. |
| `npm run seed:horarios-ciclo-IX` | Carga horarios del ciclo IX. |

---

## 4. Instalación del frontend

El frontend está construido con **Angular 17** y **Angular Material**.

### 4.1 Instalar dependencias del frontend

En una nueva ventana de PowerShell, desde la raíz del proyecto ejecuta:

```powershell
cd frontend
npm install
```

**Propósito:** Descarga las dependencias de Angular y las bibliotecas de terceros definidas en `frontend/package.json`.

### 4.2 Iniciar el frontend en modo desarrollo

```powershell
npx ng serve --port 4200
```

**Propósito:** Levanta el servidor de desarrollo de Angular en `http://localhost:4200` con recarga en caliente.

### 4.3 Scripts adicionales del frontend

| Comando | Propósito |
|---------|-----------|
| `npm run start` | Alias de `ng serve` (puerto 4200 por defecto). |
| `npm run build` | Compila la aplicación para producción. |
| `npm run watch` | Compila en modo desarrollo y observa cambios. |
| `npm test` | Ejecuta tests unitarios con Karma/Jasmine. |
| `npm run test:headless` | Ejecuta tests unitarios sin abrir el navegador. |

---

## 5. Configuración con Docker

Docker permite levantar de forma aislada los servicios de base de datos, caché y, opcionalmente, el backend y el frontend.

### 5.1 Levantar solo la infraestructura (desarrollo local)

```powershell
docker-compose up -d postgres redis pgadmin mailhog
```

**Propósito:** Inicia PostgreSQL, Redis, pgAdmin y MailHog, dejando libres los puertos 3000 y 4200 para ejecutar backend y frontend localmente con hot-reload.

### 5.2 Verificar que los contenedores estén corriendo

```powershell
docker-compose ps
```

**Propósito:** Muestra el estado de los contenedores activos, sus puertos y su healthcheck.

### 5.3 Detener la infraestructura

```powershell
docker-compose down
```

**Propósito:** Detiene y elimina los contenedores. Los datos persistentes se conservan en los volúmenes de Docker.

### 5.4 Detener y eliminar contenedores junto con volúmenes

```powershell
docker-compose down -v
```

**Propósito:** Elimina también los volúmenes, borrando todos los datos de la base de datos y la caché. Úsalo con precaución.

### 5.5 Construir imágenes Docker del backend y frontend

Si deseas ejecutar el backend y el frontend como contenedores, primero construye sus imágenes:

```powershell
# Backend
cd backend
docker build -t horarios-backend .

# Frontend
cd ../frontend
docker build -t horarios-frontend .
```

**Propósito:** Genera imágenes de producción optimizadas para cada capa de la aplicación.

### 5.6 Comandos Docker útiles en Windows

| Comando | Propósito |
|---------|-----------|
| `docker-compose logs -f` | Muestra logs de todos los servicios en tiempo real. |
| `docker-compose logs -f postgres` | Muestra logs solo de PostgreSQL. |
| `docker-compose logs -f redis` | Muestra logs solo de Redis. |
| `docker-compose exec postgres psql -U unt_user -d horarios_unt` | Accede a la consola de PostgreSQL. |
| `docker-compose exec redis redis-cli` | Accede a la consola de Redis. |
| `docker system prune` | Limpia imágenes, contenedores y redes no utilizados. |

---

## 6. Despliegue en Render

El proyecto incluye un blueprint de Render en `render.yaml` que permite aprovisionar automáticamente los servicios en la nube.

### 6.1 Requisitos

- Cuenta activa en [Render](https://render.com/).
- Repositorio en GitHub con acceso concedido a Render.

### 6.2 Despliegue automático con Blueprint

1. Ingresa al [Render Dashboard](https://dashboard.render.com).
2. Haz clic en **New + → Blueprint**.
3. Conecta tu repositorio de GitHub.
4. Render detectará automáticamente el archivo `render.yaml` y mostrará los servicios a crear:
   - `horarios-db` — PostgreSQL.
   - `horarios-redis` — Redis.
   - `horarios-backend` — API NestJS (Docker).
   - `horarios-frontend` — Angular + Nginx (Docker).
5. Revisa los nombres y planes de los servicios.
6. Haz clic en **Apply**.
7. Espera aproximadamente 5 a 10 minutos mientras Render aprovisiona y despliega los servicios.

### 6.3 Variables de entorno en Render

El archivo `render.yaml` configura automáticamente las siguientes variables críticas:

| Variable | Valor / Origen |
|----------|----------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_HOST` | Host interno de PostgreSQL proporcionado por Render. |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | `horarios_db` |
| `DATABASE_USER` | `horarios` |
| `DATABASE_PASSWORD` | Contraseña generada por Render. |
| `DATABASE_SSL` | `true` |
| `DB_SYNC` | `true` |
| `AUTO_SEED` | `true` |
| `REDIS_HOST` | Host interno de Redis proporcionado por Render. |
| `REDIS_PORT` | `6379` |
| `REDIS_TTL` | `1800` |
| `JWT_SECRET` | Valor generado automáticamente por Render. |
| `JWT_EXPIRACION` | `7d` |
| `FRONTEND_URL` | `https://horarios-frontend.onrender.com` |

### 6.4 Seed inicial en Render

El backend ejecuta automáticamente el seed la primera vez que se inicia si la tabla `usuario` está vacía. Esto ocurre gracias a la variable `AUTO_SEED=true` configurada en `render.yaml`.

Todos los usuarios demo tienen la contraseña `Admin123!` y el indicador `debe_cambiar_password: true`.

### 6.5 URLs esperadas en producción

| Servicio | URL |
|----------|-----|
| Frontend | `https://horarios-frontend.onrender.com` |
| API | `https://horarios-backend.onrender.com` |
| Swagger Docs | `https://horarios-backend.onrender.com/api/docs` |
| Health Check | `https://horarios-backend.onrender.com/health` |

### 6.6 Actualizar el despliegue

Cada vez que hagas push a la rama conectada en GitHub, Render detectará el cambio y desplegará automáticamente.

Si encuentras problemas de caché, ve al servicio en Render y selecciona **Manual Deploy → Clear build cache & deploy**.

---

## 7. CI/CD con GitHub Actions

El repositorio cuenta con tres workflows en la carpeta `.github/workflows/` que automatizan la integración y el despliegue continuo.

### 7.1 `ci.yml` — Integración continua

Se ejecuta automáticamente en cada push o pull request hacia las ramas `main` y `develop`.

Incluye los siguientes jobs:

- **backend-ci:**
  - Instala dependencias con `npm ci`.
  - Ejecuta lint con `npm run lint`.
  - Compila el backend con `npm run build`.
  - Levanta PostgreSQL 15 y Redis 7 como servicios de GitHub Actions.
  - Sincroniza el esquema de base de datos con `npx ts-node test/sync-db.ts`.
  - Ejecuta tests unitarios e integración con `npm run test:cov`.
  - Sube el reporte de cobertura como artefacto.

- **frontend-ci:**
  - Instala dependencias con `npm ci`.
  - Compila el frontend con `npm run build`.
  - Ejecuta tests unitarios headless.
  - Sube el reporte de cobertura como artefacto.

- **e2e-tests:**
  - Depende de que `backend-ci` y `frontend-ci` finalicen correctamente.
  - Instala dependencias del backend y frontend.
  - Instala navegadores de Playwright.
  - Sincroniza el esquema de base de datos.
  - Ejecuta el seed con `npm run seed`.
  - Levanta el backend con `npm run start`.
  - Ejecuta tests end-to-end con Playwright.
  - Sube el reporte de Playwright como artefacto.

### 7.2 `pr-check.yml` — Verificación de pull requests

Se ejecuta en cada pull request hacia la rama `develop`.

- Valida que el nombre de la rama cumpla con el patrón `feature/*` o `hotfix/*`.
- Compila el backend con `npm run build`.
- Compila el frontend con `npx ng build --configuration=production`.
- Si algún paso falla, publica un comentario automático en el pull request.

### 7.3 `deploy.yml` — Despliegue continuo

Se ejecuta automáticamente en cada push a la rama `main`.

El workflow realiza lo siguiente:

1. Construye las imágenes Docker del backend y del frontend.
2. Publica las imágenes en GitHub Container Registry (GHCR).
3. Se conecta por SSH al servidor de producción.
4. Descarga las nuevas imágenes y reinicia los contenedores con `docker-compose pull && docker-compose up -d`.

### 7.4 Secretos requeridos para el despliegue

Para que `deploy.yml` funcione correctamente, debes configurar los siguientes secretos en GitHub:

| Secreto | Descripción |
|---------|-------------|
| `GHCR_TOKEN` | Token de acceso personal con permisos para escribir paquetes en GHCR. |
| `SERVER_HOST` | Dirección IP o dominio del servidor de producción. |
| `SERVER_USER` | Usuario SSH del servidor de producción. |
| `SERVER_SSH_KEY` | Clave privada SSH para conectarse al servidor. |

---

## 8. Logs

### 8.1 Logs del backend en desarrollo local

Al ejecutar `npm run start:dev`, los logs se muestran directamente en la consola de PowerShell.

### 8.2 Logs del frontend en desarrollo local

Al ejecutar `npx ng serve --port 4200`, los logs de Angular CLI se muestran en la consola.

### 8.3 Logs con Docker Compose

```powershell
# Logs de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Propósito:** Permite diagnosticar errores, ver consultas a la base de datos y monitorear el comportamiento de los servicios en tiempo real.

### 8.4 Health checks

Puedes verificar que el backend responde correctamente con:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/health -Method Get
```

Para el frontend servido por Nginx en contenedor:

```powershell
Invoke-RestMethod -Uri http://localhost/health -Method Get
```

---

## 9. Backup

### 9.1 Backup de la base de datos PostgreSQL

Desde PowerShell, ejecuta el siguiente comando para generar un archivo SQL con el contenido completo de la base de datos:

```powershell
docker exec -i horarios_postgres pg_dump -U unt_user -d horarios_unt > backup_horarios.sql
```

**Propósito:** Crea una copia de seguridad portable que puede restaurarse en otro servidor o contenedor PostgreSQL.

### 9.2 Restauración de la base de datos

Para restaurar la base de datos desde un archivo de backup:

```powershell
Get-Content backup_horarios.sql | docker exec -i horarios_postgres psql -U unt_user -d horarios_unt
```

**Propósito:** Recupera el estado completo de la base de datos a partir de un backup previamente generado.

### 9.3 Backup del volumen de PostgreSQL

Para respaldar el volumen completo de Docker como archivo comprimido:

```powershell
docker run --rm -v horarios_postgres_data:/source -v ${PWD}:/backup alpine tar czf /backup/postgres_data.tar.gz -C /source .
```

**Propósito:** Realiza un backup a bajo nivel del volumen de datos, útil para migraciones completas del entorno.

### 9.4 Backup de Redis

Para exportar el contenido de Redis a un archivo:

```powershell
docker exec horarios_redis redis-cli --rdb /data/dump.rdb
Copy-Item "$(docker inspect -f '{{ .Mounts }}' horarios_redis | Select-String -Pattern 'Source=([^;]+)').Matches.Groups[1].Value\dump.rdb" .
```

**Propósito:** Conserva el estado de la caché y las sesiones activas.

---

## 10. Troubleshooting

### 10.1 Error de conexión del backend a PostgreSQL

**Síntoma:** El backend muestra errores como `ECONNREFUSED` o `role "unt_user" does not exist`.

**Solución:**
1. Verifica que el contenedor esté corriendo:
   ```powershell
   docker-compose ps
   ```
2. Revisa los logs de PostgreSQL:
   ```powershell
   docker-compose logs -f postgres
   ```
3. Asegúrate de que en `backend/.env` tengas:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5433
   DATABASE_NAME=horarios_unt
   DATABASE_USER=unt_user
   DATABASE_PASSWORD=unt_pass123
   ```
4. Confirma que puedes conectarte:
   ```powershell
   docker exec -it horarios_postgres psql -U unt_user -d horarios_unt
   ```

### 10.2 Error de conexión del backend a Redis

**Síntoma:** Errores de caché o WebSocket.

**Solución:**
1. Verifica que Redis responda:
   ```powershell
   docker exec -it horarios_redis redis-cli ping
   ```
2. Debe responder `PONG`.
3. Asegúrate de que en `backend/.env` tengas:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6380
   ```

### 10.3 El backend no arranca después de cambiar entidades

**Síntoma:** Errores del tipo `relation "X" does not exist`.

**Solución:**
1. Si estás en desarrollo con `synchronize: true`, reinicia el backend:
   ```powershell
   npm run start:dev
   ```
2. Si usas migraciones formales, ejecuta:
   ```powershell
   npm run migration:run
   ```

### 10.4 Error de CORS en el frontend

**Síntoma:** El navegador bloquea peticiones al backend con errores de CORS.

**Solución:**
1. Verifica que `FRONTEND_URL` en el backend coincida exactamente con la URL desde donde accedes al frontend.
2. En desarrollo local, debe ser:
   ```env
   FRONTEND_URL=http://localhost:4200
   ```
3. Reinicia el backend después de modificar la variable.

### 10.5 El frontend no carga rutas directas

**Síntoma:** Al acceder directamente a `http://localhost/app/dashboard` aparece un error 404.

**Solución:**
1. Verifica que la configuración de Nginx (`frontend/nginx.conf`) incluya:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```
2. Si usas `ng serve` en desarrollo, Angular CLI maneja automáticamente el routing.

### 10.6 El seed no se ejecuta

**Síntoma:** La base de datos permanece vacía después de iniciar el backend.

**Solución:**
1. El seed automático solo se ejecuta si `AUTO_SEED=true` y la tabla `usuario` está vacía.
2. Para forzar el seed en desarrollo local:
   ```powershell
   cd backend
   npm run seed
   ```
3. Si necesitas vaciar la base de datos antes, elimina y recrea el volumen:
   ```powershell
   docker-compose down -v
   docker-compose up -d postgres redis
   ```

### 10.7 Problemas en Render: backend no inicia

**Síntoma:** El servicio `horarios-backend` muestra error o no pasa el health check.

**Solución:**
1. Revisa los logs en el Render Dashboard.
2. Verifica que `horarios-db` y `horarios-redis` estén en estado **Available**.
3. Confirma que `DATABASE_SSL=true` esté configurado, ya que Render PostgreSQL requiere SSL.
4. Si aparece `relation does not exist`, realiza un **Manual Deploy → Deploy** para reiniciar el backend.

### 10.8 Problemas en Render: frontend no carga

**Síntoma:** La URL del frontend no responde o muestra una pantalla en blanco.

**Solución:**
1. Verifica en el Render Dashboard que el build de Angular no tenga errores.
2. Asegúrate de que el `Dockerfile` del frontend exponga el puerto 80.
3. Revisa que `nginx.conf` esté copiado correctamente en la imagen.
4. Realiza un **Manual Deploy → Clear build cache & deploy** si sospechas de caché corrupta.

### 10.9 Docker Desktop no responde en Windows

**Síntoma:** Los comandos `docker-compose` fallan con errores de demonio.

**Solución:**
1. Asegúrate de que Docker Desktop esté en ejecución.
2. Verifica que WSL2 esté habilitado y funcionando:
   ```powershell
   wsl --status
   ```
3. Reinicia Docker Desktop si es necesario.
4. Si usas PowerShell, ejecuta la terminal como administrador.

---

## Notas finales

- Este manual asume un entorno de desarrollo en Windows con Docker Desktop y WSL2.
- Para producción, utiliza contraseñas seguras, certificados SSL y revise las políticas de backup de tu institución.
- Mantén actualizadas las variables de entorno y los secretos de GitHub conforme evolucione el proyecto.
