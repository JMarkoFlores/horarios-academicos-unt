# Seed Manual para Modo Ventanas de Atención

## 📋 Resumen del Flujo Modo VENTANAS

### 1. Configuración Inicial (Administrador)
- Ir a **Configuración → Período Académico**
- Crear período con **Modo de Asignación: VENTANAS**
- Definir **Reglas de Prioridad** (jerarquía de categorías)
- Ir a **Configuración → Campañas de Ventanas**
- Crear campaña con fechas y días habilitados

### 2. Generación Automática
El sistema genera:
- Ventanas para cada día hábil
- Cola de docentes pre-asignada por jerarquía
- Notificaciones automáticas

### 3. Panel del Operador
- Ir a **/app/operador**
- Ver lista de ventanas programadas
- Iniciar ventana (cambia estado a EN_CURSO)
- Llamar docentes de la cola uno por uno
- Cada docente selecciona sus horarios en la grilla

---

## ⚙️ Recomendación: Ubicación del Cambio de Modo

**Problema:** El cambio de modo está en `/app/asignaciones`
**Recomendación:** Mover a `/app/configuracion` en la sección "Período Académico"

**Justificación:**
1. Es una configuración del período, no una acción operativa
2. Debe decidirse al inicio del período
3. Evita cambios accidentales durante la operación
4. Una vez iniciadas las asignaciones, bloquear cambios

---

## 🗄️ SQL Seed para Pruebas

Ejecutar en PostgreSQL para crear datos de prueba:

```sql
-- ============================================================
-- SEED SQL: Modo Ventanas de Atención
-- Ejecutar después de tener docentes creados
-- ============================================================

-- 1. Crear período en modo VENTANAS
INSERT INTO periodo_academico (
    codigo, nombre, fecha_inicio, fecha_fin, estado, activo, modo_asignacion
) VALUES (
    '2026-I-TEST',
    'Semestre 2026-I - Test Modo Ventanas',
    '2026-03-16',
    '2026-07-31',
    'EN_CURSO',
    true,
    'VENTANAS'
);

-- 2. Crear campaña de ventanas
INSERT INTO campaña_ventanas (
    nombre, descripcion, periodo_id, fecha_inicio, fecha_fin,
    dias_habilitados, duracion_turno_minutos, cupos_maximos_ventana, estado
)
SELECT 
    'Campaña Principal 2026-I',
    'Ventanas de atención para docentes',
    id,
    '2026-03-20',
    '2026-04-05',
    ARRAY['LUNES', 'MIERCOLES', 'VIERNES']::varchar[],
    30,
    5,
    'ACTIVA'
FROM periodo_academico WHERE codigo = '2026-I-TEST';

-- 3. Crear ventanas de atención
INSERT INTO ventana_atencion (id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, intervalo_minutos, estado, campaña_id)
SELECT 
    gen_random_uuid(),
    '2026-I-TEST',
    fecha,
    cat.categoria,
    cat.modalidad,
    cat.hora_inicio,
    cat.hora_fin,
    30,
    'PROGRAMADA',
    c.id
FROM campaña_ventanas c
CROSS JOIN (VALUES
    ('2026-03-20', 'PRINCIPAL', 'NOMBRADO', '08:00', '10:00'),
    ('2026-03-22', 'ASOCIADO', 'NOMBRADO', '09:00', '11:00'),
    ('2026-03-24', 'AUXILIAR', 'NOMBRADO', '10:00', '12:00'),
    ('2026-03-27', 'PRINCIPAL', 'CONTRATADO', '14:00', '16:00'),
    ('2026-03-29', 'ASOCIADO', 'CONTRATADO', '15:00', '17:00'),
    ('2026-03-31', 'AUXILIAR', 'CONTRATADO', '16:00', '18:00')
) AS cat(fecha, categoria, modalidad, hora_inicio, hora_fin)
WHERE c.periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST');

-- 4. Asignar docentes a colas (limitado a 3 por ventana para prueba)
INSERT INTO cola_docentes (ventana_id, docente_id, orden, estado)
SELECT 
    v.id,
    d.id,
    ROW_NUMBER() OVER (PARTITION BY v.id ORDER BY d.fecha_ingreso DESC),
    'ESPERANDO'
FROM ventana_atencion v
CROSS JOIN LATERAL (
    SELECT id, fecha_ingreso 
    FROM docente 
    WHERE categoria = v.categoria 
      AND tipo_contrato = v.modalidad 
      AND activo = true
    ORDER BY fecha_ingreso DESC
    LIMIT 3
) d
WHERE v.periodo = '2026-I-TEST';

-- 5. Configurar parámetros de carga
INSERT INTO parametros_carga (
    periodo_academico, tipo_docente, categoria, modalidad,
    horas_min_semanal, horas_max_semanal, cursos_min_docente, cursos_max_docente
)
SELECT 
    codigo,
    'ORDINARIO',
    'PRINCIPAL',
    'DEDICACION_EXCLUSIVA',
    8,
    40,
    1,
    5
FROM periodo_academico WHERE codigo = '2026-I-TEST';

-- 6. Actualizar contadores de campaña
UPDATE campaña_ventanas 
SET 
    total_ventanas_generadas = (SELECT COUNT(*) FROM ventana_atencion WHERE periodo = '2026-I-TEST'),
    total_docentes_asignados = (SELECT COUNT(DISTINCT docente_id) FROM cola_docentes cd 
                                JOIN ventana_atencion v ON cd.ventana_id = v.id 
                                WHERE v.periodo = '2026-I-TEST')
WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST');

-- Verificar resultado
SELECT 
    '2026-I-TEST' as periodo,
    'VENTANAS' as modo,
    (SELECT COUNT(*) FROM ventana_atencion WHERE periodo = '2026-I-TEST') as ventanas,
    (SELECT COUNT(*) FROM cola_docentes cd 
     JOIN ventana_atencion v ON cd.ventana_id = v.id 
     WHERE v.periodo = '2026-I-TEST') as docentes_en_cola;
```

