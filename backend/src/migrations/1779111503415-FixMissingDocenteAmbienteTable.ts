import { MigrationInterface, QueryRunner } from "typeorm";

export class FixMissingDocenteAmbienteTable1779111503415 implements MigrationInterface {
    name = 'FixMissingDocenteAmbienteTable1779111503415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "docente_ambiente" ("docente_id" integer NOT NULL, "ambiente_id" integer NOT NULL, CONSTRAINT "PK_47df6c5709e72d828f1c8877874" PRIMARY KEY ("docente_id", "ambiente_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b12ef5d7d9694e4430d2bfc4f" ON "docente_ambiente" ("docente_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_90b6f5dd36c8f0a59c6e247bb0" ON "docente_ambiente" ("ambiente_id") `);
        await queryRunner.query(`ALTER TABLE "docente_ambiente" ADD CONSTRAINT "FK_2b12ef5d7d9694e4430d2bfc4fd" FOREIGN KEY ("docente_id") REFERENCES "docente"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "docente_ambiente" ADD CONSTRAINT "FK_90b6f5dd36c8f0a59c6e247bb0b" FOREIGN KEY ("ambiente_id") REFERENCES "ambiente"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "docente_ambiente" DROP CONSTRAINT "FK_90b6f5dd36c8f0a59c6e247bb0b"`);
        await queryRunner.query(`ALTER TABLE "docente_ambiente" DROP CONSTRAINT "FK_2b12ef5d7d9694e4430d2bfc4fd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_90b6f5dd36c8f0a59c6e247bb0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b12ef5d7d9694e4430d2bfc4f"`);
        await queryRunner.query(`DROP TABLE "docente_ambiente"`);
    }

}
