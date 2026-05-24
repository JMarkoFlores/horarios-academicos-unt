import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHorasAsignadasToDocente1779500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "docente" ADD COLUMN IF NOT EXISTS "horas_asignadas" smallint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "docente" DROP COLUMN IF EXISTS "horas_asignadas"`,
    );
  }
}
