-- ============================================================
-- SEED: Modo Ventanas de Atención
-- Propósito: Crear datos de prueba para el modo VENTANAS
-- Fecha: 2026-05-24
-- ============================================================

-- Limpiar datos existentes de ventanas para el período de prueba
-- Nota: seleccion_temporal usa otra estructura, omitimos esa parte
DELETE FROM cola_docentes WHERE ventana_id IN (
    SELECT id FROM ventana_atencion WHERE periodo = '2026-I-TEST'
);
DELETE FROM ventana_atencion WHERE periodo = '2026-I-TEST';
DELETE FROM campaña_ventanas WHERE periodo_id IN (
    SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST'
);
DELETE FROM periodo_academico WHERE codigo = '2026-I-TEST';

-- ============================================================
-- 1. CREAR PERÍODO EN MODO VENTANAS
-- ============================================================
INSERT INTO periodo_academico (
    codigo, 
    nombre, 
    fecha_inicio, 
    fecha_fin, 
    estado, 
    activo, 
    modo_asignacion
) VALUES (
    '2026-I-TEST',
    'Semestre 2026-I - Test Modo Ventanas',
    '2026-03-16',
    '2026-07-31',
    'EN_CURSO',
    true,
    'VENTANAS'  -- 🔴 MODO VENTANAS ACTIVO
) RETURNING id;