---

## 🌐 URLs de Prueba

1. **Frontend:** http://localhost:4200
2. **Panel Operador:** http://localhost:4200/app/operador
3. **Configuración:** http://localhost:4200/app/configuracion
4. **API Backend:** http://localhost:3000/api

---

## 📝 Pasos para Probar el Flujo

1. **Preparar datos:**
   ```bash
   # Ejecutar el SQL de arriba en la base de datos
   psql -d horarios_unt -f seed-ventanas.sql
   ```

2. **Seleccionar período:**
   - Ir al frontend
   - Cambiar período activo a "2026-I-TEST"

3. **Ver ventanas:**
   - Ir a `/app/operador`
   - Ver las 6 ventanas programadas

4. **Iniciar ventana:**
   - Seleccionar una ventana (ej: PRINCIPAL/NOMBRADO)
   - Click en "Iniciar Ventana"

5. **Procesar cola:**
   - Llamar siguiente docente
   - Ver datos del docente
   - Abrir grilla de horarios
   - Seleccionar horarios
   - Confirmar y pasar al siguiente

6. **Verificar resultados:**
   - Revisar horarios creados en `/app/horarios`
   - Ver estado de docentes atendidos

---

## 🔄 Cambio de Modo (Sugerencia de Implementación)

```typescript
// En configuracion.component.ts
// Agregar sección "Modo de Asignación"

async cambiarModoAsignacion(nuevoModo: 'AUTOMATICA' | 'VENTANAS' | 'MIXTA') {
  // Validar que no haya horarios en curso
  const horariosEnCurso = await this.api.get('/horarios/contar', {
    periodo: this.periodoActivo,
    estado: 'BORRADOR,CONFIRMADO'
  });
  
  if (horariosEnCurso > 0) {
    this.notif.error('No se puede cambiar el modo con horarios en curso');
    return;
  }
  
  // Confirmación adicional
  if (!confirm('¿Está seguro? Esta acción afecta todo el proceso de asignación.')) {
    return;
  }
  
  // Realizar cambio
  await this.api.patch(`/periodos/${this.periodoId}/modo-asignacion`, {
    modo_asignacion: nuevoModo
  });
  
  this.notif.success(`Modo cambiado a ${nuevoModo}`);
}
```

---

## 📊 Comparativa de Modos

| Aspecto | AUTOMATICA | VENTANAS | MIXTA |
|---------|------------|----------|-------|
| Velocidad | Rápida | Lenta | Media |
| Intervención | Mínima | Alta | Media |
| Caso de uso | Estándar | Reclamos, especiales | Transición |
| Complejidad | Baja | Alta | Media |

