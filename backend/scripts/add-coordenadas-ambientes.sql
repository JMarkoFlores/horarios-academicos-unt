-- Script para agregar coordenadas de ejemplo a ambientes
-- Escuela de Postgrado UNT (coordenadas aproximadas)
-- Laboratorios (Segundo Piso Oficina Registro Técnico)

-- Escuela de Postgrado UNT - Aulas (Piso 1)
UPDATE ambiente SET 
  coord_x = 100, 
  coord_y = 200, 
  edificio = 'Escuela de Postgrado', 
  piso = 1, 
  pabellon = 'Pabellón A',
  sede = 'Escuela de Postgrado UNT'
WHERE codigo LIKE 'AULA%' AND nombre LIKE '%Postgrado%' OR codigo LIKE 'EG-%' OR codigo LIKE 'EE-%';

-- Laboratorios - Segundo Piso Oficina Registro Técnico
UPDATE ambiente SET 
  coord_x = 300, 
  coord_y = 400, 
  edificio = 'Oficina Registro Técnico', 
  piso = 2, 
  pabellon = 'Laboratorios',
  sede = 'Oficina Registro Técnico'
WHERE tipo = 'LABORATORIO' OR codigo LIKE 'LAB-%';

-- Aulas generales - Edificio Principal
UPDATE ambiente SET 
  coord_x = 150, 
  coord_y = 250, 
  edificio = 'Edificio Principal', 
  piso = 1, 
  pabellon = 'Pabellón B'
WHERE tipo = 'AULA' AND coord_x IS NULL;

-- Aulas segundo piso
UPDATE ambiente SET 
  coord_x = 150, 
  coord_y = 350, 
  edificio = 'Edificio Principal', 
  piso = 2, 
  pabellon = 'Pabellón B'
WHERE tipo = 'AULA' AND piso = 2 AND coord_x IS NULL;

-- Aulas tercer piso
UPDATE ambiente SET 
  coord_x = 150, 
  coord_y = 450, 
  edificio = 'Edificio Principal', 
  piso = 3, 
  pabellon = 'Pabellón B'
WHERE tipo = 'AULA' AND piso = 3 AND coord_x IS NULL;
