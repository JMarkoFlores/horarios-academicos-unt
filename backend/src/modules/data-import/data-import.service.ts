import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { validate } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { Curso } from '../../entities/curso.entity';
import { Ambiente } from '../../entities/ambiente.entity';
import { Docente } from '../../entities/docente.entity';
import { Grupo } from '../../entities/grupo.entity';
import { DocenteCurso } from '../../entities/docente-curso.entity';
import { CsvParserService } from './csv-parser.service';
import { CsvMapperService, EntityType } from './csv-mapper.service';
import { CursosService } from '../../cursos/cursos.service';
import { AmbientesService } from '../../ambientes/ambientes.service';
import { DocentesService } from '../../docentes/docentes.service';
import { GruposService } from '../../grupos/grupos.service';

export type ImportSessionStatus = 'pending' | 'loading' | 'completed' | 'failed';

export interface ImportError {
  row: number;
  field: string;
  error: string;
}

export interface ImportPreview {
  valid: any[];
  invalid: (any & { errors: ImportError[] })[];
  duplicates: { codigo: string; rows: number[] }[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

export interface ImportSession {
  sessionId: string;
  entityType: EntityType;
  uploadedAt: Date;
  preview?: ImportPreview;
  status: ImportSessionStatus;
  result?: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  message: string;
}

@Injectable()
export class DataImportService {
  private sessions = new Map<string, ImportSession>();

  constructor(
    @InjectRepository(Curso) private cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente) private ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Docente) private docenteRepo: Repository<Docente>,
    @InjectRepository(Grupo) private grupoRepo: Repository<Grupo>,
    @InjectRepository(DocenteCurso) private docenteCursoRepo: Repository<DocenteCurso>,
    private csvParserService: CsvParserService,
    private csvMapperService: CsvMapperService,
    private cursosService: CursosService,
    private ambientesService: AmbientesService,
    private docentesService: DocentesService,
    private gruposService: GruposService,
    private dataSource: DataSource,
  ) {}

  async uploadAndPreview(file: any, entityType: EntityType): Promise<{ sessionId: string; preview: ImportPreview }> {
    if (!file || file.size === 0) {
      throw new BadRequestException('No se proporcionó un archivo');
    }

    const sessionId = uuidv4();
    const rows = await this.csvParserService.parseCSV(file.buffer);

    // Map rows
    const mapped = this.mapRowsByType(rows, entityType);
    const mappedValid = mapped.valid;
    const mappedInvalid = mapped.invalid;

    // Validate each row using DTOs
    const validationResult = await this.validateMappedRows(mappedValid, entityType);

    // Check for duplicates
    const duplicates = this.detectDuplicates(validationResult.valid, entityType);

    // Check referential integrity
    const refIntegrity = await this.validateReferentialIntegrity(validationResult.valid, entityType);

    // Combine all errors
    const allInvalid = [
      ...mappedInvalid,
      ...validationResult.invalid,
      ...refIntegrity.invalid,
    ];

    const preview: ImportPreview = {
      valid: validationResult.valid.map((v) => v.data),
      invalid: allInvalid.map((inv) => ({
        ...inv.data,
        errors: inv.errors || [{ row: inv.index + 2, field: 'unknown', error: 'Fila inválida' }],
      })),
      duplicates,
      stats: {
        total: rows.length,
        valid: validationResult.valid.length,
        invalid: allInvalid.length,
        duplicates: duplicates.reduce((sum, d) => sum + d.rows.length - 1, 0),
      },
    };

    const session: ImportSession = {
      sessionId,
      entityType,
      uploadedAt: new Date(),
      preview,
      status: 'pending',
    };

    this.sessions.set(sessionId, session);

    return { sessionId, preview };
  }

