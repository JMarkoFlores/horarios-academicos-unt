import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeleccionesTmpTable1779800001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'selecciones_temporales_tipo_clase_enum' AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."selecciones_temporales_tipo_clase_enum" AS ENUM('TEORIA', 'LABORATORIO');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'selecciones_temporales_estado_enum' AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."selecciones_temporales_estado_enum" AS ENUM('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "selecciones_temporales" (
        "id" SERIAL NOT NULL,
        "sesion_id" uuid NOT NULL,
        "ventana_atencion_id" uuid,
        "docente_id" integer NOT NULL,
        "curso_id" integer NOT NULL,
        "grupo_id" integer NOT NULL,
        "ambiente_id" integer NOT NULL,
        "dia" integer NOT NULL,
        "hora_inicio" time NOT NULL,
        "hora_fin" time NOT NULL,
        "tipo_clase" "public"."selecciones_temporales_tipo_clase_enum" NOT NULL,
        "periodo" varchar(20) NOT NULL,
        "estado" "public"."selecciones_temporales_estado_enum" NOT NULL DEFAULT 'PENDIENTE',
        "contexto_validacion" jsonb,
        "creada_en" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "actualizada_en" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expira_en" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 minutes',
        "razon_rechazo" text,
        "sincronizada_desde_redis" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_f5a114cfa2c71da5e89b5d98cc2" PRIMARY KEY ("id"),
        CONSTRAINT "FK_b94c5bf1479961af896218ce1d6" FOREIGN KEY ("ventana_atencion_id") REFERENCES "ventana_atencion" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ec1cfd879377f387e49017a121f" FOREIGN KEY ("docente_id") REFERENCES "docente" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_9785652c9f00a414586be28ddb7" FOREIGN KEY ("curso_id") REFERENCES "curso" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_3014efcb36da2e22d8242e3ab5d" FOREIGN KEY ("grupo_id") REFERENCES "grupo" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_762f727d0fcac0024683680f1a0" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_selecciones_sesion_estado"
      ON "selecciones_temporales" ("sesion_id", "estado")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_selecciones_expira_en"
      ON "selecciones_temporales" ("expira_en")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_selecciones_unique_celda"
      ON "selecciones_temporales" ("sesion_id", "ambiente_id", "dia", "hora_inicio", "periodo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('selecciones_temporales');
  }
}
