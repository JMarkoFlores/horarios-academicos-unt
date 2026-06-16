import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTelegramToPreferencias1779153752241 implements MigrationInterface {
  name = "AddTelegramToPreferencias1779153752241";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" ADD "canal_telegram" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" ADD "telegram_chat_id" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" DROP COLUMN "telegram_chat_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "preferencias_notificacion" DROP COLUMN "canal_telegram"`,
    );
  }
}
