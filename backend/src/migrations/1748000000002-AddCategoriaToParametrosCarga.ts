import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoriaToParametrosCarga1748000000002 implements MigrationInterface {
  name = "AddCategoriaToParametrosCarga1748000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parametros_carga" (
        "id" SERIAL NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "categoria" character varying(30) NOT NULL DEFAULT '',
        "tipo_contrato" character varying(30) NOT NULL DEFAULT '',
        "modalidad" character varying(30) NOT NULL DEFAULT '',
        "horas_min_semanal" smallint NOT NULL DEFAULT '4',
        "horas_max_semanal" smallint NOT NULL DEFAULT '20',
        "cursos_min_docente" smallint NOT NULL DEFAULT '1',
        "cursos_max_docente" smallint NOT NULL DEFAULT '5',
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_parametros_carga_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "parametros_carga"
      DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_academico",
      DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_cat_tc"
    `);

    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD CONSTRAINT "UQ_parametros_carga_periodo_cat_tc" UNIQUE("periodo_academico", "categoria", "tipo_contrato")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP CONSTRAINT IF EXISTS "UQ_parametros_carga_periodo_cat_tc"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "parametros_carga"`);
  }
}
