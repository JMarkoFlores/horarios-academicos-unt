import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHorasPracticaToCurso1779772688396 implements MigrationInterface {
    name = 'AddHorasPracticaToCurso1779772688396'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "curso" ADD "horas_practica" integer DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "curso" DROP COLUMN "horas_practica"`);
    }
}
