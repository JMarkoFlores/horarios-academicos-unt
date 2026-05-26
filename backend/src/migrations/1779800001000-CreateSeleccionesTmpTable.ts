import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSeleccionesTmpTable1779800001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'selecciones_temporales',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'sesion_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'ventana_atencion_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'docente_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'curso_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'grupo_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'ambiente_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'dia',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'hora_inicio',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'hora_fin',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'tipo_clase',
            type: 'enum',
            enum: ['TEORIA', 'LABORATORIO'],
            isNullable: false,
          },
          {
            name: 'periodo',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'estado',
            type: 'enum',
            enum: ['PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'EXPIRADA'],
            default: "'PENDIENTE'",
            isNullable: false,
          },
          {
            name: 'contexto_validacion',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'creada_en',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'actualizada_en',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'expira_en',
            type: 'timestamp',
            default: "CURRENT_TIMESTAMP + INTERVAL '30 minutes'",
            isNullable: false,
          },
          {
            name: 'razon_rechazo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sincronizada_desde_redis',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['ventana_atencion_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'ventana_atencion',
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['docente_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'docente',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['curso_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'curso',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['grupo_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'grupo',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['ambiente_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'ambiente',
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'selecciones_temporales',
      new TableIndex({
        columnNames: ['sesion_id', 'estado'],
        name: 'idx_selecciones_sesion_estado',
      }),
    );

    await queryRunner.createIndex(
      'selecciones_temporales',
      new TableIndex({
        columnNames: ['expira_en'],
        name: 'idx_selecciones_expira_en',
      }),
    );

    await queryRunner.createIndex(
      'selecciones_temporales',
      new TableIndex({
        columnNames: ['sesion_id', 'ambiente_id', 'dia', 'hora_inicio', 'periodo'],
        isUnique: true,
        name: 'idx_selecciones_unique_celda',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('selecciones_temporales');
  }
}
