import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableColumn,
} from "typeorm";

export class AddSuspensionAndCatedraCompartida1800000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create suspension_docente table
    await queryRunner.createTable(
      new Table({
        name: "suspension_docente",
        columns: [
          {
            name: "id",
            type: "serial",
            isPrimary: true,
          },
          {
            name: "docente_id",
            type: "integer",
            isNullable: false,
          },
          {
            name: "fecha_inicio",
            type: "date",
            isNullable: false,
          },
          {
            name: "fecha_fin",
            type: "date",
            isNullable: false,
          },
          {
            name: "motivo",
            type: "text",
            isNullable: false,
          },
          {
            name: "activa",
            type: "boolean",
            default: true,
          },
          {
            name: "resuelta_por",
            type: "varchar",
            length: "150",
            isNullable: true,
          },
          {
            name: "fecha_resolucion",
            type: "date",
            isNullable: true,
          },
          {
            name: "observaciones",
            type: "text",
            isNullable: true,
          },
          {
            name: "creado_en",
            type: "timestamptz",
            default: "now()",
          },
          {
            name: "actualizado_en",
            type: "timestamptz",
            default: "now()",
          },
        ],
      }),
      true,
    );

    // Create foreign key for suspension_docente
    await queryRunner.createForeignKey(
      "suspension_docente",
      new TableForeignKey({
        columnNames: ["docente_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "docente",
        onDelete: "CASCADE",
      }),
    );

    // Create indexes for suspension_docente
    await queryRunner.createIndex(
      "suspension_docente",
      new TableIndex({
        name: "idx_suspension_docente",
        columnNames: ["docente_id"],
      }),
    );

    await queryRunner.createIndex(
      "suspension_docente",
      new TableIndex({
        name: "idx_suspension_fechas",
        columnNames: ["fecha_inicio", "fecha_fin"],
      }),
    );

    await queryRunner.createIndex(
      "suspension_docente",
      new TableIndex({
        name: "idx_suspension_activa",
        columnNames: ["activa"],
      }),
    );

    // Create catedra_compartida table
    await queryRunner.createTable(
      new Table({
        name: "catedra_compartida",
        columns: [
          {
            name: "id",
            type: "serial",
            isPrimary: true,
          },
          {
            name: "curso_plan_id",
            type: "integer",
            isNullable: false,
          },
          {
            name: "tipo_clase",
            type: "enum",
            enum: ["TEORIA", "PRACTICA", "LABORATORIO"],
            isNullable: false,
          },
          {
            name: "motivo_excepcion",
            type: "text",
            isNullable: false,
          },
          {
            name: "autorizado_por",
            type: "varchar",
            length: "150",
            isNullable: false,
          },
          {
            name: "fecha_autorizacion",
            type: "date",
            isNullable: false,
          },
          {
            name: "activa",
            type: "boolean",
            default: true,
          },
          {
            name: "observaciones",
            type: "text",
            isNullable: true,
          },
          {
            name: "referencia_rcu",
            type: "varchar",
            length: "150",
            isNullable: true,
          },
          {
            name: "creado_en",
            type: "timestamptz",
            default: "now()",
          },
          {
            name: "actualizado_en",
            type: "timestamptz",
            default: "now()",
          },
        ],
      }),
      true,
    );

    // Create foreign key for catedra_compartida
    await queryRunner.createForeignKey(
      "catedra_compartida",
      new TableForeignKey({
        columnNames: ["curso_plan_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "curso_plan_estudios",
        onDelete: "CASCADE",
      }),
    );

    // Create indexes for catedra_compartida
    await queryRunner.createIndex(
      "catedra_compartida",
      new TableIndex({
        name: "idx_catedra_curso_plan",
        columnNames: ["curso_plan_id"],
      }),
    );

    await queryRunner.createIndex(
      "catedra_compartida",
      new TableIndex({
        name: "idx_catedra_tipo",
        columnNames: ["tipo_clase"],
      }),
    );

    await queryRunner.createIndex(
      "catedra_compartida",
      new TableIndex({
        name: "idx_catedra_activa",
        columnNames: ["activa"],
      }),
    );

    // Add columns to docente table
    await queryRunner.addColumn(
      "docente",
      new TableColumn({
        name: "horas_no_lectivas",
        type: "smallint",
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      "docente",
      new TableColumn({
        name: "horas_lectivas_max",
        type: "smallint",
        default: 22,
      }),
    );

    await queryRunner.addColumn(
      "docente",
      new TableColumn({
        name: "horas_lectivas_min",
        type: "smallint",
        default: 16,
      }),
    );

    await queryRunner.addColumn(
      "docente",
      new TableColumn({
        name: "horas_max_totales",
        type: "smallint",
        default: 40,
      }),
    );

    await queryRunner.addColumn(
      "docente",
      new TableColumn({
        name: "suspension_vigente",
        type: "boolean",
        default: false,
      }),
    );

    // Add columns to horario_asignado table
    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "validado_director",
        type: "boolean",
        default: false,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "validado_por",
        type: "varchar",
        length: "150",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "fecha_validacion",
        type: "timestamptz",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "horario_asignado",
      new TableColumn({
        name: "observaciones_validacion",
        type: "text",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns from horario_asignado
    await queryRunner.dropColumn(
      "horario_asignado",
      "observaciones_validacion",
    );
    await queryRunner.dropColumn("horario_asignado", "fecha_validacion");
    await queryRunner.dropColumn("horario_asignado", "validado_por");
    await queryRunner.dropColumn("horario_asignado", "validado_director");

    // Drop columns from docente
    await queryRunner.dropColumn("docente", "suspension_vigente");
    await queryRunner.dropColumn("docente", "horas_max_totales");
    await queryRunner.dropColumn("docente", "horas_lectivas_min");
    await queryRunner.dropColumn("docente", "horas_lectivas_max");
    await queryRunner.dropColumn("docente", "horas_no_lectivas");

    // Drop catedra_compartida table
    await queryRunner.dropTable("catedra_compartida");

    // Drop suspension_docente table
    await queryRunner.dropTable("suspension_docente");
  }
}
