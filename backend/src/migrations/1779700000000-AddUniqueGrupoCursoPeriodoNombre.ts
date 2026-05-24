import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueGrupoCursoPeriodoNombre1779700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "uq_grupo_curso_periodo_nombre" UNIQUE ("curso_id", "periodo_academico_id", "nombre")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grupo" DROP CONSTRAINT IF EXISTS "uq_grupo_curso_periodo_nombre"`,
    );
  }
}
