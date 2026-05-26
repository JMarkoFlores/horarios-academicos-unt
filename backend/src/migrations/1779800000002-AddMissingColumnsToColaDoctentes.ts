import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingColumnsToColaDoctentes1779800000002 implements MigrationInterface {
  name = "AddMissingColumnsToColaDoctentes1779800000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add RazonAusencia enum type if it doesn't exist
    await queryRunner.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cola_docentes_razon_ausencia_enum') THEN
          CREATE TYPE "public"."cola_docentes_razon_ausencia_enum" AS ENUM('INASISTENCIA', 'REPROGRAMACION', 'CANCELACION', 'OTRO');
        END IF;
      END
      $$;`
    );

    // Add razon_ausencia column
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD COLUMN IF NOT EXISTS "razon_ausencia" "public"."cola_docentes_razon_ausencia_enum"`
    );

    // Add eventos_sesion column
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD COLUMN IF NOT EXISTS "eventos_sesion" jsonb`
    );

    // Add validaciones_ejecutadas column
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD COLUMN IF NOT EXISTS "validaciones_ejecutadas" integer NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP COLUMN IF EXISTS "validaciones_ejecutadas"`
    );

    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP COLUMN IF EXISTS "eventos_sesion"`
    );

    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP COLUMN IF EXISTS "razon_ausencia"`
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."cola_docentes_razon_ausencia_enum"`
    );
  }
}
