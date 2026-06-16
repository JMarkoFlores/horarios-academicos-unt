import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillDocenteVinculacionDeclaraciones1800000000003 implements MigrationInterface {
  name = "BackfillDocenteVinculacionDeclaraciones1800000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "docente" d
      SET
        "departamento_id" = depto."id",
        "facultad_id" = fac."id"
      FROM "departamento" depto
      JOIN "escuela" esc ON esc."id" = depto."escuela_id"
      JOIN "facultad" fac ON fac."id" = esc."facultad_id"
      WHERE depto."nombre" = 'Departamento de Ingeniería de Sistemas'
        AND (d."departamento_id" IS NULL OR d."facultad_id" IS NULL)
        AND d."codigo" LIKE 'DOC%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "docente"
      SET
        "departamento_id" = NULL,
        "facultad_id" = NULL
      WHERE "codigo" LIKE 'DOC%'
    `);
  }
}
