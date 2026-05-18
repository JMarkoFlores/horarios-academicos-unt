import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEstadoPeriodoAcademico1700000000003 implements MigrationInterface {
  name = "AddEstadoPeriodoAcademico1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type for estado periodo
    await queryRunner.query(
      `CREATE TYPE "public"."periodo_academico_estado_enum" AS ENUM('planificacion', 'asignacionhorarios', 'encurso', 'finalizado')`,
    );

    // 2. Add estado column to periodo_academico
    await queryRunner.query(
      `ALTER TABLE "periodo_academico" ADD COLUMN "estado" "public"."periodo_academico_estado_enum" NOT NULL DEFAULT 'planificacion'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop estado column
    await queryRunner.query(
      `ALTER TABLE "periodo_academico" DROP COLUMN "estado"`,
    );

    // 2. Drop enum type
    await queryRunner.query(
      `DROP TYPE "public"."periodo_academico_estado_enum"`,
    );
  }
}
