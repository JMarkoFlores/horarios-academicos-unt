import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateReglasPrioridadCompletas1779200000007 implements MigrationInterface {
  name = "UpdateReglasPrioridadCompletas1779200000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar reglas para incluir todos los criterios jerárquicos completos
    await queryRunner.query(`
      UPDATE "reglas_prioridad_globales" 
      SET 
        reglas = '[
          {"campo": "tipo_docente", "orden": "DESC"},
          {"campo": "categoria", "orden": "DESC"},
          {"campo": "modalidad", "orden": "DESC"},
          {"campo": "fecha_ingreso", "orden": "ASC"},
          {"campo": "horas_asignadas", "orden": "ASC"},
          {"campo": "codigo", "orden": "ASC"}
        ]'::json,
        descripcion = 'Criterios jerárquicos completos: 1) Condición docente (Ordinario > Contratado), 2) Categoría académica (Principal > Asociado > Auxiliar > Jefe de Práctica > Sin Categoría), 3) Régimen de dedicación (Dedicación Exclusiva > Tiempo Completo > Tiempo Parcial), 4) Antigüedad (más antigua primero), 5) Carga actual (menos horas primero), 6) Desempate (código alfabético)',
        actualizado_en = CURRENT_TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir a las reglas anteriores
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
    `);
  }
}
