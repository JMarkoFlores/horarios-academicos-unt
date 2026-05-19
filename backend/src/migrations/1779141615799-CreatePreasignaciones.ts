import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePreasignaciones1779141615799 implements MigrationInterface {
  name = "CreatePreasignaciones1779141615799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'preasignacion'
            AND column_name = 'id'
            AND data_type = 'integer'
        ) THEN
          IF EXISTS (SELECT 1 FROM "preasignacion" LIMIT 1) THEN
            RAISE EXCEPTION 'La tabla preasignacion antigua contiene datos y requiere migración manual antes de aplicar CreatePreasignaciones1779141615799';
          END IF;

          DROP TABLE "preasignacion";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."preasignacion_tipo_clase_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."preasignacion_tipo_clase_enum" AS ENUM('TEORIA', 'LABORATORIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "preasignacion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "docente_id" integer NOT NULL, "curso_id" integer NOT NULL, "grupo_id" integer, "tipo_clase" "public"."preasignacion_tipo_clase_enum", "dia" integer, "hora_inicio" TIME, "hora_fin" TIME, "ambiente_id" integer, "periodo" character varying(20) NOT NULL, "motivo" character varying(255) NOT NULL, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_preasignacion_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_preasignacion_periodo" ON "preasignacion" ("periodo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_preasignacion_docente_periodo" ON "preasignacion" ("docente_id", "periodo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_preasignacion_ambiente_periodo" ON "preasignacion" ("ambiente_id", "periodo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_preasignacion_dia_hora" ON "preasignacion" ("dia", "hora_inicio")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_preasignacion_docente'
        ) THEN
          ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_preasignacion_curso'
        ) THEN
          ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_preasignacion_grupo'
        ) THEN
          ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_grupo" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_preasignacion_ambiente'
        ) THEN
          ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_grupo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_curso"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_docente"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_preasignacion_dia_hora"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_preasignacion_ambiente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_preasignacion_docente_periodo"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_preasignacion_periodo"`);
    await queryRunner.query(`DROP TABLE "preasignacion"`);
    await queryRunner.query(
      `DROP TYPE "public"."preasignacion_tipo_clase_enum"`,
    );
  }
}
