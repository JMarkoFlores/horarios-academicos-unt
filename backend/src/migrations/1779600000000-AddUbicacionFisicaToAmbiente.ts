import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUbicacionFisicaToAmbiente1779600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ambiente"
        ADD COLUMN IF NOT EXISTS "edificio" varchar(100),
        ADD COLUMN IF NOT EXISTS "coord_x"  float,
        ADD COLUMN IF NOT EXISTS "coord_y"  float,
        ADD COLUMN IF NOT EXISTS "sede"     varchar(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ambiente"
        DROP COLUMN IF EXISTS "edificio",
        DROP COLUMN IF EXISTS "coord_x",
        DROP COLUMN IF EXISTS "coord_y",
        DROP COLUMN IF EXISTS "sede"`,
    );
  }
}
