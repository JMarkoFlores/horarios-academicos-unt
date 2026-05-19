# Bloque 2 — Motor de asignación + Ventanas + WebSockets

## Módulos implementados
- **Horarios**: Módulo principal para la gestión de horarios académicos (`/horarios`).
  - `POST /horarios/generar`
  - `POST /horarios/limpiar`
  - `GET /horarios/periodo/:periodo`
  - `GET /horarios/docente/:id`
  - `GET /horarios/ambiente/:id`
  - `PUT /horarios/:id/reasignar`
  - `POST /horarios/:id/resolver-conflicto`
- **Ventanas**: Gestión de ventanas de atención y selecciones temporales (`/ventanas`).
  - `POST /ventanas`
  - `POST /ventanas/configurar-periodo`
  - `POST /ventanas/:id/iniciar`
  - `POST /ventanas/:id/siguiente`
  - `POST /ventanas/:id/ausente`
  - `GET /ventanas/:id/cola`
  - `POST /ventanas/:id/celda`
  - `DELETE /ventanas/:id/celda`
  - `POST /ventanas/:id/confirmar`
  - `GET /ventanas/:id/disponibilidad-matriz`
- **Preasignaciones**: Gestión de pre-asignaciones manuales antes de la generación (`/preasignaciones`).
  - `POST /preasignaciones`
  - `GET /preasignaciones`
  - `DELETE /preasignaciones/:id`
  - `POST /preasignaciones/cargar-plantilla`
- **Auditoría**: Registro de los cambios en los horarios y acciones manuales (`/auditoria`).
  - `GET /auditoria`

## Cómo probar el flujo completo
Paso 1: POST /horarios/generar con { "periodo": "2026-I" }
Paso 2: GET /horarios/periodo/2026-I para ver el resultado
Paso 3: POST /ventanas/configurar-periodo para generar el calendario
Paso 4: POST /ventanas/:id/iniciar para cargar la cola
Paso 5: POST /ventanas/:id/siguiente para llamar al primer docente
Paso 6: POST /ventanas/:id/celda para seleccionar 2 celdas
Paso 7: POST /ventanas/:id/confirmar para confirmar el turno
Paso 8: GET /horarios/docente/:id?periodo=2026-I para ver el resultado

## Variables de entorno necesarias
Asegúrate de agregar/configurar las siguientes variables en tu `.env` u `.env.example`:
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`
- `REDIS_TTL=300`
- `FRONTEND_URL=http://localhost:3000` (o la ruta correspondiente a tu frontend)

## WebSocket
Para comprobar el correcto funcionamiento de WebSockets, los eventos de Redis Pub/Sub y el gateway, puedes conectarte usando `wscat`:
```bash
wscat -c ws://localhost:3000/horarios
```
Al conectar puedes probar comandos enviando:
```json
{"event":"ping","data":{}}
```
Deberías obtener de respuesta un `"pong"`. Y a medida que ejecutes los endpoints de `Ventanas`, recibirás los eventos en tiempo real.
