-- Script para actualizar prerequisitos de cursos según Plan de Estudios Ingeniería de Sistemas 2018
-- Ejecutar después de verificar que los cursos existen en la base de datos

-- I CICLO - Sin prerequisitos
-- EG-101, EG-102, EG-103, EG-104, EG-105, EE-101, EE-102 no tienen prerequisitos

-- II CICLO
UPDATE curso SET prerequisitos = 'EG-102' WHERE codigo = 'EG-203';
UPDATE curso SET prerequisitos = 'EG-104' WHERE codigo = 'EG-204';
UPDATE curso SET prerequisitos = 'EG-104' WHERE codigo = 'EG-205';
UPDATE curso SET prerequisitos = 'EE-102' WHERE codigo = 'EE-201';

-- III CICLO
UPDATE curso SET prerequisitos = 'EG-201' WHERE codigo = 'EP-301';
UPDATE curso SET prerequisitos = 'EE-101' WHERE codigo = 'EE-301';
UPDATE curso SET prerequisitos = 'EG-105' WHERE codigo = 'EP-302';
UPDATE curso SET prerequisitos = 'EG-204' WHERE codigo = 'EP-303';
UPDATE curso SET prerequisitos = 'EG-205' WHERE codigo = 'EP-304';
UPDATE curso SET prerequisitos = 'EE-201' WHERE codigo = 'EE-302';

-- IV CICLO
UPDATE curso SET prerequisitos = 'EP-301' WHERE codigo = 'EP-401';
UPDATE curso SET prerequisitos = 'EE-302' WHERE codigo = 'EE-401';
UPDATE curso SET prerequisitos = 'EE-301' WHERE codigo = 'EP-402';
UPDATE curso SET prerequisitos = 'EP-301' WHERE codigo = 'EP-403';
UPDATE curso SET prerequisitos = 'EP-303,EP-304' WHERE codigo = 'EE-402';
UPDATE curso SET prerequisitos = 'EE-302' WHERE codigo = 'EE-403';

-- V CICLO
UPDATE curso SET prerequisitos = 'EP-401' WHERE codigo = 'EP-501';
UPDATE curso SET prerequisitos = 'EE-401' WHERE codigo = 'EE-501';
UPDATE curso SET prerequisitos = 'EP-402' WHERE codigo = 'EP-502';
UPDATE curso SET prerequisitos = 'EP-403,EE-403' WHERE codigo = 'EE-502';
UPDATE curso SET prerequisitos = 'EE-402' WHERE codigo = 'EE-503';
UPDATE curso SET prerequisitos = 'EE-401,EE-403' WHERE codigo = 'EE-504';

-- VI CICLO
UPDATE curso SET prerequisitos = 'EP-501' WHERE codigo = 'EP-601';
UPDATE curso SET prerequisitos = 'EE-301,EE-503' WHERE codigo = 'EE-601';
UPDATE curso SET prerequisitos = 'EP-501,EP-502' WHERE codigo = 'EP-602';
UPDATE curso SET prerequisitos = 'EE-501' WHERE codigo = 'EE-602';
UPDATE curso SET prerequisitos = 'EE-503' WHERE codigo = 'EE-603';
UPDATE curso SET prerequisitos = 'EE-502,EE-504' WHERE codigo = 'EE-604';

-- VII CICLO
UPDATE curso SET prerequisitos = 'EP-601' WHERE codigo = 'EP-701';
UPDATE curso SET prerequisitos = 'EE-601,EE-604' WHERE codigo = 'EE-701';
UPDATE curso SET prerequisitos = 'EP-302' WHERE codigo = 'EI-701';
UPDATE curso SET prerequisitos = 'EP-602,EE-602' WHERE codigo = 'EE-702';
UPDATE curso SET prerequisitos = 'EE-603' WHERE codigo = 'EE-703';
UPDATE curso SET prerequisitos = 'EE-604' WHERE codigo = 'EE-704';

-- VIII CICLO
UPDATE curso SET prerequisitos = 'EE-501,EP-701' WHERE codigo = 'EP-801';
UPDATE curso SET prerequisitos = 'EE-701,EE-703' WHERE codigo = 'EE-801';
UPDATE curso SET prerequisitos = 'EE-703,EE-704' WHERE codigo = 'EE-802';
UPDATE curso SET prerequisitos = 'EE-702' WHERE codigo = 'EE-803';
UPDATE curso SET prerequisitos = 'EE-703' WHERE codigo = 'EE-804';
UPDATE curso SET prerequisitos = 'EE-704' WHERE codigo = 'EE-805';

-- IX CICLO
UPDATE curso SET prerequisitos = 'EE-701,EE-802' WHERE codigo = 'EE-901';
UPDATE curso SET prerequisitos = 'EE-801' WHERE codigo = 'EE-902';
UPDATE curso SET prerequisitos = 'EI-701' WHERE codigo = 'EI-901';
UPDATE curso SET prerequisitos = 'EP-801,EE-803' WHERE codigo = 'EE-903';
UPDATE curso SET prerequisitos = 'EE-804' WHERE codigo = 'EE-904';
UPDATE curso SET prerequisitos = 'EE-804,EE-805' WHERE codigo = 'EE-905';

-- X CICLO
UPDATE curso SET prerequisitos = 'EE-901' WHERE codigo = 'EE-X01';
UPDATE curso SET prerequisitos = 'EE-901' WHERE codigo = 'EE-X02';
UPDATE curso SET prerequisitos = 'EI-901' WHERE codigo = 'EI-X01';
UPDATE curso SET prerequisitos = 'EE-902,EE-904' WHERE codigo = 'EE-X03';
UPDATE curso SET prerequisitos = 'EE-901' WHERE codigo = 'EP-X01';
UPDATE curso SET prerequisitos = 'EE-905' WHERE codigo = 'EE-X04';
UPDATE curso SET prerequisitos = 'EI-901' WHERE codigo = 'EE-X04'; -- Prácticas Pre Profesionales
