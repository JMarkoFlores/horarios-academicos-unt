# Todo dentro de docker:
1- docker compose exec backend node dist/src/database/seed.js

# Para autenticar
1- ADMIN: admin@unt.edu.pe Y Admin123!

# Guia de Ejecucion - Sistema de Horarios UNT

> **Estado:** Docker Compose ya esta corriendo (`docker compose up -d` ejecutado previamente).
> Este documento contiene los comandos exactos que debes ejecutar en **CMD de Windows** para levantar backend, aplicar migraciones, llenar la BD con seeders y correr el frontend.

---

## 1. Requisitos Previos (verifica que tengas esto)

- Node.js instalado (recomendado v18 o superior)
- npm instalado
- Docker Desktop corriendo
- Ya ejecutaste: `docker compose up -d`

---

## 2. Verificar que Docker este corriendo

Abre **CMD** en la carpeta raiz del proyecto (`C:\Users\jeanm\Downloads\App-Examen`) y ejecuta:

```cmd
docker compose ps
```

Debes ver estos contenedores **UP**:

| Servicio     | Puerto | Estado |
|-------------|--------|--------|
| horarios_postgres | 5433 | healthy |
| horarios_redis    | 6379 | healthy |
| horarios_pgadmin  | 5052 | up |
| horarios_mailhog  | 1025, 8025 | up |

---

## 3. Instalar dependencias del Backend

Abre **CMD** y navega a la carpeta `backend`:

```cmd
cd backend
npm install
```

---

## 4. Sincronizar Esquema de la Base de Datos (Reemplaza a migration:run)

> **IMPORTANTE:** En desarrollo se utiliza sincronización automática. Dado que algunas migraciones históricas no coinciden exactamente con el estado final de las entidades, **no ejecutes `npm run migration:run` en bases de datos vacías**, ya que fallará debido a la falta de tablas intermedias. En su lugar, inicializa el esquema directamente sincronizándolo desde las entidades de TypeScript.

Desde la carpeta `backend`, ejecuta:

```cmd
npm run typeorm schema:sync -- -d data-source.ts
```

Esto creará todas las tablas en PostgreSQL según el estado actual de tus entidades.

---

---

## 6. Llenar la Base de Datos con Seeders (Datos de prueba)

> **IMPORTANTE:** Esto inserta datos de prueba (facultades, escuelas, docentes, cursos, horarios, etc.). Ejecuta solo la primera vez.

Desde la carpeta `backend`:

```cmd
npm run seed
```

Este comando puede tardar unos minutos porque inserta muchos datos. Veras mensajes como:
- `Estructura base creada.`
- `Turnos por defecto creados.`
- `Horarios Ciclo I completados.`
- etc.

**Opcional:** Si quieres verificar que los datos se insertaron correctamente:

```cmd
npm run seed:verify
```

---

## 7. Levantar el Backend (Servidor API)

Desde la carpeta `backend`, en modo desarrollo (con hot-reload):

```cmd
npm run start:dev
```

El backend estara disponible en: **http://localhost:3000**

Documentacion Swagger: **http://localhost:3000/api**

> **Nota:** Deja esta terminal abierta. Para detener el backend presiona `Ctrl + C`.

---

## 8. Instalar dependencias del Frontend

Abre una **nueva ventana de CMD** (deja la del backend abierta) y navega a la carpeta `frontend`:

```cmd
cd frontend
npm install
```

---

## 9. Levantar el Frontend (Aplicacion Angular)

Desde la carpeta `frontend`:

```cmd
ng serve
```

O si no tienes Angular CLI instalado globalmente:

```cmd
npx ng serve
```

El frontend estara disponible en: **http://localhost:4200**

> **Nota:** Deja esta terminal abierta. Para detener el frontend presiona `Ctrl + C`.

---

## 10. Acceso a Herramientas de Desarrollo

| Herramienta | URL | Credenciales |
|------------|-----|-------------|
| Frontend Angular | http://localhost:4200 | - |
| Backend API | http://localhost:3000 | - |
| Swagger Docs | http://localhost:3000/api | - |
| pgAdmin (BD) | http://localhost:5052 | admin@localhost.com / admin123 |
| MailHog (Emails) | http://localhost:8025 | - |

---

## 11. Resumen de Comandos (Copiar y Pegar)

### Terminal 1 - Backend
```cmd
cd C:\Users\jeanm\Downloads\App-Examen\backend
npm install
npm run typeorm schema:sync -- -d data-source.ts
npm run seed
npm run start:dev
```

### Terminal 2 - Frontend
```cmd
cd C:\Users\jeanm\Downloads\App-Examen\frontend
npm install
ng serve
```

---

## 12. Solucion de Problemas Comunes

### Error: `cannot connect to database`
- Verifica que Docker este corriendo: `docker compose ps`
- Revisa que el archivo `backend/.env` tenga `DATABASE_HOST=localhost` y `DATABASE_PORT=5433`

### Error: `relation does not exist` o `column X does not exist`
- No ejecutaste la sincronización del esquema. Corre: `npm run typeorm schema:sync -- -d data-source.ts`

### Error: `port already in use`
- El puerto 3000 o 4200 esta ocupado. Cierra otras aplicaciones o cambia el puerto.

### Las tablas estan vacias
- No ejecutaste el seed. Corre: `npm run seed`

---

## 13. Comandos Utiles Adicionales

### Revertir ultima migracion
```cmd
npm run migration:revert
```

### Verificar seed
```cmd
npm run seed:verify
```

### Detener Docker
```cmd
docker compose down
```

### Detener Docker y borrar datos (CUIDADO)
```cmd
docker compose down -v
```

---

**Proyecto:** Sistema de Gestion de Horarios Academicos - UNT  
**Tecnologias:** NestJS + Angular + PostgreSQL + Redis + Docker
