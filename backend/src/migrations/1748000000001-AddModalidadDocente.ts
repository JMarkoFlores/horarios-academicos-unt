import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModalidadDocente1748000000001 implements MigrationInterface {
  name = "AddModalidadDocente1748000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."docente_modalidad_enum" AS ENUM('DEDICACION_EXCLUSIVA','TIEMPO_COMPLETO_40','TIEMPO_PARCIAL_20','TIEMPO_PARCIAL_12','TIEMPO_PARCIAL_10','TIEMPO_PARCIAL_8')`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD "modalidad" "public"."docente_modalidad_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "docente" DROP COLUMN "modalidad"`);
    await queryRunner.query(`DROP TYPE "public"."docente_modalidad_enum"`);
  }
}
