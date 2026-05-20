import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModoAsignacionAndOrigenHorario1779153752242 implements MigrationInterface {
    name = 'AddModoAsignacionAndOrigenHorario1779153752242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "periodo_academico" ADD "modo_asignacion" character varying(20) NOT NULL DEFAULT 'ventanas'`);
        await queryRunner.query(`ALTER TABLE "horario_asignado" ADD "origen" character varying(30) NOT NULL DEFAULT 'ajuste_manual'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "horario_asignado" DROP COLUMN "origen"`);
        await queryRunner.query(`ALTER TABLE "periodo_academico" DROP COLUMN "modo_asignacion"`);
    }
}
