import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIbmToDocente1800000000001 implements MigrationInterface {
  name = "AddIbmToDocente1800000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      ADD COLUMN "ibm" integer UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      DROP COLUMN "ibm"
    `);
  }
}
