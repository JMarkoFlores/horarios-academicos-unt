import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHorariosModulo1779139288779 implements MigrationInterface {
    name = 'CreateHorariosModulo1779139288779'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`ALTER TYPE "public"."horario_asignado_estado_enum" ADD VALUE IF NOT EXISTS 'CONFIRMADO'`);
        await queryRunner.query(`ALTER TYPE "public"."horario_asignado_estado_enum" ADD VALUE IF NOT EXISTS 'CONFLICTO'`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "periodo_academico" TO "periodo"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "dia_semana" TO "dia"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "created_at" TO "creado_en"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "updated_at" TO "actualizado_en"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_docente_periodo"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_ambiente_periodo"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_dia_hora"`);
        await queryRunner.query(`CREATE INDEX "idx_horario_docente_id" ON "horario_asignado" ("docente_id")`);
        await queryRunner.query(`CREATE INDEX "idx_horario_ambiente_id" ON "horario_asignado" ("ambiente_id")`);
        await queryRunner.query(`CREATE INDEX "idx_horario_dia" ON "horario_asignado" ("dia")`);
        await queryRunner.query(`CREATE TABLE "auditoria_horario" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "horario_id" integer NOT NULL, "usuario_id" integer NOT NULL, "accion" character varying(120) NOT NULL, "datos_anteriores" jsonb, "datos_nuevos" jsonb, "ip" character varying(100) NOT NULL, "motivo" text, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4e3be43862414ea9e7f1b640251" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "auditoria_horario" ADD CONSTRAINT "FK_auditoria_horario_horario" FOREIGN KEY ("horario_id") REFERENCES "horario_asignado"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auditoria_horario" ADD CONSTRAINT "FK_auditoria_horario_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auditoria_horario" DROP CONSTRAINT "FK_auditoria_horario_usuario"`);
        await queryRunner.query(`ALTER TABLE "auditoria_horario" DROP CONSTRAINT "FK_auditoria_horario_horario"`);
        await queryRunner.query(`DROP TABLE "auditoria_horario"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_dia"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_ambiente_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_horario_docente_id"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "actualizado_en" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "creado_en" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "dia" TO "dia_semana"`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" RENAME COLUMN "periodo" TO "periodo_academico"`);
        await queryRunner.query(`CREATE INDEX "idx_horario_dia_hora" ON "horario_asignado" ("dia_semana", "hora_inicio")`);
        await queryRunner.query(`CREATE INDEX "idx_horario_ambiente_periodo" ON "horario_asignado" ("ambiente_id", "periodo_academico")`);
        await queryRunner.query(`CREATE INDEX "idx_horario_docente_periodo" ON "horario_asignado" ("docente_id", "periodo_academico")`);
    }

}
