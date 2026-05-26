import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReglasPrioridadTipoDocente1779200000006 implements MigrationInterface {
  name = 'UpdateReglasPrioridadTipoDocente1779200000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar reglas existentes para usar tipo_docente en lugar de tipo_contrato
    await queryRunner.query(`
      UPDATE "reglas_prioridad_globales" 
      SET 
        reglas = '[
          {"campo": "tipo_docente", "orden": "DESC"},
          {"campo": "categoria", "orden": "DESC"},
          {"campo": "fecha_ingreso", "orden": "ASC"},
          {"campo": "horas_asignadas", "orden": "ASC"}
        ]'::json,
        descripcion = 'Reglas de prioridad por defecto según normativa UNT: Condición Laboral (Ordinario > Contratado), Categoría (Principal > Asociado > Auxiliar), Antigüedad (más antigua primero), Horas Asignadas (menos horas primero)',
        actualizado_en = CURRENT_TIMESTAMP
      WHERE reglas::text LIKE '%tipo_contrato%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir al valor anterior
    await queryRunner.query(`
      UPDATE "reglas_prioridad_globales" 
      SET 
        reglas = '[
          {"campo": "tipo_contrato", "orden": "DESC"},
          {"campo": "categoria", "orden": "DESC"},
          {"campo": "fecha_ingreso", "orden": "ASC"},
          {"campo": "horas_asignadas", "orden": "ASC"}
        ]'::json,
        descripcion = 'Reglas de prioridad por defecto según normativa UNT',
        actualizado_en = CURRENT_TIMESTAMP
      WHERE reglas::text LIKE '%tipo_docente%'
    `);
  }
}
