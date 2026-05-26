import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGruposToDocenteCurso1779200000006 implements MigrationInterface {
  name = 'AddGruposToDocenteCurso1779200000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente_curso" ADD COLUMN "grupos" integer DEFAULT 1 NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "docente_curso" DROP COLUMN "grupos"
    `);
  }
}
