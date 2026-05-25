import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPorcentajeReserva1779200000004 implements MigrationInterface {
  name = 'AddPorcentajeReserva1779200000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaña_ventanas"
      ADD COLUMN "porcentaje_reserva" integer DEFAULT 15
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaña_ventanas"
      DROP COLUMN "porcentaje_reserva"
    `);
  }
}
