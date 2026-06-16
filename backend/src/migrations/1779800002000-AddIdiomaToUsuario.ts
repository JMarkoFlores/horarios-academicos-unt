import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdiomaToUsuario1779800002000 implements MigrationInterface {
  name = "AddIdiomaToUsuario1779800002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuario"
      ADD COLUMN "idioma" varchar(5) DEFAULT 'es' NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuario"
      DROP COLUMN "idioma"
    `);
  }
}
