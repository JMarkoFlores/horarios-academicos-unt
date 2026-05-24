# Documentación de Entrega - Parte Daniel

Este documento detalla la implementación realizada en el backend para el sistema de gestión de horarios académicos, cubriendo los módulos de Ambientes, Docentes, Cursos, Grupos, Validaciones, y las lógicas avanzadas de Mapa y Análisis de Carga.

## 1. Endpoints implementados

### Módulo Ambientes (`/ambientes`)
| Método | Ruta | Descripción | Parámetros / Body |
|--------|------|-------------|-------------------|
| `GET` | `/ambientes` | Listar ambientes con filtros. | `page`, `limit`, `tipo`, `estado`, `activo`, `busqueda`, `pabellon`, `sede`, `capacidadMin`, `capacidadMax` |
| `GET` | `/ambientes/mapa` | Obtener datos para renderizar el mapa interactivo del campus. | Ninguno |
| `GET` | `/ambientes/distancia` | Calcular la distancia entre dos ambientes y evaluar si están en el mismo edificio. | `origenId`, `destinoId` |
| `GET` | `/ambientes/alertas-traslado` | Obtener alertas si un docente no tiene tiempo suficiente (≤ 30min) para moverse entre dos edificios distantes. | `docenteId`, `periodoId` |
| `GET` | `/ambientes/:id` | Obtener el detalle de un ambiente por ID. | `id` |
| `GET` | `/ambientes/:id/disponibilidad` | Obtener la disponibilidad de un ambiente. | `id`, `periodo`, `page`, `limit` |
| `POST` | `/ambientes` | Crear un nuevo ambiente. | `CreateAmbienteDto` |
| `PATCH` | `/ambientes/:id` | Actualizar un ambiente existente. | `id`, `UpdateAmbienteDto` |
| `DELETE` | `/ambientes/:id` | Desactivar un ambiente (soft delete). | `id` |

### Módulo Docentes (`/docentes`)
| Método | Ruta | Descripción | Parámetros / Body |
|--------|------|-------------|-------------------|
| `GET` | `/docentes` | Listar docentes paginado con filtros. | `page`, `limit`, `categoria`, `tipo_docente`, `busqueda`, `activo` |
| `GET` | `/docentes/jerarquia` | Listar docentes ordenados por jerarquía institucional y antigüedad. | `periodo` |
| `GET` | `/docentes/carga-desequilibrada` | Listar docentes cuya diferencia de carga máxima y mínima entre días exceda el umbral. | `periodo` |
| `GET` | `/docentes/:id/carga-por-dia` | Obtener la carga horaria semanal agrupada por día de un docente. | `id`, `periodo` |
| `GET` | `/docentes/:id` | Obtener docente por ID. | `id` |
| `POST` | `/docentes` | Crear nuevo docente. | `CreateDocenteDto` |
| `PATCH` | `/docentes/:id` | Actualizar datos de un docente. | `id`, `UpdateDocenteDto` |
| `DELETE` | `/docentes/:id` | Desactivar un docente (soft delete). | `id` |
| `PATCH` | `/docentes/:id/reactivar` | Reactivar un docente inactivo. | `id` |
| `POST` | `/docentes/:id/cursos` | Asignar cursos que puede dictar un docente. | `id`, `AsignarCursosDto` |
| `GET` | `/docentes/:id/cursos` | Listar cursos habilitados para el docente. | `id`, `tipo_clase`, `periodo` |
| `DELETE` | `/docentes/:id/cursos/:cursoId/:tipoclase` | Quitar asignación de curso al docente. | `id`, `cursoId`, `tipoclase` |
| `GET` | `/docentes/:id/ambientes` | Listar ambientes preferidos asignados al docente. | `id` |
| `POST` | `/docentes/:id/ambientes` | Asignar ambientes preferidos al docente. | `id`, `{ ambienteIds: number[] }` |

### Módulo Cursos (`/cursos`)
| Método | Ruta | Descripción | Parámetros / Body |
|--------|------|-------------|-------------------|
| `GET` | `/cursos` | Listar cursos con filtros. | `page`, `limit`, `busqueda`, `activo` |
| `GET` | `/cursos/:id` | Obtener detalle de curso por ID. | `id` |
| `GET` | `/cursos/:id/ambientes` | Listar ambientes asociados al curso. | `id` |
| `POST` | `/cursos` | Crear nuevo curso. | `CreateCursoDto` |
| `POST` | `/cursos/:id/ambientes` | Asignar ambientes compatibles a un curso. | `id`, `{ ambienteIds: number[] }` |
| `PATCH` | `/cursos/:id` | Actualizar un curso. | `id`, `UpdateCursoDto` |
| `PATCH` | `/cursos/:id/reactivar` | Reactivar un curso inactivo. | `id` |
| `DELETE` | `/cursos/:id` | Desactivar un curso (soft delete). | `id` |

