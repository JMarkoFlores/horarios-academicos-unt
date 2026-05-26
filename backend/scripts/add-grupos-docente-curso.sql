-- Agregar columna grupos a la tabla docente_curso
-- Esta columna indica el número de grupos paralelos para un tipo de clase
-- TEORIA siempre tiene 1 grupo
-- PRACTICA tiene 1 grupo cuando existe (P > 0)
-- LABORATORIO tiene grupos según el valor de G especificado

ALTER TABLE docente_curso 
ADD COLUMN IF NOT EXISTS grupos INTEGER DEFAULT 1;

-- Actualizar registros existentes con valores por defecto
UPDATE docente_curso 
SET grupos = 1 
WHERE grupos IS NULL;