-- ============================================================
-- 2. CREAR CAMPAÑA DE VENTANAS
-- ============================================================
INSERT INTO campaña_ventanas (
    nombre,
    descripcion,
    periodo_id,
    fecha_inicio,
    fecha_fin,
    dias_habilitados,
    duracion_turno_minutos,
    cupos_maximos_ventana,
    estado,
    total_ventanas_generadas,
    total_docentes_asignados
) VALUES (
    'Campaña Principal 2026-I',
    'Ventanas de atención para docentes nombrados y contratados',
    (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST'),
    '2026-03-20',
    '2026-04-05',
    ARRAY['LUNES', 'MIERCOLES', 'VIERNES'],
    30,
    5,
    'EN_CURSO',
    0,
    0
) RETURNING id;

-- ============================================================
-- 3. CREAR VENTANAS DE ATENCIÓN (Ejemplo: 6 ventanas)
-- ============================================================

-- Ventana 1: PRINCIPAL + NOMBRADO (20 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-20', 'PRINCIPAL', 'NOMBRADO',
    '08:00', '10:00', 30, 'PROGRAMADA', 
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- Ventana 2: ASOCIADO + NOMBRADO (22 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-22', 'ASOCIADO', 'NOMBRADO',
    '09:00', '11:00', 30, 'PROGRAMADA',
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- Ventana 3: AUXILIAR + NOMBRADO (24 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-24', 'AUXILIAR', 'NOMBRADO',
    '10:00', '12:00', 30, 'PROGRAMADA',
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- Ventana 4: PRINCIPAL + CONTRATADO (27 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-27', 'PRINCIPAL', 'CONTRATADO',
    '14:00', '16:00', 30, 'PROGRAMADA',
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- Ventana 5: ASOCIADO + CONTRATADO (29 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-29', 'ASOCIADO', 'CONTRATADO',
    '15:00', '17:00', 30, 'PROGRAMADA',
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- Ventana 6: AUXILIAR + CONTRATADO (31 Marzo)
INSERT INTO ventana_atencion (
    id, periodo, fecha, categoria, modalidad, hora_inicio, hora_fin, 
    intervalo_minutos, estado, campaña_id
) VALUES (
    gen_random_uuid(), '2026-I-TEST', '2026-03-31', 'AUXILIAR', 'CONTRATADO',
    '16:00', '18:00', 30, 'PROGRAMADA',
    (SELECT id FROM campaña_ventanas WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST') LIMIT 1)
);

-- ============================================================
-- 4. ASIGNAR DOCENTES A COLAS DE VENTANAS
-- ============================================================

-- Obtener docentes de prueba (asumiendo que existen con IDs 1-12)
-- Si no existen, estos INSERTs fallarán silenciosamente

-- Cola para Ventana 1 (PRINCIPAL - NOMBRADO): Docentes 1-3
INSERT INTO cola_docentes (ventana_id, docente_id, orden, estado)
SELECT 
    v.id,
    d.id,
    ROW_NUMBER() OVER (ORDER BY d.fecha_ingreso DESC),
    'ESPERANDO'
FROM ventana_atencion v
CROSS JOIN docente d
WHERE v.periodo = '2026-I-TEST'
  AND v.categoria = 'PRINCIPAL' 
  AND v.modalidad = 'NOMBRADO'
  AND d.categoria = 'PRINCIPAL'
  AND d.tipo_contrato = 'NOMBRADO'
  AND d.activo = true
ORDER BY d.fecha_ingreso DESC
LIMIT 3;

-- Cola para Ventana 2 (ASOCIADO - NOMBRADO): Docentes 4-6
INSERT INTO cola_docentes (ventana_id, docente_id, orden, estado)
SELECT 
    v.id,
    d.id,
    ROW_NUMBER() OVER (ORDER BY d.fecha_ingreso DESC),
    'ESPERANDO'
FROM ventana_atencion v
CROSS JOIN docente d
WHERE v.periodo = '2026-I-TEST'
  AND v.categoria = 'ASOCIADO' 
  AND v.modalidad = 'NOMBRADO'
  AND d.categoria = 'ASOCIADO'
  AND d.tipo_contrato = 'NOMBRADO'
  AND d.activo = true
ORDER BY d.fecha_ingreso DESC
LIMIT 3;

-- Cola para Ventana 3 (AUXILIAR - NOMBRADO): Docentes 7-9
INSERT INTO cola_docentes (ventana_id, docente_id, orden, estado)
SELECT 
    v.id,
    d.id,
    ROW_NUMBER() OVER (ORDER BY d.fecha_ingreso DESC),
    'ESPERANDO'
FROM ventana_atencion v
CROSS JOIN docente d
WHERE v.periodo = '2026-I-TEST'
  AND v.categoria = 'AUXILIAR' 
  AND v.modalidad = 'NOMBRADO'
  AND d.categoria = 'AUXILIAR'
  AND d.tipo_contrato = 'NOMBRADO'
  AND d.activo = true
ORDER BY d.fecha_ingreso DESC
LIMIT 3;

-- Cola para Ventana 4 (PRINCIPAL - CONTRATADO): Docentes 10-11
INSERT INTO cola_docentes (ventana_id, docente_id, orden, estado)
SELECT 
    v.id,
    d.id,
    ROW_NUMBER() OVER (ORDER BY d.fecha_ingreso DESC),
    'ESPERANDO'
FROM ventana_atencion v
CROSS JOIN docente d
WHERE v.periodo = '2026-I-TEST'
  AND v.categoria = 'PRINCIPAL' 
  AND v.modalidad = 'CONTRATADO'
  AND d.categoria = 'PRINCIPAL'
  AND d.tipo_contrato = 'CONTRATADO'
  AND d.activo = true
ORDER BY d.fecha_ingreso DESC
LIMIT 2;

-- ============================================================
-- 5. CONFIGURAR PARÁMETROS DE CARGA
-- ============================================================
INSERT INTO parametros_carga (
    periodo_academico,
    tipo_docente,
    categoria,
    modalidad,
    horas_min_semanal,
    horas_max_semanal,
    cursos_min_docente,
    cursos_max_docente
)
SELECT 
    p.codigo,
    'ORDINARIO',
    'PRINCIPAL',
    'DEDICACION_EXCLUSIVA',
    8,
    40,
    1,
    5
FROM periodo_academico p
WHERE p.codigo = '2026-I-TEST';

-- ============================================================
-- 6. ACTUALIZAR CONTADORES DE CAMPAÑA
-- ============================================================
UPDATE campaña_ventanas 
SET 
    total_ventanas_generadas = (SELECT COUNT(*) FROM ventana_atencion WHERE periodo = '2026-I-TEST'),
    total_docentes_asignados = (SELECT COUNT(DISTINCT cd.docente_id) FROM cola_docentes cd 
                                JOIN ventana_atencion v ON cd.ventana_id = v.id 
                                WHERE v.periodo = '2026-I-TEST')
WHERE periodo_id = (SELECT id FROM periodo_academico WHERE codigo = '2026-I-TEST');

-- ============================================================
-- RESUMEN DEL SEED
-- ============================================================
SELECT 
    '2026-I-TEST' as periodo,
    'VENTANAS' as modo_asignacion,
    (SELECT COUNT(*) FROM ventana_atencion WHERE periodo = '2026-I-TEST') as total_ventanas,
    (SELECT COUNT(*) FROM cola_docentes cd 
     JOIN ventana_atencion v ON cd.ventana_id = v.id 
     WHERE v.periodo = '2026-I-TEST') as total_docentes_en_cola;