### Módulo Grupos (`/grupos`)
| Método | Ruta | Descripción | Parámetros / Body |
|--------|------|-------------|-------------------|
| `GET` | `/grupos` | Listar grupos con filtros. | `page`, `limit`, `busqueda`, `cursoId`, `periodo` |
| `GET` | `/grupos/:id` | Obtener detalle de grupo. | `id` |
| `POST` | `/grupos` | Crear nuevo grupo. | `CreateGrupoDto` |
| `PATCH` | `/grupos/:id` | Actualizar grupo. | `id`, `UpdateGrupoDto` |
| `DELETE` | `/grupos/:id` | Eliminar grupo (físico o lógico). | `id` |

### Módulo Validaciones Comunes (`/validaciones`)
| Método | Ruta | Descripción | Parámetros / Body |
|--------|------|-------------|-------------------|
| `POST` | `/validaciones/cruce-docente` | Verifica si el docente tiene cruce horario. | `docenteId`, `diaSemana`, `horaInicio`, `horaFin`, `periodo` |
| `POST` | `/validaciones/cruce-ambiente` | Verifica cruce de ambiente. | `ambienteId`, `diaSemana`, `horaInicio`, `horaFin`, `periodo` |
| `POST` | `/validaciones/cruce-grupo` | Verifica cruce de grupo. | `grupoId`, `diaSemana`, `horaInicio`, `horaFin`, `periodo` |
| `POST` | `/validaciones/disponibilidad-docente` | Verifica si el horario cae dentro de la disponibilidad del docente. | `docenteId`, `diaSemana`, `horaInicio`, `horaFin`, `periodo` |
| `POST` | `/validaciones/franja-institucional` | Verifica si el horario respeta la franja institucional (07:00-22:00). | `horaInicio`, `horaFin` |
| `POST` | `/validaciones/dia-no-laborable` | Verifica si la fecha es no laborable. | `fecha`, `periodo` |
| `POST` | `/validaciones/max-horas-docente` | Verifica si no excede límite de horas diarias. | `docenteId`, `dia`, `duracion`, `periodo` |

---

## 2. ValidacionesService

El `ValidacionesService` expone métodos para verificar estrictamente la viabilidad de cualquier asignación antes de persistirla en la base de datos.

### Métodos públicos
- **`verificarCruceDocente(docenteId, dia, inicio, fin, periodo, excluirId?)`**: Retorna `true` si ya existe una asignación que se superponga en tiempo para este docente.
- **`verificarCruceAmbiente(ambienteId, dia, inicio, fin, periodo, excluirId?)`**: Retorna `true` si el ambiente ya está ocupado en ese lapso.
- **`verificarCruceGrupo(grupoId, dia, inicio, fin, periodo, excluirId?)`**: Retorna `true` si el grupo ya tiene otra clase simultánea.
- **`verificarDisponibilidadDocente(docenteId, dia, inicio, fin, periodo)`**: Combina los fragmentos de disponibilidad declarados por el docente para confirmar si el rango horario está completamente cubierto. Retorna `true` si está disponible.
- **`verificarFranjaInstitucional(inicio, fin)`**: Controla que no se programen clases fuera de la franja (07:00 a 22:00) ni clases que terminen antes de iniciar.
- **`verificarDiaNoLaborable(fecha, periodo)`**: Chequea contra el catálogo de días festivos.
- **`verificarMaxHorasDocente(docenteId, dia, duracion, periodo)`**: Comprueba que la suma de horas asignadas + la nueva duración no exceda el máximo diario estipulado para su categoría.
- **`verificarHorasCurso(...)`**: Valida que las asignaciones de un curso no superen las horas dictaminadas en el currículo para Teoría o Práctica.
- **`verificarDescansoMinimoDocente(...)`**: Evita bloques sucesivos sin descansos estipulados de 60 minutos entre ciertos turnos.

