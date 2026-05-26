import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocenteCursoTable1779075469472 implements MigrationInterface {
  name = "AddDocenteCursoTable1779075469472";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" DROP CONSTRAINT "FK_disponibilidad_docente_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" DROP CONSTRAINT "FK_grupo_periodo_academico"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" DROP CONSTRAINT "FK_grupo_curso"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_curso"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_grupo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_ventana"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_seleccion_temporal_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_seleccion_temporal_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" DROP CONSTRAINT "FK_preferencias_notificacion_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion_docente" DROP CONSTRAINT "FK_notificacion_docente_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_curso"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_conflicto_asignacion_docente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_conflicto_asignacion_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_curso_ambiente_curso"`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_curso_ambiente_ambiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" DROP CONSTRAINT "UQ_disponibilidad_docente"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."docente_curso_tipo_clase_enum" AS ENUM('TEORIA', 'PRACTICA', 'LABORATORIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "docente_curso" ("id" SERIAL NOT NULL, "docente_id" integer NOT NULL, "curso_id" integer NOT NULL, "tipo_clase" "public"."docente_curso_tipo_clase_enum" NOT NULL, "periodo_id" integer, CONSTRAINT "UQ_09891ebd7e370f9d779e33e615b" UNIQUE ("docente_id", "curso_id", "tipo_clase", "periodo_id"), CONSTRAINT "PK_1dc0a92052862ac0d9cf3c84a7b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ALTER COLUMN "grupo_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "reset_token" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disponibilidad_dia_hora" ON "disponibilidad_docente" ("dia_semana", "hora_inicio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disponibilidad_docente_periodo" ON "disponibilidad_docente" ("docente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_disponibilidad_periodo" ON "disponibilidad_docente" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_grupo_periodo" ON "grupo" ("periodo_academico_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_horario_dia_hora" ON "horario_asignado" ("dia_semana", "hora_inicio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_horario_ambiente_periodo" ON "horario_asignado" ("ambiente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_horario_docente_periodo" ON "horario_asignado" ("docente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_horario_periodo" ON "horario_asignado" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cola_docente" ON "cola_docentes" ("docente_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_hora" ON "ventana_atencion" ("hora_inicio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ventana_periodo" ON "ventana_atencion" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_dia_hora" ON "seleccion_temporal" ("dia_semana", "hora_inicio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_ambiente" ON "seleccion_temporal" ("ambiente_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seleccion_docente" ON "seleccion_temporal" ("docente_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_restriccion_periodo" ON "restriccion_institucional" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_preasignacion_dia_hora" ON "preasignacion" ("dia_semana", "hora_inicio") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_preasignacion_ambiente_periodo" ON "preasignacion" ("ambiente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_preasignacion_docente_periodo" ON "preasignacion" ("docente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_preasignacion_periodo" ON "preasignacion" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dia_no_laborable_periodo" ON "dia_no_laborable" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conflicto_ambiente_periodo" ON "conflicto_asignacion" ("ambiente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conflicto_docente_periodo" ON "conflicto_asignacion" ("docente_id", "periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conflicto_periodo" ON "conflicto_asignacion" ("periodo_academico") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bcebbd70d1423ffecd9a9cb24" ON "curso_ambiente" ("curso_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95fc1bdc329a18f81c82173756" ON "curso_ambiente" ("ambiente_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "UQ_bcc62518fbca64e1d6dbd2a24f1" UNIQUE ("docente_id", "dia_semana", "hora_inicio", "periodo_academico")`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "FK_41e95d4a73b916e376fd13c0ce7" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_beb3b07bbea70802bb351046219" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_649630a8ea21aa1924d0c42dfc0" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_1b933c7a9093f3dac4bd5681b8c" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_d421a367b14b6aefa44ad7d7a67" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_c01156d05e0e80f370e7a847b3e" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_6f200f092b63505fa058e635b90" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_9bb3d4bc71e60397b9b4353f025" FOREIGN KEY ("ventana_id") REFERENCES "ventana_atencion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_80a946c0f2fb09e7cf31a6fe403" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_625320b63db3af652533d7f8dee" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_a958a243ccfa010244e96d712fb" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" ADD CONSTRAINT "FK_57fad6a197efc7dcacf8f4cd179" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion_docente" ADD CONSTRAINT "FK_4d7fa060e12214a8c6c0bac85ca" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_bad90e55cd46275bd307d911901" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_3fc3c0933545955280c3805378c" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_89fe0bf4e1c5d74476d8e7a3eb2" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" ADD CONSTRAINT "FK_cc3103c8a4389eed2565b62ac79" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" ADD CONSTRAINT "FK_272eb94ed17ffddcfcd0a396799" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" ADD CONSTRAINT "FK_docente_curso_periodo" FOREIGN KEY ("periodo_id") REFERENCES "periodo_academico"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_2fc9ac9cdc6bda3c5d376ff7be8" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_b35a74754cbf6a759d3fc550646" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_95fc1bdc329a18f81c821737567" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_95fc1bdc329a18f81c821737567"`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_b35a74754cbf6a759d3fc550646"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_2fc9ac9cdc6bda3c5d376ff7be8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" DROP CONSTRAINT "FK_docente_curso_periodo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" DROP CONSTRAINT "FK_272eb94ed17ffddcfcd0a396799"`,
    );
    await queryRunner.query(
      `ALTER TABLE "docente_curso" DROP CONSTRAINT "FK_cc3103c8a4389eed2565b62ac79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_89fe0bf4e1c5d74476d8e7a3eb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_3fc3c0933545955280c3805378c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_bad90e55cd46275bd307d911901"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion_docente" DROP CONSTRAINT "FK_4d7fa060e12214a8c6c0bac85ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" DROP CONSTRAINT "FK_57fad6a197efc7dcacf8f4cd179"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_a958a243ccfa010244e96d712fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_625320b63db3af652533d7f8dee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_80a946c0f2fb09e7cf31a6fe403"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_9bb3d4bc71e60397b9b4353f025"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_6f200f092b63505fa058e635b90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_c01156d05e0e80f370e7a847b3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_d421a367b14b6aefa44ad7d7a67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_1b933c7a9093f3dac4bd5681b8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" DROP CONSTRAINT "FK_649630a8ea21aa1924d0c42dfc0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" DROP CONSTRAINT "FK_beb3b07bbea70802bb351046219"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" DROP CONSTRAINT "FK_41e95d4a73b916e376fd13c0ce7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" DROP CONSTRAINT "UQ_bcc62518fbca64e1d6dbd2a24f1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95fc1bdc329a18f81c82173756"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bcebbd70d1423ffecd9a9cb24"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_conflicto_periodo"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_conflicto_docente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_conflicto_ambiente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_dia_no_laborable_periodo"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_preasignacion_periodo"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_preasignacion_docente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_preasignacion_ambiente_periodo"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_preasignacion_dia_hora"`);
    await queryRunner.query(`DROP INDEX "public"."idx_restriccion_periodo"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seleccion_docente"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seleccion_ambiente"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seleccion_dia_hora"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ventana_periodo"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ventana_hora"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cola_docente"`);
    await queryRunner.query(`DROP INDEX "public"."idx_horario_periodo"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_horario_docente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_horario_ambiente_periodo"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_horario_dia_hora"`);
    await queryRunner.query(`DROP INDEX "public"."idx_grupo_periodo"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disponibilidad_periodo"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_disponibilidad_docente_periodo"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_disponibilidad_dia_hora"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "reset_token" SET DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ALTER COLUMN "grupo_id" SET NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "docente_curso"`);
    await queryRunner.query(
      `DROP TYPE "public"."docente_curso_tipo_clase_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "UQ_disponibilidad_docente" UNIQUE ("dia_semana", "hora_inicio", "periodo_academico", "docente_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_curso_ambiente_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_curso_ambiente_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_conflicto_asignacion_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_conflicto_asignacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion_docente" ADD CONSTRAINT "FK_notificacion_docente_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" ADD CONSTRAINT "FK_preferencias_notificacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_seleccion_temporal_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_seleccion_temporal_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_ventana" FOREIGN KEY ("ventana_id") REFERENCES "ventana_atencion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_grupo" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_grupo_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_grupo_periodo_academico" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "FK_disponibilidad_docente_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
