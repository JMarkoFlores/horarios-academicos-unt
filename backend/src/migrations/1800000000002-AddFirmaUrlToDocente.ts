import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFirmaUrlToDocente1800000000002 implements MigrationInterface {
  name = "AddFirmaUrlToDocente1800000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      ADD COLUMN IF NOT EXISTS "firma_url" text
    `);

    await queryRunner.query(`
      ALTER TABLE "docente"
      ALTER COLUMN "firma_url" TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      DROP COLUMN IF EXISTS "firma_url"
    `);
  }
}
