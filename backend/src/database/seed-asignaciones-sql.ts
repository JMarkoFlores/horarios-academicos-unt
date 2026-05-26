import { DataSource } from 'typeorm';

const ASIGNACIONES_SQL = `
-- Docentes
INSERT INTO docente (codigo, nombres, apellidos, email, tipo_docente, categoria, tipo_contrato, modalidad, fecha_ingreso, activo)
VALUES
  ('MAR001', 'Marcelino', 'Torres Villanueva', 'torres.villanueva@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('ALB001', 'Alberto', 'Mendoza de los Santos', 'mendoza.santos@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('PAU001', 'Paul', 'Cotrina Castellanos', 'cotrina.castellanos@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('BER001', 'Bertha', 'Urtecho Zavaleta', 'urtecho.zavaleta@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('JOS001', 'Jose Luis', 'Ponte Bejarano', 'ponte.bejarano@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('JOR001', 'Jorge Luis', 'Rios Gonzales', 'rios.gonzales@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('SEG001', 'Segundo', 'Guibar Obeso', 'guibar.obeso@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('MIG001', 'Miguel', 'Ipanaque Zapata', 'ipanaque.zapata@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true),
  ('MAR002', 'Martha', 'Cardoso', 'cardoso@unt.edu.pe', 'TIEMPO_COMPLETO', 'ASISTENTE', 'PERMANENTE', 'PRESENCIAL', '2020-01-01', true)
ON CONFLICT DO NOTHING;

-- Cursos
INSERT INTO curso (codigo, nombre, ciclo, creditos, horas_teoria, horas_laboratorio, tiene_laboratorio, activo)
VALUES
  ('PROG101', 'Introducción a la Programación', 1, 3, 2, 2, true, true),
  ('SIST101', 'Introducción a la Ing. de Sistemas', 1, 3, 2, 2, true, true),
  ('DESA101', 'Desarrollo Personal', 1, 3, 2, 2, true, true),
  ('LOGI101', 'Desarrollo del Pens. Logico Matemat.', 1, 3, 2, 2, true, true),
  ('LECT101', 'Lectura Critica y Redac. Textos Acad.', 1, 3, 2, 2, true, true),
  ('AMAT101', 'Introduccion al Analisis Matemático', 1, 3, 2, 2, true, true),
  ('ESTA101', 'Estadistica General', 1, 3, 2, 2, true, true)
ON CONFLICT DO NOTHING;

-- Ambientes
INSERT INTO ambiente (codigo, nombre, tipo, capacidad, estado, activo)
VALUES
  ('POSTGRADO-A307', 'posgrado A-307', 'AULA', 50, 'ACTIVO', true),
  ('LAB3', 'Lab. 3', 'LABORATORIO', 30, 'ACTIVO', true),
  ('LAB4', 'Lab. 4', 'LABORATORIO', 30, 'ACTIVO', true),
  ('POSTGRADO-A303', 'posgrado A-303', 'AULA', 50, 'ACTIVO', true),
  ('TALLER-IND', 'Taller de Confecciones - Ing. Industrial', 'TALLER', 40, 'ACTIVO', true)
ON CONFLICT DO NOTHING;
`;

export async function seedAsignacionesSql(dataSource: DataSource) {
  console.log('🌱 Iniciando seed de asignaciones (SQL)...');

  try {
    await dataSource.query(ASIGNACIONES_SQL);
    console.log('✅ Seed SQL completado');
  } catch (error) {
    console.error('❌ Error en seed SQL:', error.message);
  }
}
