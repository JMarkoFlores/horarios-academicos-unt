-- Backfill local para docentes del seed de Ingenieria de Sistemas.
-- Asigna Facultad de Ingenieria (24) y Departamento de Ingenieria de Sistemas (81)
-- a los docentes que fueron creados sin vinculacion institucional.

UPDATE docente
SET departamento_id = 81,
    facultad_id = 24
WHERE (departamento_id IS NULL OR facultad_id IS NULL)
  AND codigo LIKE 'DOC%';