  async confirmImport(sessionId: string, periodoId?: number): Promise<ImportResult> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Sesión de importación no encontrada');
    }

    if (!session.preview || session.preview.valid.length === 0) {
      throw new BadRequestException('No hay datos válidos para importar');
    }

    session.status = 'loading';

    try {
      const result = await this.loadToDatabase(session.preview.valid, session.entityType, periodoId || null);
      session.status = 'completed';
      session.result = result;

      return result;
    } catch (error) {
      session.status = 'failed';
      throw new InternalServerErrorException(`Error al cargar datos: ${(error as any).message}`);
    }
  }

  getSessionPreview(sessionId: string): ImportPreview {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session.preview;
  }

  getSessionStatus(sessionId: string): ImportSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    return session;
  }

  private mapRowsByType(rows: Record<string, any>[], entityType: EntityType) {
    switch (entityType) {
      case 'cursos':
        return this.csvMapperService.mapCursos(rows);
      case 'ambientes':
        return this.csvMapperService.mapAmbientes(rows);
      case 'docentes':
        return this.csvMapperService.mapDocentes(rows);
      case 'grupos':
        return this.csvMapperService.mapGrupos(rows);
      case 'docente_curso':
        return this.csvMapperService.mapDocenteCurso(rows);
      case 'curso_ambiente':
        return this.csvMapperService.mapCursoAmbiente(rows);
      default:
        throw new BadRequestException(`Tipo de entidad no soportado: ${entityType}`);
    }
  }

  private async validateMappedRows(rows: any[], entityType: EntityType) {
    const valid: any[] = [];
    const invalid: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors = await validate(row.data);

      if (errors.length === 0) {
        valid.push(row);
      } else {
        const rowErrors: ImportError[] = errors.map((err) => ({
          row: row.index + 2,
          field: err.property,
          error: Object.values(err.constraints || {}).join('; '),
        }));
        invalid.push({ ...row, errors: rowErrors });
      }
    }

    return { valid, invalid };
  }

  private detectDuplicates(rows: any[], entityType: EntityType): { codigo: string; rows: number[] }[] {
    const duplicates: Map<string, number[]> = new Map();
    const codigoField = this.getCodigoField(entityType);

    if (!codigoField) return [];

    rows.forEach((row, index) => {
      const codigo = row.data[codigoField];
      if (codigo) {
        const existing = duplicates.get(codigo) || [];
        duplicates.set(codigo, [...existing, row.index + 2]);
      }
    });

    return Array.from(duplicates.entries())
      .filter(([_, rowIndices]) => rowIndices.length > 1)
      .map(([codigo, rowIndices]) => ({ codigo, rows: rowIndices }));
  }

  private async validateReferentialIntegrity(rows: any[], entityType: EntityType) {
    const valid: any[] = [];
    const invalid: any[] = [];

    for (const row of rows) {
      const refErrors = await this.checkReferentialConstraints(row.data, entityType);

      if (refErrors.length === 0) {
        valid.push(row);
      } else {
        invalid.push({ ...row, errors: refErrors });
      }
    }

    return { valid, invalid };
  }

  private async checkReferentialConstraints(data: any, entityType: EntityType): Promise<ImportError[]> {
    const errors: ImportError[] = [];

    switch (entityType) {
      case 'grupos':
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({ where: { id: data.curso_id } });
          if (!curso) {
            errors.push({ row: 0, field: 'curso_id', error: `Curso ID ${data.curso_id} no existe` });
          }
        }
        break;

      case 'docente_curso':
        if (data.docente_id) {
          const docente = await this.docenteRepo.findOne({ where: { id: data.docente_id } });
          if (!docente) {
            errors.push({ row: 0, field: 'docente_id', error: `Docente ID ${data.docente_id} no existe` });
          }
        }
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({ where: { id: data.curso_id } });
          if (!curso) {
            errors.push({ row: 0, field: 'curso_id', error: `Curso ID ${data.curso_id} no existe` });
          }
        }
        break;

      case 'curso_ambiente':
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({ where: { id: data.curso_id } });
          if (!curso) {
            errors.push({ row: 0, field: 'curso_id', error: `Curso ID ${data.curso_id} no existe` });
          }
        }
        if (data.ambiente_id) {
          const ambiente = await this.ambienteRepo.findOne({ where: { id: data.ambiente_id } });
          if (!ambiente) {
            errors.push({ row: 0, field: 'ambiente_id', error: `Ambiente ID ${data.ambiente_id} no existe` });
          }
        }
        break;
    }

    return errors;
  }

  private async loadToDatabase(rows: any[], entityType: EntityType, periodoId: number | null): Promise<ImportResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let successCount = 0;
      let failureCount = 0;
      const errors: ImportError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          switch (entityType) {
            case 'cursos':
              await queryRunner.manager.save(Curso, row.data);
              successCount++;
              break;

            case 'ambientes':
              await queryRunner.manager.save(Ambiente, row.data);
              successCount++;
              break;

            case 'docentes':
              await queryRunner.manager.save(Docente, row.data);
              successCount++;
              break;

            case 'grupos':
              await queryRunner.manager.save(Grupo, row.data);
              successCount++;
              break;

            case 'docente_curso':
              await queryRunner.manager.save(DocenteCurso, row.data);
              successCount++;
              break;

            case 'curso_ambiente':
              await queryRunner.manager.query(
                'INSERT INTO curso_ambiente (curso_id, ambiente_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [row.data.curso_id, row.data.ambiente_id],
              );
              successCount++;
              break;
          }
        } catch (error) {
          failureCount++;
          errors.push({ row: row.index + 2, field: 'database', error: (error as any).message });
        }
      }

      if (failureCount > 0 && failureCount === rows.length) {
        await queryRunner.rollbackTransaction();
        throw new Error('Todos los registros fallaron');
      }

      await queryRunner.commitTransaction();

      return {
        success: successCount,
        failed: failureCount,
        errors,
        message: `${successCount} registros importados exitosamente${failureCount > 0 ? `, ${failureCount} fallaron` : ''}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getCodigoField(entityType: EntityType): string | null {
    const fields: Record<EntityType, string | null> = {
      cursos: 'codigo',
      ambientes: 'codigo',
      docentes: 'email',
      grupos: 'codigo',
      docente_curso: null,
      curso_ambiente: null,
    };
    return fields[entityType];
  }
}
