import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveHorasMaxDia1748000000003 implements MigrationInterface {
  name = "RemoveHorasMaxDia1748000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" DROP COLUMN IF EXISTS "horas_max_dia"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametros_carga" ADD COLUMN "horas_max_dia" smallint NOT NULL DEFAULT 6`,
    );
  }
}
