# Flujo Completo: Modo Ventanas de Atención

## Resumen Ejecutivo

El **Modo Ventanas de Atención** es un proceso donde los docentes son atendidos uno por uno en ventanas programadas por jerarquía, en lugar de generar horarios automáticamente.

---

## 🔄 Flujo Completo del Modo VENTANAS

### Paso 1: Configuración Inicial (Administrador)

**Ubicación:** `/app/configuracion` → Tab "Campañas de Ventanas"

1. **Crear Período Académico** con `modo_asignacion = VENTANAS`
2. **Configurar Parámetros de Carga** (horas mín/máx, cursos por docente)
3. **Definir Reglas de Prioridad** (jerarquía: Principal → Asociado → Auxiliar)
4. **Crear Campaña de Ventanas**:
   - Nombre y descripción
   - Fecha inicio/fin
   - Días habilitados (ej: Lunes-Viernes)
   - Duración del turno (ej: 30 min)
   - Cupos máximos por ventana

### Paso 2: Generación Automática de Ventanas (Sistema)

Al crear la campaña, el sistema:

1. **Genera ventanas** para cada día hábil en el rango de fechas
2. **Pre-asigna docentes** a la cola de cada ventana según:
   - Categoría (PRINCIPAL primero, luego ASOCIADO, luego AUXILIAR)
   - Modalidad (NOMBRADO primero, luego CONTRATADO)
   - Antigüedad
3. **Envía notificaciones** a los docentes con su fecha/hora asignada

**Estructura de una Ventana:**
```typescript
{
  id: "uuid",
  periodo: "2026-I",
  fecha: "2026-03-20",
  categoria: "PRINCIPAL",
  modalidad: "NOMBRADO",
  hora_inicio: "08:00",
  hora_fin: "10:00",
  intervalo_minutos: 30,
  estado: "PROGRAMADA" // → EN_CURSO → COMPLETADA
}
```

### Paso 3: Operación del Panel de Atención (Operador)

**Ubicación:** `/app/operador`

#### 3.1 Vista de Ventanas Disponibles
- Lista de ventanas del período activo
- Filtros por fecha, categoría, modalidad
- Estado de cada ventana (Programada/En Curso/Completada)

#### 3.2 Iniciar una Ventana
El operador selecciona una ventana y presiona **"Iniciar Ventana de Atención"**

**Sistema:**
1. Cambia estado a `EN_CURSO`
2. Carga la **Cola de Docentes** pre-asignada
3. Muestra:
   - Cola de espera (docentes por atender)
   - Docente en atención (actual)
   - Grilla de horarios disponibles

#### 3.3 Proceso de Atención

**A) Llamar siguiente docente:**
```
Operador presiona "Llamar siguiente docente" →
Sistema asigna primer docente de la cola →
Docente pasa a "En Atención"
```

**B) Selección de horarios (Docente):**
- Se muestra la **Grilla de Horarios** con:
  - Sus cursos asignados previamente
  - Ambientes disponibles
  - Horarios libres
- Docente selecciona sus preferencias
- Operador confirma la selección

**C) Finalizar atención:**
```
Docente completado →
Se guardan sus horarios →
Se marca como atendido →
Se libera el turno para el siguiente docente
```

#### 3.4 Estados de la Cola
- `ESPERANDO`: En cola, aún no atendido
- `EN_ATENCION`: Actualmente siendo atendido
- `COMPLETADO`: Ya seleccionó sus horarios
- `AUSENTE`: No se presentó (permite reprogramar)

### Paso 4: Finalización

Cuando todos los docentes de una ventana son atendidos:
1. Ventana cambia a estado `COMPLETADA`
2. Se generan reportes de asignación
3. Se notifica a docentes sin horarios pendientes

---

## 📊 Comparativa de Modos

| Característica | AUTOMÁTICA | VENTANAS | MIXTA |
|---------------|------------|----------|-------|
| **Generación** | Totalmente automática | Manual (docente por docente) | Automática + Manual para pendientes |
| **Intervención** | Solo revisión | Operador activo | Mixta |
| **Velocidad** | Rápida (minutos) | Lenta (días/semanas) | Media |
| **Precisión** | Algoritmo + reglas | Decisión humana + sistema | Balance |
| **Uso recomendado** | Periodos normales | Casos especiales, reclamos | Transición o casos complejos |

---

## ⚙️ Recomendación: Ubicación del Cambio de Modo

### ❌ Problema Actual
El selector de modo está en **`/app/asignaciones`**, mezclado con la gestión manual de asignaciones.

### ✅ Propuesta
Mover el cambio de modo a **`/app/configuracion`** en una sección dedicada:

```
Configuración → Período Académico → Modo de Asignación
```

**Justificación:**
1. Es una configuración del período, no una acción operativa
2. Afecta todo el flujo del sistema, no solo asignaciones
3. Debería decidirse al inicio del período, no durante la operación
4. Evita cambios accidentales durante el proceso de asignación

### 🔒 Seguridad Adicional
- Solo permitir cambio de modo si el período está en estado `CONFIGURACION`
- Una vez iniciadas las asignaciones, bloquear cambios
- Requerir confirmación explícita y justificación

---

## 🛠️ API Endpoints Relevantes

### Backend (Ventanas)

```typescript
// Crear ventana manual
POST /ventanas

// Configurar ventanas automáticas por período
POST /ventanas/configurar-periodo
{
  idPeriodo: number,
  fechaInicio: "2026-03-16",
  config: [
    { categoria: "PRINCIPAL", modalidad: "NOMBRADO", hora_inicio: "08:00", intervalo_minutos: 30 }
  ]
}

// Iniciar ventana (cambiar a EN_CURSO)
POST /ventanas/:id/iniciar

// Obtener estado de la cola
GET /ventanas/:id/cola

// Llamar siguiente docente
POST /ventanas/:id/llamar-siguiente

// Marcar docente como atendido/ausente
PATCH /cola/:id/estado
```

### Backend (Períodos)

```typescript
// Cambiar modo de asignación
PATCH /periodos/:id/modo-asignacion
{
  modo_asignacion: "ventanas" | "automatica" | "mixta"
}

// Crear ventanas para docentes pendientes (solo modo MIXTA)
POST /periodos/:id/crear-ventanas-pendientes
```

---

## 📝 Checklist para Implementar Modo VENTANAS

- [ ] 1. Crear período con `modo_asignacion = VENTANAS`
- [ ] 2. Configurar parámetros de carga horaria
- [ ] 3. Definir reglas de prioridad de categorías
- [ ] 4. Crear campaña de ventanas con fechas y días habilitados
- [ ] 5. Verificar que se generaron las ventanas automáticamente
- [ ] 6. Confirmar que los docentes fueron asignados a la cola
- [ ] 7. Verificar envío de notificaciones
- [ ] 8. Procesar ventanas una por una en el panel de operador
- [ ] 9. Confirmar que los horarios se guardan correctamente
- [ ] 10. Generar reportes de asignación

---

## 🚀 Próximos Pasos Sugeridos

1. **Mover selector de modo** de `/app/asignaciones` a `/app/configuracion`
2. **Agregar validaciones** para evitar cambios de modo durante operación
3. **Crear dashboard** de seguimiento de ventanas
4. **Implementar reportes** de eficiencia (tiempos de atención, docentes atendidos, etc.)
