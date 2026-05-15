import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('ADMIN', 'COORDINADOR', 'OPERADOR')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."docente_categoria_enum" AS ENUM('PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."docente_tipo_contrato_enum" AS ENUM('NOMBRADO', 'CONTRATADO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ambiente_tipo_enum" AS ENUM('AULA', 'LABORATORIO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."preasignacion_tipo_clase_enum" AS ENUM('TEORIA', 'LABORATORIO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."horario_asignado_tipo_clase_enum" AS ENUM('TEORIA', 'LABORATORIO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."horario_asignado_estado_enum" AS ENUM('BORRADOR', 'PUBLICADO', 'CERRADO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cola_docentes_estado_enum" AS ENUM('ESPERANDO', 'EN_ATENCION', 'COMPLETADO', 'AUSENTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notificacion_docente_canal_enum" AS ENUM('correo', 'whatsapp', 'telegram')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notificacion_docente_estado_enum" AS ENUM('PENDIENTE', 'ENVIADO', 'FALLIDO')`,
    );

    await queryRunner.query(`
      CREATE TABLE "usuario" (
        "id" SERIAL NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "email" character varying(150) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "rol" "public"."usuario_rol_enum" NOT NULL DEFAULT 'OPERADOR',
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuario_email" UNIQUE ("email"),
        CONSTRAINT "PK_usuario_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "docente" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombres" character varying(150) NOT NULL,
        "apellidos" character varying(150) NOT NULL,
        "email" character varying(150) NOT NULL,
        "telefono" character varying(20),
        "categoria" "public"."docente_categoria_enum" NOT NULL,
        "tipo_contrato" "public"."docente_tipo_contrato_enum" NOT NULL,
        "fecha_ingreso" date NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_docente_codigo" UNIQUE ("codigo"),
        CONSTRAINT "UQ_docente_email" UNIQUE ("email"),
        CONSTRAINT "PK_docente_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "periodo_academico" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "fecha_inicio" date NOT NULL,
        "fecha_fin" date NOT NULL,
        "activo" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_periodo_academico_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_periodo_academico_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "curso" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "creditos" integer NOT NULL,
        "horas_teoria" integer NOT NULL,
        "horas_laboratorio" integer NOT NULL DEFAULT 0,
        "ciclo" integer NOT NULL,
        "tiene_laboratorio" boolean NOT NULL DEFAULT false,
        "prerequisitos" text,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_curso_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_curso_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ambiente" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "tipo" "public"."ambiente_tipo_enum" NOT NULL,
        "capacidad" integer NOT NULL,
        "piso" integer,
        "pabellon" character varying(50),
        "equipamiento" text,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_ambiente_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_ambiente_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "grupo" (
        "id" SERIAL NOT NULL,
        "codigo" character varying(20) NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "ciclo" integer NOT NULL,
        "cupo_maximo" integer NOT NULL,
        "periodo_academico_id" integer NOT NULL,
        "curso_id" integer NOT NULL,
        CONSTRAINT "PK_grupo_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "disponibilidad_docente" (
        "id" SERIAL NOT NULL,
        "dia_semana" integer NOT NULL,
        "hora_inicio" time without time zone NOT NULL,
        "hora_fin" time without time zone NOT NULL,
        "disponible" boolean NOT NULL DEFAULT true,
        "periodo_academico" character varying(20) NOT NULL,
        "docente_id" integer NOT NULL,
        CONSTRAINT "PK_disponibilidad_docente_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_disponibilidad_docente" UNIQUE ("docente_id", "dia_semana", "hora_inicio", "periodo_academico")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "restriccion_institucional" (
        "id" SERIAL NOT NULL,
        "tipo_restriccion" character varying(100) NOT NULL,
        "valor" jsonb NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_restriccion_institucional_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "dia_no_laborable" (
        "id" SERIAL NOT NULL,
        "fecha" date NOT NULL,
        "descripcion" character varying(200) NOT NULL,
        "tipo" character varying(30) NOT NULL,
        "afecta_aulas" boolean NOT NULL DEFAULT true,
        "afecta_laboratorios" boolean NOT NULL DEFAULT true,
        "periodo_academico" character varying(20) NOT NULL,
        CONSTRAINT "PK_dia_no_laborable_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "preasignacion" (
        "id" SERIAL NOT NULL,
        "tipo_clase" "public"."preasignacion_tipo_clase_enum" NOT NULL,
        "dia_semana" integer NOT NULL,
        "hora_inicio" time without time zone NOT NULL,
        "hora_fin" time without time zone NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "docente_id" integer NOT NULL,
        "curso_id" integer NOT NULL,
        "ambiente_id" integer,
        CONSTRAINT "PK_preasignacion_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "horario_asignado" (
        "id" SERIAL NOT NULL,
        "tipo_clase" "public"."horario_asignado_tipo_clase_enum" NOT NULL,
        "dia_semana" integer NOT NULL,
        "hora_inicio" time without time zone NOT NULL,
        "hora_fin" time without time zone NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "estado" "public"."horario_asignado_estado_enum" NOT NULL DEFAULT 'BORRADOR',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "docente_id" integer NOT NULL,
        "curso_id" integer NOT NULL,
        "grupo_id" integer NOT NULL,
        "ambiente_id" integer NOT NULL,
        CONSTRAINT "PK_horario_asignado_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conflicto_asignacion" (
        "id" SERIAL NOT NULL,
        "descripcion" text NOT NULL,
        "tipo_conflicto" character varying(100) NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "resuelto" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "docente_id" integer,
        "ambiente_id" integer,
        CONSTRAINT "PK_conflicto_asignacion_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ventana_atencion" (
        "id" SERIAL NOT NULL,
        "periodo_academico" character varying(20) NOT NULL,
        "fecha" date NOT NULL,
        "hora_inicio" time without time zone NOT NULL,
        "hora_fin" time without time zone NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_ventana_atencion_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cola_docentes" (
        "id" SERIAL NOT NULL,
        "orden" integer NOT NULL,
        "estado" "public"."cola_docentes_estado_enum" NOT NULL DEFAULT 'ESPERANDO',
        "turno_llamado_at" TIMESTAMP,
        "ventana_id" integer NOT NULL,
        "docente_id" integer NOT NULL,
        CONSTRAINT "PK_cola_docentes_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "seleccion_temporal" (
        "id" SERIAL NOT NULL,
        "dia_semana" integer NOT NULL,
        "hora_inicio" time without time zone NOT NULL,
        "hora_fin" time without time zone NOT NULL,
        "expira_at" TIMESTAMP NOT NULL,
        "docente_id" integer NOT NULL,
        "ambiente_id" integer NOT NULL,
        CONSTRAINT "PK_seleccion_temporal_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notificacion_docente" (
        "id" SERIAL NOT NULL,
        "tipo" character varying(100) NOT NULL,
        "mensaje" text NOT NULL,
        "canal" "public"."notificacion_docente_canal_enum" NOT NULL,
        "estado" "public"."notificacion_docente_estado_enum" NOT NULL DEFAULT 'PENDIENTE',
        "enviado_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "docente_id" integer NOT NULL,
        CONSTRAINT "PK_notificacion_docente_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "preferencias_notificacion" (
        "id" SERIAL NOT NULL,
        "canal_correo" boolean NOT NULL DEFAULT true,
        "canal_whatsapp" boolean NOT NULL DEFAULT false,
        "telefono" character varying(20),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "docente_id" integer NOT NULL,
        CONSTRAINT "UQ_preferencias_notificacion_docente" UNIQUE ("docente_id"),
        CONSTRAINT "PK_preferencias_notificacion_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "curso_ambiente" (
        "curso_id" integer NOT NULL,
        "ambiente_id" integer NOT NULL,
        CONSTRAINT "PK_curso_ambiente" PRIMARY KEY ("curso_id", "ambiente_id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_grupo_periodo_academico" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupo" ADD CONSTRAINT "FK_grupo_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidad_docente" ADD CONSTRAINT "FK_disponibilidad_docente_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preasignacion" ADD CONSTRAINT "FK_preasignacion_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_grupo" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "horario_asignado" ADD CONSTRAINT "FK_horario_asignado_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_conflicto_asignacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conflicto_asignacion" ADD CONSTRAINT "FK_conflicto_asignacion_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_ventana" FOREIGN KEY ("ventana_id") REFERENCES "ventana_atencion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cola_docentes" ADD CONSTRAINT "FK_cola_docentes_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_seleccion_temporal_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seleccion_temporal" ADD CONSTRAINT "FK_seleccion_temporal_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificacion_docente" ADD CONSTRAINT "FK_notificacion_docente_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" ADD CONSTRAINT "FK_preferencias_notificacion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_curso_ambiente_curso" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_curso_ambiente_ambiente" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_curso_ambiente_ambiente"`);
    await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_curso_ambiente_curso"`);
    await queryRunner.query(`ALTER TABLE "preferencias_notificacion" DROP CONSTRAINT "FK_preferencias_notificacion_docente"`);
    await queryRunner.query(`ALTER TABLE "notificacion_docente" DROP CONSTRAINT "FK_notificacion_docente_docente"`);
    await queryRunner.query(`ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_seleccion_temporal_ambiente"`);
    await queryRunner.query(`ALTER TABLE "seleccion_temporal" DROP CONSTRAINT "FK_seleccion_temporal_docente"`);
    await queryRunner.query(`ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_docente"`);
    await queryRunner.query(`ALTER TABLE "cola_docentes" DROP CONSTRAINT "FK_cola_docentes_ventana"`);
    await queryRunner.query(`ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_conflicto_asignacion_ambiente"`);
    await queryRunner.query(`ALTER TABLE "conflicto_asignacion" DROP CONSTRAINT "FK_conflicto_asignacion_docente"`);
    await queryRunner.query(`ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_ambiente"`);
    await queryRunner.query(`ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_grupo"`);
    await queryRunner.query(`ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_curso"`);
    await queryRunner.query(`ALTER TABLE "horario_asignado" DROP CONSTRAINT "FK_horario_asignado_docente"`);
    await queryRunner.query(`ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_ambiente"`);
    await queryRunner.query(`ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_curso"`);
    await queryRunner.query(`ALTER TABLE "preasignacion" DROP CONSTRAINT "FK_preasignacion_docente"`);
    await queryRunner.query(`ALTER TABLE "disponibilidad_docente" DROP CONSTRAINT "FK_disponibilidad_docente_docente"`);
    await queryRunner.query(`ALTER TABLE "grupo" DROP CONSTRAINT "FK_grupo_curso"`);
    await queryRunner.query(`ALTER TABLE "grupo" DROP CONSTRAINT "FK_grupo_periodo_academico"`);

    await queryRunner.query(`DROP TABLE "curso_ambiente"`);
    await queryRunner.query(`DROP TABLE "preferencias_notificacion"`);
    await queryRunner.query(`DROP TABLE "notificacion_docente"`);
    await queryRunner.query(`DROP TABLE "seleccion_temporal"`);
    await queryRunner.query(`DROP TABLE "cola_docentes"`);
    await queryRunner.query(`DROP TABLE "ventana_atencion"`);
    await queryRunner.query(`DROP TABLE "conflicto_asignacion"`);
    await queryRunner.query(`DROP TABLE "horario_asignado"`);
    await queryRunner.query(`DROP TABLE "preasignacion"`);
    await queryRunner.query(`DROP TABLE "dia_no_laborable"`);
    await queryRunner.query(`DROP TABLE "restriccion_institucional"`);
    await queryRunner.query(`DROP TABLE "disponibilidad_docente"`);
    await queryRunner.query(`DROP TABLE "grupo"`);
    await queryRunner.query(`DROP TABLE "ambiente"`);
    await queryRunner.query(`DROP TABLE "curso"`);
    await queryRunner.query(`DROP TABLE "periodo_academico"`);
    await queryRunner.query(`DROP TABLE "docente"`);
    await queryRunner.query(`DROP TABLE "usuario"`);

    await queryRunner.query(`DROP TYPE "public"."notificacion_docente_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notificacion_docente_canal_enum"`);
    await queryRunner.query(`DROP TYPE "public"."cola_docentes_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."horario_asignado_estado_enum"`);
    await queryRunner.query(`DROP TYPE "public"."horario_asignado_tipo_clase_enum"`);
    await queryRunner.query(`DROP TYPE "public"."preasignacion_tipo_clase_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ambiente_tipo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."docente_tipo_contrato_enum"`);
    await queryRunner.query(`DROP TYPE "public"."docente_categoria_enum"`);
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum"`);
  }
}
