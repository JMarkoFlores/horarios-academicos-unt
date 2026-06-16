import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddValidacionFieldsToVentanas1779800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to horario_asignado
    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "ventana_atencion_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "sesion_operador_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "validaciones_ejecutadas",
        type: "jsonb",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "razon_rechazo",
        type: "text",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "contexto_validacion",
        type: "jsonb",
        isNullable: true,
      }),
    );

    // Add columns to cola_docentes
    await queryRunner.addColumn(
      "cola_docentes",
      new TableColumn({
        name: "razon_ausencia",
        type: "enum",
        enum: ["INASISTENCIA", "REPROGRAMACION", "CANCELACION", "OTRO"],
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "cola_docentes",
      new TableColumn({
        name: "eventos_sesion",
        type: "jsonb",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "cola_docentes",
      new TableColumn({
        name: "validaciones_ejecutadas",
        type: "integer",
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("horario_asignado", "contexto_validacion");
    await queryRunner.dropColumn("horario_asignado", "razon_rechazo");
    await queryRunner.dropColumn("horario_asignado", "validaciones_ejecutadas");
    await queryRunner.dropColumn("horario_asignado", "sesion_operador_id");
    await queryRunner.dropColumn("horario_asignado", "ventana_atencion_id");

    await queryRunner.dropColumn("cola_docentes", "validaciones_ejecutadas");
    await queryRunner.dropColumn("cola_docentes", "eventos_sesion");
    await queryRunner.dropColumn("cola_docentes", "razon_ausencia");
  }
}
