import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFacultades1779300000001 implements MigrationInterface {
  name = "CreateFacultades1779300000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "facultad" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(200) NOT NULL,
        "descripcion" character varying(500),
        "activo" boolean NOT NULL DEFAULT true,
        "coordinador_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_facultad_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_facultad_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "facultad"
        ADD CONSTRAINT "FK_facultad_coordinador"
        FOREIGN KEY ("coordinador_id") REFERENCES "usuario"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "escuela" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(200) NOT NULL,
        "descripcion" character varying(500),
        "activo" boolean NOT NULL DEFAULT true,
        "facultad_id" integer NOT NULL,
        "coordinador_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_escuela_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_escuela_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "escuela"
        ADD CONSTRAINT "FK_escuela_facultad"
        FOREIGN KEY ("facultad_id") REFERENCES "facultad"("id")
        ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "escuela"
        ADD CONSTRAINT "FK_escuela_coordinador"
        FOREIGN KEY ("coordinador_id") REFERENCES "usuario"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departamento" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(200) NOT NULL,
        "descripcion" character varying(500),
        "activo" boolean NOT NULL DEFAULT true,
        "escuela_id" integer NOT NULL,
        "coordinador_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_departamento_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_departamento_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "departamento"
        ADD CONSTRAINT "FK_departamento_escuela"
        FOREIGN KEY ("escuela_id") REFERENCES "escuela"("id")
        ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "departamento"
        ADD CONSTRAINT "FK_departamento_coordinador"
        FOREIGN KEY ("coordinador_id") REFERENCES "usuario"("id")
        ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "departamento" DROP CONSTRAINT IF EXISTS "FK_departamento_coordinador"`,
    );
    await queryRunner.query(
      `ALTER TABLE "departamento" DROP CONSTRAINT IF EXISTS "FK_departamento_escuela"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "departamento"`);
    await queryRunner.query(
      `ALTER TABLE "escuela" DROP CONSTRAINT IF EXISTS "FK_escuela_coordinador"`,
    );
    await queryRunner.query(
      `ALTER TABLE "escuela" DROP CONSTRAINT IF EXISTS "FK_escuela_facultad"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "escuela"`);
    await queryRunner.query(
      `ALTER TABLE "facultad" DROP CONSTRAINT IF EXISTS "FK_facultad_coordinador"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "facultad"`);
  }
}
