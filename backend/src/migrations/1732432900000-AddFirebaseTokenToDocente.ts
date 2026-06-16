import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFirebaseTokenToDocente1732432900000 implements MigrationInterface {
  name = "AddFirebaseTokenToDocente1732432900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      ADD COLUMN "firebase_token" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente"
      DROP COLUMN "firebase_token"
    `);
  }
}
