import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPracticaToDocenteCursoTipoClase1779075469473
  implements MigrationInterface
{
  name = "AddPracticaToDocenteCursoTipoClase1779075469473";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."docente_curso_tipo_clase_enum" ADD VALUE IF NOT EXISTS 'PRACTICA'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."docente_curso_tipo_clase_enum" RENAME TO "docente_curso_tipo_clase_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."docente_curso_tipo_clase_enum" AS ENUM('TEORIA', 'LABORATORIO')`,
    );
    await queryRunner.query(`
      ALTER TABLE "docente_curso"
        ALTER COLUMN "tipo_clase" TYPE "public"."docente_curso_tipo_clase_enum"
        USING (
          CASE "tipo_clase"::text
            WHEN 'PRACTICA' THEN 'TEORIA'::docente_curso_tipo_clase_enum
            ELSE "tipo_clase"::text::docente_curso_tipo_clase_enum
          END
        )
    `);
    await queryRunner.query(`DROP TYPE "public"."docente_curso_tipo_clase_enum_old"`);
  }
}
