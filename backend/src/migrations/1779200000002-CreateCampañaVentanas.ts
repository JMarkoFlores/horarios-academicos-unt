import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from 'typeorm';

export class CreateCampañaVentanas1779200000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para estado_campaña
    await queryRunner.query(`
      CREATE TYPE "public"."estado_campaña_enum" AS ENUM (
        'BORRADOR', 'GENERADO', 'PUBLICADO', 'EN_CURSO', 'CERRADO', 'CANCELADO'
      );
    `);

    // Crear tabla campaña_ventanas
    await queryRunner.createTable(
      new Table({
        name: 'campaña_ventanas',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nombre',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'descripcion',
            type: 'text',
          },
          {
            name: 'periodo_id',
            type: 'int',
          },
          {
            name: 'estado',
            type: 'enum',
            enumName: 'estado_campaña_enum',
            default: "'BORRADOR'",
          },
          {
            name: 'fecha_inicio',
            type: 'date',
          },
          {
            name: 'fecha_fin',
            type: 'date',
          },
          {
            name: 'dias_habilitados',
            type: 'text',
            isArray: true,
          },
          {
            name: 'bloques_horarios',
            type: 'json',
          },
          {
            name: 'duracion_turno_minutos',
            type: 'int',
            default: 15,
          },
          {
            name: 'buffer_minutos',
            type: 'int',
            default: 5,
          },
          {
            name: 'cupos_maximos_ventana',
            type: 'int',
            default: 20,
          },
          {
            name: 'reglas_prioridad',
            type: 'json',
          },
          {
            name: 'excluir_feriados',
            type: 'boolean',
            default: true,
          },
          {
            name: 'excluir_eventos',
            type: 'boolean',
            default: true,
          },
          {
            name: 'distribucion_equitativa',
            type: 'boolean',
            default: true,
          },
          {
            name: 'total_ventanas_generadas',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_docentes_asignados',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_docentes_atendidos',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_ausencias',
            type: 'int',
            default: 0,
          },
          {
            name: 'tiempo_promedio_atencion',
            type: 'float',
            default: 0,
          },
          {
            name: 'creado_por_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'actualizado_por_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'fecha_creacion',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'fecha_actualizacion',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'fecha_publicacion',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'fecha_cierre',
            type: 'date',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Crear foreign key a periodo_academico
    await queryRunner.createForeignKey(
      'campaña_ventanas',
      new TableForeignKey({
        columnNames: ['periodo_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'periodo_academico',
        onDelete: 'CASCADE',
      }),
    );

    // Crear foreign key a usuario (creado_por)
    await queryRunner.createForeignKey(
      'campaña_ventanas',
      new TableForeignKey({
        columnNames: ['creado_por_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
      }),
    );

    // Crear foreign key a usuario (actualizado_por)
    await queryRunner.createForeignKey(
      'campaña_ventanas',
      new TableForeignKey({
        columnNames: ['actualizado_por_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
      }),
    );

    // Agregar columna campaña_id a ventana_atencion
    await queryRunner.addColumn(
      'ventana_atencion',
      new TableColumn({
        name: 'campaña_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Crear foreign key a campaña_ventanas
    await queryRunner.createForeignKey(
      'ventana_atencion',
      new TableForeignKey({
        columnNames: ['campaña_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'campaña_ventanas',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign key de ventana_atencion
    await queryRunner.dropForeignKey('ventana_atencion', 'FK_ventana_atencion_campaña_id');

    // Eliminar columna campaña_id de ventana_atencion
    await queryRunner.dropColumn('ventana_atencion', 'campaña_id');

    // Eliminar foreign keys de campaña_ventanas
    await queryRunner.dropForeignKey('campaña_ventanas', 'FK_campaña_ventanas_actualizado_por_id');
    await queryRunner.dropForeignKey('campaña_ventanas', 'FK_campaña_ventanas_creado_por_id');
    await queryRunner.dropForeignKey('campaña_ventanas', 'FK_campaña_ventanas_periodo_id');

    // Eliminar tabla campaña_ventanas
    await queryRunner.dropTable('campaña_ventanas');

    // Eliminar enum estado_campaña_enum
    await queryRunner.query(`DROP TYPE "public"."estado_campaña_enum"`);
  }
}
