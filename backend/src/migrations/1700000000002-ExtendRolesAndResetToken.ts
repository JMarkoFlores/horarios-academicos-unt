import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendRolesAndResetToken1700000000002 implements MigrationInterface {
  name = "ExtendRolesAndResetToken1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename old enum type
    await queryRunner.query(
      `ALTER TYPE "public"."usuario_rol_enum" RENAME TO "usuario_rol_enum_old"`,
    );

    // 2. Create new enum type with 5 roles
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM(` +
        `'administradorsistema', 'directorescuela', 'coordinadoracademico', ` +
        `'operadorhorarios', 'docente')`,
    );

    // 3. Drop default before type change
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" DROP DEFAULT`,
    );

    // 4. Cast existing values to new enum
    await queryRunner.query(`
      ALTER TABLE "usuario"
        ALTER COLUMN "rol" TYPE "public"."usuario_rol_enum"
        USING (
          CASE "rol"::text
            WHEN 'ADMIN'        THEN 'administradorsistema'::usuario_rol_enum
            WHEN 'COORDINADOR'  THEN 'coordinadoracademico'::usuario_rol_enum
            WHEN 'OPERADOR'     THEN 'operadorhorarios'::usuario_rol_enum
            ELSE                     'operadorhorarios'::usuario_rol_enum
          END
        )
    `);

    // 5. Restore default
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'operadorhorarios'`,
    );

    // 6. Drop old enum
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum_old"`);

    // 7. Add reset_token columns
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "reset_token" character varying(255) DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "reset_token_expira" TIMESTAMP DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove reset_token columns
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP COLUMN IF EXISTS "reset_token_expira"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP COLUMN IF EXISTS "reset_token"`,
    );

    // Restore old enum
    await queryRunner.query(
      `ALTER TYPE "public"."usuario_rol_enum" RENAME TO "usuario_rol_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('ADMIN', 'COORDINADOR', 'OPERADOR')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "usuario"
        ALTER COLUMN "rol" TYPE "public"."usuario_rol_enum"
        USING (
          CASE "rol"::text
            WHEN 'administradorsistema'  THEN 'ADMIN'::usuario_rol_enum
            WHEN 'coordinadoracademico'  THEN 'COORDINADOR'::usuario_rol_enum
            ELSE                              'OPERADOR'::usuario_rol_enum
          END
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'OPERADOR'`,
    );
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum_new"`);
  }
}
