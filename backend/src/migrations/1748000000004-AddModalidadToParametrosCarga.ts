import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModalidadToParametrosCarga1748000000004 implements MigrationInterface {
  name = "AddModalidadToParametrosCarga1748000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD COLUMN IF NOT EXISTS "modalidad" VARCHAR(30) NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_cat_tc"`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD CONSTRAINT "UQ_parametros_carga_periodo_cat_tc_mod" UNIQUE("periodo_academico", "categoria", "tipo_contrato", "modalidad")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_cat_tc_mod"`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD CONSTRAINT "UQ_parametros_carga_periodo_cat_tc" UNIQUE("periodo_academico", "categoria", "tipo_contrato")`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP COLUMN IF EXISTS "modalidad"`,
    );
  }
}