### Tipos de Conflicto Detectados (Frontend - Backend)
| Código (Sugerido/Log) | Mensaje de Error Ejemplo |
|----------------------|--------------------------|
| `CRUCE_DOCENTE` | "El docente ya tiene una clase asignada en este horario." |
| `CRUCE_AMBIENTE` | "El ambiente seleccionado ya está ocupado en este rango." |
| `CRUCE_GRUPO` | "El grupo ya cuenta con una actividad en este bloque horario." |
| `FUERA_DISPONIBILIDAD` | "El horario seleccionado no coincide con la disponibilidad del docente." |
| `MAX_HORAS_SEMANA` | "El docente supera su carga horaria semanal máxima (10h > 8h permitidas)." |
| `FRANJA_INVALIDA` | "La hora de inicio o fin está fuera de la franja institucional (07:00 a 22:00)." |

---

## 3. Mapa del Campus

### Sistema de coordenadas
El mapa se basa en coordenadas euclidianas relativas (`coordX`, `coordY`) en unidades abstractas mapeadas directamente a los puntos de anclaje de un `<svg>`. Los ambientes sin ubicación registrada mantienen estos valores nulos (`null`). 

**Nota de Pruebas:** Para visualizar los puntos correctamente, debes contar con datos semillas (*seeders*) o actualizar manualmente un ambiente en la base de datos (`UPDATE ambiente SET coordX=100, coordY=200 WHERE id=...`).

### Fórmula de Distancia
Se utiliza la fórmula estándar de la distancia Euclidiana bidimensional en `AmbientesService`:
```typescript
const distanciaUnidades = Math.sqrt(
  Math.pow(destino.coordX - origen.coordX, 2) + Math.pow(destino.coordY - origen.coordY, 2)
);
```

### Criterio de alerta de traslado
Una alerta de traslado se emite si:
1. El docente tiene clases consecutivas (la diferencia entre el fin de una y el inicio de otra es **≤ 30 minutos**).
2. Los edificios son diferentes (`origen.edificio !== destino.edificio`).
3. La `distanciaUnidades` entre el origen y el destino **supera el límite configurado** en la variable de entorno `ALERTA_DISTANCIA_MAX` (por defecto 50).

---

## 4. Análisis de carga

El sistema evalúa de forma dinámica a todos los docentes para encontrar variaciones excesivas en la cantidad de horas dictadas por día.

### Fórmula de desequilibrio
El desequilibrio es igual a la diferencia entre el día de la semana con **más horas** y el día con **menos horas** asignadas.
```typescript
const calcularDesequilibrio = (distribucion: CargaPorDia) => {
  const horasPorDia = [distribucion.lunes, distribucion.martes, ...];
  return Math.max(...horasPorDia) - Math.min(...horasPorDia);
};
```

### Variable de entorno
El límite permitido antes de catalogar una carga como desequilibrada es gobernado por la variable de entorno `UMBRAL_DESEQUILIBRIO`. Si el desequilibrio calculado es estrictamente mayor a este umbral (ej. `UMBRAL_DESEQUILIBRIO=4`), el docente aparecerá en los reportes de alerta.

### Ejemplo de respuesta JSON de `/carga-desequilibrada`
```json
{
  "data": [
    {
      "docenteId": 28,
      "nombre": "Juan Pérez",
      "distribucion": {
        "lunes": 8,
        "martes": 1,
        "miercoles": 0,
        "jueves": 8,
        "viernes": 1,
        "sabado": 0,
        "totalHoras": 18,
        "promedioHorasPorDia": 4.5
      },
      "desequilibrio": 8
    }
  ],
  "message": "Carga desequilibrada obtenida correctamente"
}
```
*(En el ejemplo, `Max(8) - Min(0) = 8`, que al superar el umbral de `4`, lista al docente).*

---

## 5. Instrucciones de setup

Para inicializar o actualizar el módulo en un entorno de desarrollo:

1. **Clonar e instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar el entorno (`.env`):**
   Asegúrate de configurar los parámetros correctos de tu Base de Datos PostgreSQL y agregar las variables de lógicas algorítmicas:
   ```env
   DATABASE_HOST=localhost
   DATABASE_USER=unt_user
   DATABASE_PASSWORD=unt_pass123
   DATABASE_NAME=horarios_unt
   ALERTA_DISTANCIA_MAX=50
   UMBRAL_DESEQUILIBRIO=4
   ```

3. **Correr Migraciones y TypeORM:**
   (Si es necesario sincronizar esquemas, `synchronize: true` puede estar activado en `app.module.ts`, si no, usa el CLI de TypeORM).
   ```bash
   npm run typeorm migration:run
   ```

4. **Levantar el servicio:**
   ```bash
   npm run start:dev
   ```

5. **(Opcional) Seeders de Coordenadas:**
   Para poder testear el Mapa del Campus y las Alertas de Traslado, ejecuta los scripts de DB manuales para inyectar `coordX` y `coordY` a los primeros ambientes creados.
