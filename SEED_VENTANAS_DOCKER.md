# Seed para Modo Ventanas - Instrucciones Docker

## 🐳 Ejecutar Seed en Docker

### Paso 1: Copiar el archivo SQL al contenedor

```bash
# Desde la raíz del proyecto
docker cp backend/scripts/seed-modo-ventanas.sql <nombre_contenedor_postgres>:/tmp/
```

> Tip: Para encontrar el nombre del contenedor de PostgreSQL:
> ```bash
> docker ps
> ```
> Busca el contenedor con la imagen postgres (ej: `horarios-academicos-unt-db-1`)

### Paso 2: Ejecutar el seed dentro del contenedor

```bash
# Ejecutar el script SQL
docker exec -it <nombre_contenedor_postgres> psql -U unt_user -d horarios_unt -f /tmp/seed-modo-ventanas.sql
```

### Paso 3: Verificar la ejecución

```bash
# Conectar a la base de datos y verificar
docker exec -it <nombre_contenedor_postgres> psql -U unt_user -d horarios_unt -c "
SELECT 
    '2026-I-TEST' as periodo,
    'VENTANAS' as modo,
    (SELECT COUNT(*) FROM ventana_atencion WHERE periodo = '2026-I-TEST') as ventanas,
    (SELECT COUNT(*) FROM cola_docentes cd 
     JOIN ventana_atencion v ON cd.ventana_id = v.id 
     WHERE v.periodo = '2026-I-TEST') as docentes_en_cola;
"
```

### Paso 4: Acceder a la aplicación

```
Frontend: http://localhost:4200
Backend:  http://localhost:3000/api
```

---

## 📝 Comando alternativo: Ejecutar todo en una línea

```bash
docker exec -i <nombre_contenedor_postgres> psql -U unt_user -d horarios_unt < backend/scripts/seed-modo-ventanas.sql
```

---

## 🗄️ Datos creados por el seed

| Entidad | Cantidad | Descripción |
|---------|----------|-------------|
| Período | 1 | `2026-I-TEST` en modo **VENTANAS** |
| Campaña | 1 | Campaña Principal 2026-I |
| Ventanas | 6 | Por categoría y modalidad |
| Colas | ~15-18 | 3 docentes por ventana |

### Distribución de ventanas:

| # | Fecha | Categoría | Modalidad | Horario |
|---|-------|-----------|-----------|---------|
| 1 | 2026-03-20 | PRINCIPAL | NOMBRADO | 08:00-10:00 |
| 2 | 2026-03-22 | ASOCIADO | NOMBRADO | 09:00-11:00 |
| 3 | 2026-03-24 | AUXILIAR | NOMBRADO | 10:00-12:00 |
| 4 | 2026-03-27 | PRINCIPAL | CONTRATADO | 14:00-16:00 |
| 5 | 2026-03-29 | ASOCIADO | CONTRATADO | 15:00-17:00 |
| 6 | 2026-03-31 | AUXILIAR | CONTRATADO | 16:00-18:00 |

---

## 🧪 Flujo de prueba con Docker

### 1. Preparar entorno
```bash
# Verificar que Docker está corriendo
docker-compose ps

# Si no está corriendo, iniciar
docker-compose up -d
```

### 2. Ejecutar seed
```bash
docker cp backend/scripts/seed-modo-ventanas.sql horarios-academicos-unt-db-1:/tmp/
docker exec -it horarios-academicos-unt-db-1 psql -U unt_user -d horarios_unt -f /tmp/seed-modo-ventanas.sql
```

### 3. Acceder al frontend
```
http://localhost:4200
```

### 4. Cambiar al período de prueba
- Usar el selector de período en la parte superior
- Seleccionar: `2026-I-TEST`

### 5. Ir a Configuración → Modo de Período
- Verificar que el modo esté en "Ventanas de Atención"
- Intentar cambiar el modo (debería estar bloqueado si hay horarios)

### 6. Ir a Panel de Operador (`/app/operador`)
- Ver las 6 ventanas programadas
- Seleccionar una ventana
- Click en "Iniciar Ventana"
- Ver la cola de docentes

---

## 🔄 Cambio de Modo (Nueva ubicación)

El cambio de modo ahora está en:
```
/app/configuracion → Tab "Modo de Período"
```

**Características:**
- Modo por defecto: **Ventanas de Atención**
- Validación: No se puede cambiar si hay horarios asignados
- Opciones disponibles:
  - **Ventanas de Atención** (recomendado por defecto)
  - **Generación Automática**
  - **Modo Mixto**

---

## 🎯 Gestión de Horarios (Tab en /app/horarios)

El tab "Gestión" en la ruta `/app/horarios` incluye:

### Generación Automática
- Ejecuta el motor de horarios
- Muestra resultado con asignaciones y conflictos
- Botón: "Ejecutar Motor"

### Reinicio de Período  
- Elimina TODOS los horarios del período
- Requiere doble confirmación
- **⚠️ Acción irreversible**
- Botón: "Limpiar Todo"

---

## 🔧 Solución de problemas

### Error: "relation does not exist"
```bash
# Asegurar que las migraciones se ejecutaron
docker exec -it <nombre_contenedor_backend> npm run migration:run
```

### Error: "permission denied"
```bash
# Verificar usuario de PostgreSQL
docker exec -it <nombre_contenedor_postgres> psql -U postgres -c "\du"
```

### No hay docentes para asignar
```bash
# Verificar que existen docentes
docker exec -it <nombre_contenedor_postgres> psql -U unt_user -d horarios_unt -c "SELECT COUNT(*) FROM docente;"
```

---

## 📝 Resumen de cambios implementados

1. ✅ **Tab "Modo de Período"** en configuración
   - Selector de modo (VENTANAS/AUTOMATICA/MIXTA)
   - Default: VENTANAS
   - Validaciones de cambio

2. ✅ **Tab "Gestión"** en horarios
   - Generación automática
   - Reinicio de período (eliminar horarios)

3. ✅ **Seed SQL** para pruebas
   - Compatible con Docker
   - Período 2026-I-TEST listo para usar

