import { MigrationInterface, QueryRunner } from "typeorm";

export class RebuildVentanasModule1779147000000 implements MigrationInterface {
  name = "RebuildVentanasModule1779147000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      DECLARE
        ventanas_count bigint := 0;
        cola_count bigint := 0;
        seleccion_count bigint := 0;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'ventana_atencion'
        ) THEN
          SELECT COUNT(*) INTO ventanas_count FROM "ventana_atencion";
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'cola_docentes'
        ) THEN
          SELECT COUNT(*) INTO cola_count FROM "cola_docentes";
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'seleccion_temporal'
        ) THEN
          SELECT COUNT(*) INTO seleccion_count FROM "seleccion_temporal";
        END IF;

        IF ventanas_count > 0 OR cola_count > 0 OR seleccion_count > 0 THEN
          RAISE EXCEPTION 'Las tablas legacy de ventanas contienen datos y requieren migración manual antes de aplicar RebuildVentanasModule1779147000000';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "seleccion_temporal"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cola_docentes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ventana_atencion"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."ventana_atencion_estado_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."cola_docentes_estado_enum"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."ventana_atencion_estado_enum" AS ENUM('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cola_docentes_estado_enum" AS ENUM('ESPERANDO', 'EN_ATENCION', 'COMPLETADO', 'AUSENTE')`,
    );

    await queryRunner.query(
      `CREATE TABLE "ventana_atencion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "periodo" character varying(20) NOT NULL, "fecha" date NOT NULL, "categoria" character varying(120) NOT NULL, "modalidad" character varying(120), "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "intervalo_minutos" integer NOT NULL DEFAULT '30', "estado" "public"."ventana_atencion_estado_enum" NOT NULL DEFAULT 'PROGRAMADA', "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ventana_atencion_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_periodo" ON "ventana_atencion" ("periodo")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_fecha" ON "ventana_atencion" ("fecha")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_categoria" ON "ventana_atencion" ("categoria")`,
    );

    await queryRunner.query(
      `CREATE TABLE "cola_docentes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ventana_id" uuid NOT NULL, "docente_id" integer NOT NULL, "orden" integer NOT NULL, "estado" "public"."cola_docentes_estado_enum" NOT NULL DEFAULT 'ESPERANDO', "hora_llamada" TIMESTAMP, "hora_fin_atencion" TIMESTAMP, CONSTRAINT "PK_cola_docentes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cola_docente_ventana" ON "cola_docentes" ("ventana_id", "orden")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cola_docente_docente" ON "cola_docentes" ("docente_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_ventana_uuid" FOREIGN KEY ("ventana_id") REFERENCES "ventana_atencion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_ventana_uuid"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_cola_docente_docente"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cola_docente_ventana"`);
    await queryRunner.query(`DROP TABLE "cola_docentes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ventana_categoria"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ventana_fecha"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ventana_periodo"`);
    await queryRunner.query(`DROP TABLE "ventana_atencion"`);
    await queryRunner.query(`DROP TYPE "public"."cola_docentes_estado_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."ventana_atencion_estado_enum"`,
    );

    await queryRunner.query(
      `CREATE TABLE "ventana_atencion" ("id" SERIAL NOT NULL, "periodo_academico" character varying(20) NOT NULL, "fecha" date NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ventana_atencion_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_periodo" ON "ventana_atencion" ("periodo_academico")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_hora" ON "ventana_atencion" ("hora_inicio")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."cola_docentes_estado_enum" AS ENUM('ESPERANDO', 'EN_ATENCION', 'COMPLETADO', 'AUSENTE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cola_docentes" ("id" SERIAL NOT NULL, "orden" integer NOT NULL, "estado" "public"."cola_docentes_estado_enum" NOT NULL DEFAULT 'ESPERANDO', "turno_llamado_at" TIMESTAMP, "ventana_id" integer NOT NULL, "docente_id" integer NOT NULL, CONSTRAINT "PK_cola_docentes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cola_docente" ON "cola_docentes" ("docente_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_9bb3d4bc71e60397b9b4353f025" FOREIGN KEY ("ventana_id") REFERENCES "ventana_atencion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_80a946c0f2fb09e7cf31a6fe403" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "seleccion_temporal" ("id" SERIAL NOT NULL, "dia_semana" integer NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "expira_at" TIMESTAMP NOT NULL, "docente_id" integer NOT NULL, "ambiente_id" integer NOT NULL, CONSTRAINT "PK_seleccion_temporal_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_docente" ON "seleccion_temporal" ("docente_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_ambiente" ON "seleccion_temporal" ("ambiente_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_dia_hora" ON "seleccion_temporal" ("dia_semana", "hora_inicio")`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_625320b63db3af652533d7f8dee" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_a958a243ccfa010244e96d712fb" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
