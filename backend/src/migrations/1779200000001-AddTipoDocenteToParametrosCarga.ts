import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTipoDocenteToParametrosCarga1779200000001
  implements MigrationInterface
{
  name = "AddTipoDocenteToParametrosCarga1779200000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD COLUMN IF NOT EXISTS "tipo_docente" VARCHAR(30) NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(
      `UPDATE "parametros_carga" SET "tipo_docente" = 'JEFE_PRACTICA_CONTRATADO' WHERE "categoria" = 'JEFE_PRACTICA'`,
    );
    await queryRunner.query(
      `UPDATE "parametros_carga" SET "tipo_docente" = 'ORDINARIO' WHERE "tipo_contrato" = 'NOMBRADO' AND "tipo_docente" = ''`,
    );
    await queryRunner.query(
      `UPDATE "parametros_carga" SET "tipo_docente" = 'CONTRATADO' WHERE "tipo_contrato" = 'CONTRATADO' AND "tipo_docente" = ''`,
    );

    await queryRunner.query(
      `UPDATE "parametros_carga" SET "categoria" = 'SIN_CATEGORIA' WHERE "categoria" = 'JEFE_PRACTICA'`,
    );
    await queryRunner.query(
      `UPDATE "parametros_carga" SET "categoria" = 'SIN_CATEGORIA' WHERE "tipo_docente" = 'CONTRATADO' AND "categoria" NOT IN ('SIN_CATEGORIA')`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_cat_tc_mod"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD CONSTRAINT "UQ_parametros_carga_td_cat_mod" UNIQUE ("periodo_academico", "tipo_docente", "categoria", "modalidad")`,
    );

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ALTER COLUMN "tipo_docente" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP COLUMN IF EXISTS "tipo_contrato"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_td_cat_mod"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD COLUMN IF NOT EXISTS "tipo_contrato" VARCHAR(30) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP COLUMN IF EXISTS "tipo_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD CONSTRAINT "UQ_parametros_carga_periodo_cat_tc_mod" UNIQUE ("periodo_academico", "categoria", "tipo_contrato", "modalidad")`,
    );
  }
}
