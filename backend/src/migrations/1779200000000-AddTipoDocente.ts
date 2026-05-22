import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTipoDocente1779200000000 implements MigrationInterface {
  name = "AddTipoDocente1779200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL requires a committed transaction before a newly-added
    // enum value can be used in DML. Commit here, then restart.
    await queryRunner.query(
      `ALTER TYPE "public"."docente_categoria_enum" ADD VALUE IF NOT EXISTS 'SIN_CATEGORIA'`,
    );
    await queryRunner.commitTransaction();

    await queryRunner.query(
      `CREATE TYPE "public"."docente_tipo_docente_enum" AS ENUM('ORDINARIO', 'CONTRATADO', 'JEFE_PRACTICA_CONTRATADO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente" ADD "tipo_docente" "public"."docente_tipo_docente_enum"`,
    );
    await queryRunner.query(
      `UPDATE "docente" SET "tipo_docente" = 'ORDINARIO' WHERE "tipo_contrato" = 'NOMBRADO'`,
    );
    await queryRunner.query(
      `UPDATE "docente" SET "tipo_docente" = 'CONTRATADO' WHERE "tipo_contrato" = 'CONTRATADO'`,
    );
    await queryRunner.query(
      `UPDATE "docente" SET "categoria" = 'SIN_CATEGORIA' WHERE "categoria" = 'JEFE_PRACTICA'`,
    );

    // Restart a transaction so TypeORM can record this migration in its table.
    await queryRunner.startTransaction();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "docente" DROP COLUMN "tipo_docente"`);
    await queryRunner.query(`DROP TYPE "public"."docente_tipo_docente_enum"`);
  }
}
