import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReglasPrioridadGlobales1779200000005 implements MigrationInterface {
  name = 'CreateReglasPrioridadGlobales1779200000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reglas_prioridad_globales" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reglas" json NOT NULL,
        "descripcion" text,
        "activo" boolean DEFAULT true,
        "creado_en" timestamp DEFAULT CURRENT_TIMESTAMP,
        "actualizado_en" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar reglas por defecto según normativa UNT (usando campos existentes)
    await queryRunner.query(`
      INSERT INTO "reglas_prioridad_globales" ("reglas", "descripcion", "activo")
      VALUES (
        '[
          {"campo": "tipo_docente", "orden": "DESC"},
          {"campo": "categoria", "orden": "DESC"},
          {"campo": "fecha_ingreso", "orden": "ASC"},
          {"campo": "horas_asignadas", "orden": "ASC"}
        ]'::json,
        'Reglas de prioridad por defecto según normativa UNT: Condición Laboral (Ordinario > Contratado), Categoría (Principal > Asociado > Auxiliar), Antigüedad (más antigua primero), Horas Asignadas (menos horas primero)',
        true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reglas_prioridad_globales"`);
  }
}
