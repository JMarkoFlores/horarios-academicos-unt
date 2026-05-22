import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfiguracionInstitucional1779200000002 implements MigrationInterface {
  name = "AddConfiguracionInstitucional1779200000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "turno_horario" (
        "id" SERIAL NOT NULL,
        "nombre" character varying(50) NOT NULL,
        "hora_inicio" time NOT NULL,
        "hora_fin" time NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_turno_horario_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dia_activo" (
        "id" SERIAL NOT NULL,
        "dia_semana" smallint NOT NULL,
        "nombre" character varying(20) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_dia_activo_dia_semana" UNIQUE ("dia_semana"),
        CONSTRAINT "PK_dia_activo_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parametros_carga" (
        "id" SERIAL NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "horas_min_semanal" smallint NOT NULL DEFAULT 4,
        "horas_max_semanal" smallint NOT NULL DEFAULT 20,
        "cursos_min_docente" smallint NOT NULL DEFAULT 1,
        "cursos_max_docente" smallint NOT NULL DEFAULT 5,
        "modalidad" character varying(30) NOT NULL DEFAULT '',
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_parametros_carga_periodo" UNIQUE ("periodo_academico"),
        CONSTRAINT "PK_parametros_carga_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "configuracion_general" (
        "id" SERIAL NOT NULL,
        "nombre_institucional" character varying(200) NOT NULL DEFAULT 'Universidad Nacional de Trujillo',
        "logo_url" character varying(500),
        "color_primario" character varying(20) NOT NULL DEFAULT '#1a237e',
        "color_secundario" character varying(20) NOT NULL DEFAULT '#283593',
        "color_acento" character varying(20) NOT NULL DEFAULT '#e91e63',
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_configuracion_general_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "dia_activo" ("dia_semana","nombre","activo") VALUES
        (1,'Lunes',true),
        (2,'Martes',true),
        (3,'Miércoles',true),
        (4,'Jueves',true),
        (5,'Viernes',true),
        (6,'Sábado',false),
        (7,'Domingo',false)
      ON CONFLICT ("dia_semana") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion_general"`);
    await queryRunner.query(`DROP TABLE "parametros_carga"`);
    await queryRunner.query(`DROP TABLE "dia_activo"`);
    await queryRunner.query(`DROP TABLE "turno_horario"`);
  }
}
