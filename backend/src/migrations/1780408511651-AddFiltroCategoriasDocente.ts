import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFiltroCategoriasDocente1780408511651 implements MigrationInterface {
    name = 'AddFiltroCategoriasDocente1780408511651'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE IF EXISTS "declaracion_carga_horaria" DROP CONSTRAINT IF EXISTS "FK_declaracion_usuario_firmante"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "declaracion_carga_horaria" DROP CONSTRAINT IF EXISTS "FK_declaracion_periodo"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "declaracion_carga_horaria" DROP CONSTRAINT IF EXISTS "FK_declaracion_facultad"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "declaracion_carga_horaria" DROP CONSTRAINT IF EXISTS "FK_declaracion_departamento"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "declaracion_carga_horaria" DROP CONSTRAINT IF EXISTS "FK_declaracion_docente"`);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_95fc1bdc329a18f81c821737567"`);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ventana_categoria"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bcebbd70d1423ffecd9a9cb24"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95fc1bdc329a18f81c82173756"`);
        await queryRunner.query(`ALTER TABLE "ventana_atencion" ADD "filtro_categorias_docente" jsonb`);
        await queryRunner.query(`ALTER TABLE "campaña_ventanas" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR'`);
        await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_declaracion_carga_enum') THEN ALTER TYPE \"public\".\"estado_declaracion_carga_enum\" RENAME TO \"estado_declaracion_carga_enum_old\"; END IF; END $$;`);
        await queryRunner.query(`DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'declaracion_carga_horaria') THEN
            -- Create new enum type
            CREATE TYPE "public"."declaracion_carga_horaria_estado_enum" AS ENUM('NO_INICIADO', 'BORRADOR', 'PENDIENTE_ENVIO', 'ENVIADO_DOCENTE', 'OBSERVADO_DPTO', 'SUBSANADO', 'VALIDADO_DPTO', 'OBSERVADO_FACULTAD', 'APROBADO_FACULTAD', 'CERRADO', 'ANULADO');
            -- Modify column
            ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" DROP DEFAULT;
            ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" TYPE "public"."declaracion_carga_horaria_estado_enum" USING "estado"::text::"public"."declaracion_carga_horaria_estado_enum";
            ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" SET DEFAULT 'NO_INICIADO';
            -- Drop old enum type (if exists)
            DROP TYPE IF EXISTS "public"."declaracion_carga_horaria_estado_enum";
            -- Add foreign key constraints
            ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_b0417bee555e733a60bfb300d4a" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
            ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_1946165a7f4088fbc3daebc6c10" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
            ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_de1e7a1dd692242f205e1cf5f0e" FOREIGN KEY ("facultad_id") REFERENCES "facultad"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
            ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_57d76bc4df8fa5c871f56ca29ea" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
            ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_1c61e9b43ca86f9243582e9ce3d" FOREIGN KEY ("usuario_firmante_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
          END IF;
        END $$;`);
        await queryRunner.query(`CREATE INDEX "idx_ventana_proposito" ON "ventana_atencion" ("categoria") `);
        await queryRunner.query(`CREATE INDEX "IDX_9bcebbd70d1423ffecd9a9cb24" ON "curso_ambiente" ("curso_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_95fc1bdc329a18f81c82173756" ON "curso_ambiente" ("ambiente_id") `);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_95fc1bdc329a18f81c821737567" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_95fc1bdc329a18f81c821737567"`);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" DROP CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_1c61e9b43ca86f9243582e9ce3d"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_57d76bc4df8fa5c871f56ca29ea"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_de1e7a1dd692242f205e1cf5f0e"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_1946165a7f4088fbc3daebc6c10"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" DROP CONSTRAINT "FK_b0417bee555e733a60bfb300d4a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95fc1bdc329a18f81c82173756"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bcebbd70d1423ffecd9a9cb24"`);
        await queryRunner.query(`DROP INDEX "public"."idx_ventana_proposito"`);
        await queryRunner.query(`CREATE TYPE "public"."estado_declaracion_carga_enum_old" AS ENUM('NO_INICIADO', 'BORRADOR', 'PENDIENTE_ENVIO', 'ENVIADO_DOCENTE', 'OBSERVADO_DPTO', 'SUBSANADO', 'VALIDADO_DPTO', 'OBSERVADO_FACULTAD', 'APROBADO_FACULTAD', 'CERRADO', 'ANULADO')`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" TYPE "public"."estado_declaracion_carga_enum_old" USING "estado"::"text"::"public"."estado_declaracion_carga_enum_old"`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ALTER COLUMN "estado" SET DEFAULT 'NO_INICIADO'`);
        await queryRunner.query(`DROP TYPE "public"."declaracion_carga_horaria_estado_enum"`);
        await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_declaracion_carga_enum_old') THEN ALTER TYPE \"public\".\"estado_declaracion_carga_enum_old\" RENAME TO \"estado_declaracion_carga_enum\"; END IF; END $$;`);
        await queryRunner.query(`ALTER TABLE "campaña_ventanas" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR'ña_ventanas_estado_enum"`);
        await queryRunner.query(`ALTER TABLE "ventana_atencion" DROP COLUMN "filtro_categorias_docente"`);
        await queryRunner.query(`CREATE INDEX "IDX_95fc1bdc329a18f81c82173756" ON "curso_ambiente" ("ambiente_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9bcebbd70d1423ffecd9a9cb24" ON "curso_ambiente" ("curso_id") `);
        await queryRunner.query(`CREATE INDEX "idx_ventana_categoria" ON "ventana_atencion" ("categoria") `);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_9bcebbd70d1423ffecd9a9cb241" FOREIGN KEY ("curso_id") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "curso_ambiente" ADD CONSTRAINT "FK_95fc1bdc329a18f81c821737567" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_docente" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_departamento" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_facultad" FOREIGN KEY ("facultad_id") REFERENCES "facultad"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_periodo" FOREIGN KEY ("periodo_academico_id") REFERENCES "periodo_academico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaracion_carga_horaria" ADD CONSTRAINT "FK_declaracion_usuario_firmante" FOREIGN KEY ("usuario_firmante_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
