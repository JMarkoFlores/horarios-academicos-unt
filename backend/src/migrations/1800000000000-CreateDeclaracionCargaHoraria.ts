import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeclaracionCargaHoraria1800000000000 implements MigrationInterface {
  name = "CreateDeclaracionCargaHoraria1800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."usuario_rol_enum" RENAME TO "usuario_rol_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM(` +
        `'administradorsistema', 'directorescuela', 'directordepartamento', ` +
        `'coordinadoracademico', 'decano', 'operadorhorarios', 'docente')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "usuario"
        ALTER COLUMN "rol" TYPE "public"."usuario_rol_enum"
        USING (
          CASE "rol"::text
            WHEN 'ADMIN' THEN 'administradorsistema'::usuario_rol_enum
            WHEN 'COORDINADOR' THEN 'coordinadoracademico'::usuario_rol_enum
            WHEN 'OPERADOR' THEN 'operadorhorarios'::usuario_rol_enum
            WHEN 'administradorsistema' THEN 'administradorsistema'::usuario_rol_enum
            WHEN 'directorescuela' THEN 'directorescuela'::usuario_rol_enum
            WHEN 'coordinadoracademico' THEN 'coordinadoracademico'::usuario_rol_enum
            WHEN 'operadorhorarios' THEN 'operadorhorarios'::usuario_rol_enum
            WHEN 'docente' THEN 'docente'::usuario_rol_enum
            ELSE 'operadorhorarios'::usuario_rol_enum
          END
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'operadorhorarios'`,
    );
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum_old"`);

    await queryRunner.query(
      `ALTER TABLE "docente" ADD COLUMN IF NOT EXISTS "usuario_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD COLUMN IF NOT EXISTS "departamento_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD COLUMN IF NOT EXISTS "facultad_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD CONSTRAINT "FK_docente_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD CONSTRAINT "FK_docente_departamento" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD CONSTRAINT "FK_docente_facultad" FOREIGN KEY ("facultad_id") REFERENCES "facultad"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."estado_declaracion_carga_enum" AS ENUM(` +
        `'NO_INICIADO', 'BORRADOR', 'PENDIENTE_ENVIO', 'ENVIADO_DOCENTE', ` +
        `'OBSERVADO_DPTO', 'SUBSANADO', 'VALIDADO_DPTO', 'OBSERVADO_FACULTAD', ` +
        `'APROBADO_FACULTAD', 'CERRADO', 'ANULADO')`,
    );
    await queryRunner.query(`
      CREATE TABLE "declaracion_carga_horaria" (
        "id" SERIAL NOT NULL,
        "docente_id" integer NOT NULL,
        "departamento_id" integer NOT NULL,
        "facultad_id" integer NOT NULL,
        "periodo_academico_id" integer NOT NULL,
        "sede" character varying(120),
        "estado" "public"."estado_declaracion_carga_enum" NOT NULL DEFAULT 'NO_INICIADO',
        "observaciones" text,
        "carga_no_lectiva" jsonb,
        "fecha_firma_docente" TIMESTAMP,
        "fecha_firma_director" TIMESTAMP,
        "fecha_firma_decano" TIMESTAMP,
        "usuario_firmante_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_declaracion_carga_horaria_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_declaracion_carga_docente_periodo" UNIQUE ("docente_id", "periodo_academico_id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_departamento" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_facultad" FOREIGN KEY ("facultad_id") REFERENCES "facultad"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_periodo" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_usuario_firmante" FOREIGN KEY ("usuario_firmante_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_declaracion_usuario_firmante"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_declaracion_periodo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_declaracion_facultad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_declaracion_departamento"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_declaracion_docente"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "declaracion_carga_horaria"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."estado_declaracion_carga_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "docente" DROP CONSTRAINT IF EXISTS "FK_docente_facultad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP CONSTRAINT IF EXISTS "FK_docente_departamento"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP CONSTRAINT IF EXISTS "FK_docente_usuario"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP COLUMN IF EXISTS "facultad_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP COLUMN IF EXISTS "departamento_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" DROP COLUMN IF EXISTS "usuario_id"`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."usuario_rol_enum" RENAME TO "usuario_rol_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('administradorsistema', 'directorescuela', 'coordinadoracademico', 'operadorhorarios', 'docente')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "usuario"
        ALTER COLUMN "rol" TYPE "public"."usuario_rol_enum"
        USING (
          CASE "rol"::text
            WHEN 'administradorsistema' THEN 'administradorsistema'::usuario_rol_enum
            WHEN 'directordepartamento' THEN 'operadorhorarios'::usuario_rol_enum
            WHEN 'decano' THEN 'operadorhorarios'::usuario_rol_enum
            WHEN 'directorescuela' THEN 'directorescuela'::usuario_rol_enum
            WHEN 'coordinadoracademico' THEN 'coordinadoracademico'::usuario_rol_enum
            WHEN 'operadorhorarios' THEN 'operadorhorarios'::usuario_rol_enum
            WHEN 'docente' THEN 'docente'::usuario_rol_enum
            ELSE 'operadorhorarios'::usuario_rol_enum
          END
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'operadorhorarios'`,
    );
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum_new"`);
  }
}
