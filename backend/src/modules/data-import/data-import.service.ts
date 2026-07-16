import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { validate } from "class-validator";
import { v4 as uuidv4 } from "uuid";
import { Curso } from "../../entities/curso.entity";
import { Ambiente } from "../../entities/ambiente.entity";
import { Docente } from "../../entities/docente.entity";
import { Grupo } from "../../entities/grupo.entity";
import { DocenteCurso } from "../../entities/docente-curso.entity";
import { CsvParserService } from "./csv-parser.service";
import { CsvMapperService, EntityType } from "./csv-mapper.service";
import { CursosService } from "../../cursos/cursos.service";
import { AmbientesService } from "../../ambientes/ambientes.service";
import { DocentesService } from "../../docentes/docentes.service";
import { GruposService } from "../../grupos/grupos.service";
import { CategoriaDocente } from "../../common/enums/categoria-docente.enum";
import { TipoContrato } from "../../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../../common/enums/tipo-docente.enum";

export type ImportSessionStatus =
  | "pending"
  | "loading"
  | "completed"
  | "failed";

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
  validRows: any[];
  status: ImportSessionStatus;
  result?: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  message: string;
}

@Injectable()
export class DataImportService {
  private sessions = new Map<string, ImportSession>();
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    @InjectRepository(Curso) private cursoRepo: Repository<Curso>,
    @InjectRepository(Ambiente) private ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Docente) private docenteRepo: Repository<Docente>,
    @InjectRepository(Grupo) private grupoRepo: Repository<Grupo>,
    @InjectRepository(DocenteCurso)
    private docenteCursoRepo: Repository<DocenteCurso>,
    private csvParserService: CsvParserService,
    private csvMapperService: CsvMapperService,
    private cursosService: CursosService,
    private ambientesService: AmbientesService,
    private docentesService: DocentesService,
    private gruposService: GruposService,
    private dataSource: DataSource,
  ) {}

  async uploadAndPreview(
    file: any,
    entityType: EntityType,
  ): Promise<{ sessionId: string; preview: ImportPreview }> {
    this.logger.log(
      `Upload and preview: entityType=${entityType}, file=${file?.originalname}, size=${file?.size}`,
    );

    if (!file || file.size === 0) {
      this.logger.warn("No file or empty file provided");
      throw new BadRequestException("No se proporcionó un archivo");
    }

    const sessionId = uuidv4();
    this.logger.log(`Parsing CSV...`);
    const rows = await this.csvParserService.parseCSV(file.buffer);
    this.logger.log(`Parsed ${rows.length} rows from CSV`);

    // Map rows
    this.logger.log(`Mapping rows for entityType=${entityType}`);
    const mapped = this.mapRowsByType(rows, entityType);
    const mappedValid = mapped.valid;
    const mappedInvalid = mapped.invalid;
    this.logger.log(
      `Mapped: valid=${mappedValid.length}, invalid=${mappedInvalid.length}`,
    );

    // Validate each row using DTOs
    this.logger.log("Validating mapped rows...");
    const validationResult = await this.validateMappedRows(
      mappedValid,
      entityType,
    );
    this.logger.log(
      `Validation: valid=${validationResult.valid.length}, invalid=${validationResult.invalid.length}`,
    );

    // Check for duplicates
    this.logger.log("Checking duplicates...");
    const duplicates = this.detectDuplicates(
      validationResult.valid,
      entityType,
    );

    // Check referential integrity
    this.logger.log("Checking referential integrity...");
    const refIntegrity = await this.validateReferentialIntegrity(
      validationResult.valid,
      entityType,
    );

    // Combine all errors
    const allInvalid = [
      ...mappedInvalid,
      ...validationResult.invalid,
      ...refIntegrity.invalid,
    ];
    this.logger.log(`Total invalid: ${allInvalid.length}`);

    const preview: ImportPreview = {
      valid: validationResult.valid.map((v) => v.data),
      invalid: allInvalid.map((inv) => ({
        ...inv.data,
        errors: inv.errors || [
          { row: inv.index + 2, field: "unknown", error: "Fila inválida" },
        ],
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
      status: "pending",
      validRows: validationResult.valid, // Store full rows for import
    };

    this.sessions.set(sessionId, session);

    return { sessionId, preview };
  }

  async confirmImport(
    sessionId: string,
    periodoId?: number,
  ): Promise<ImportResult> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException("Sesión de importación no encontrada");
    }

    if (!session.validRows || session.validRows.length === 0) {
      throw new BadRequestException("No hay datos válidos para importar");
    }

    this.logger.log(
      `confirmImport: session.validRows has ${session.validRows.length} rows`,
    );
    if (session.validRows.length > 0) {
      this.logger.log(
        `First validRow keys: ${JSON.stringify(Object.keys(session.validRows[0]))}`,
      );
      this.logger.log(
        `First validRow index: ${session.validRows[0].index}, has data: ${!!session.validRows[0].data}`,
      );
    }

    session.status = "loading";

    try {
      const result = await this.loadToDatabase(
        session.validRows,
        session.entityType,
        periodoId || null,
      );
      session.status = "completed";
      session.result = result;

      return result;
    } catch (error) {
      session.status = "failed";
      throw new InternalServerErrorException(
        `Error al cargar datos: ${(error as any).message}`,
      );
    }
  }

  getSessionPreview(sessionId: string): ImportPreview {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException("Sesión no encontrada");
    }

    return session.preview;
  }

  getSessionStatus(sessionId: string): ImportSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new NotFoundException("Sesión no encontrada");
    }

    return session;
  }

  private mapRowsByType(rows: Record<string, any>[], entityType: EntityType) {
    switch (entityType) {
      case "cursos":
        return this.csvMapperService.mapCursos(rows);
      case "ambientes":
        return this.csvMapperService.mapAmbientes(rows);
      case "docentes":
        return this.csvMapperService.mapDocentes(rows);
      case "grupos":
        return this.csvMapperService.mapGrupos(rows);
      case "docente_curso":
        return this.csvMapperService.mapDocenteCurso(rows);
      case "curso_ambiente":
        return this.csvMapperService.mapCursoAmbiente(rows);
      default:
        throw new BadRequestException(
          `Tipo de entidad no soportado: ${entityType}`,
        );
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
          error: Object.values(err.constraints || {}).join("; "),
        }));
        invalid.push({ ...row, errors: rowErrors });
      }
    }

    return { valid, invalid };
  }

  private detectDuplicates(
    rows: any[],
    entityType: EntityType,
  ): { codigo: string; rows: number[] }[] {
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

  private async validateReferentialIntegrity(
    rows: any[],
    entityType: EntityType,
  ) {
    const valid: any[] = [];
    const invalid: any[] = [];

    for (const row of rows) {
      const refErrors = await this.checkReferentialConstraints(
        row.data,
        entityType,
      );

      if (refErrors.length === 0) {
        valid.push(row);
      } else {
        invalid.push({ ...row, errors: refErrors });
      }
    }

    return { valid, invalid };
  }

  private async checkReferentialConstraints(
    data: any,
    entityType: EntityType,
  ): Promise<ImportError[]> {
    const errors: ImportError[] = [];

    switch (entityType) {
      case "grupos":
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({
            where: { id: data.curso_id },
          });
          if (!curso) {
            errors.push({
              row: 0,
              field: "curso_id",
              error: `Curso ID ${data.curso_id} no existe`,
            });
          }
        }
        break;

      case "docente_curso":
        if (data.docente_id) {
          const docente = await this.docenteRepo.findOne({
            where: { id: data.docente_id },
          });
          if (!docente) {
            errors.push({
              row: 0,
              field: "docente_id",
              error: `Docente ID ${data.docente_id} no existe`,
            });
          }
        }
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({
            where: { id: data.curso_id },
          });
          if (!curso) {
            errors.push({
              row: 0,
              field: "curso_id",
              error: `Curso ID ${data.curso_id} no existe`,
            });
          }
        }
        break;

      case "curso_ambiente":
        if (data.curso_id) {
          const curso = await this.cursoRepo.findOne({
            where: { id: data.curso_id },
          });
          if (!curso) {
            errors.push({
              row: 0,
              field: "curso_id",
              error: `Curso ID ${data.curso_id} no existe`,
            });
          }
        }
        if (data.ambiente_id) {
          const ambiente = await this.ambienteRepo.findOne({
            where: { id: data.ambiente_id },
          });
          if (!ambiente) {
            errors.push({
              row: 0,
              field: "ambiente_id",
              error: `Ambiente ID ${data.ambiente_id} no existe`,
            });
          }
        }
        break;
    }

    return errors;
  }

  private async loadToDatabase(
    rows: any[],
    entityType: EntityType,
    periodoId: number | null,
  ): Promise<ImportResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let transactionStarted = false;

    this.logger.log(
      `loadToDatabase called with ${rows.length} rows for ${entityType}`,
    );
    if (rows.length > 0) {
      this.logger.log(
        `First row structure: ${JSON.stringify(Object.keys(rows[0]))}`,
      );
      this.logger.log(
        `First row index: ${rows[0].index}, has data: ${!!rows[0].data}`,
      );
      if (rows[0].data) {
        this.logger.log(
          `First row data keys: ${JSON.stringify(Object.keys(rows[0].data))}`,
        );
      }
    }

    try {
      try {
        await queryRunner.startTransaction();
        transactionStarted = true;
        this.logger.log(`Transaction started for ${entityType} import`);
      } catch (txError) {
        this.logger.error(
          `Failed to start transaction: ${(txError as any).message}`,
        );
        throw new InternalServerErrorException(
          "No se pudo iniciar la transacción de base de datos",
        );
      }

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      const errors: ImportError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          switch (entityType) {
            case "cursos": {
              const result = await queryRunner.manager.query(
                `INSERT INTO curso (codigo, nombre, creditos, horas_teoria, horas_practica, horas_laboratorio, ciclo, tiene_laboratorio, prerequisitos, activo, departamento_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (codigo) DO NOTHING
                 RETURNING codigo`,
                [
                  row.data.codigo,
                  row.data.nombre,
                  row.data.creditos,
                  row.data.horas_teoria,
                  row.data.horas_practica,
                  row.data.horas_laboratorio,
                  row.data.ciclo,
                  row.data.tiene_laboratorio,
                  row.data.prerequisitos,
                  row.data.activo,
                  row.data.departamento_id,
                ],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "codigo",
                  error: `Curso con código ${row.data.codigo} ya existe`,
                });
              }
              break;
            }

            case "ambientes": {
              const result = await queryRunner.manager.query(
                `INSERT INTO ambiente (codigo, nombre, tipo, capacidad, estado, activo, piso, pabellon, sede, equipamiento, edificio, coord_x, coord_y)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (codigo) DO NOTHING
                 RETURNING codigo`,
                [
                  row.data.codigo,
                  row.data.nombre,
                  row.data.tipo,
                  row.data.capacidad,
                  row.data.estado,
                  row.data.activo,
                  row.data.piso,
                  row.data.pabellon,
                  row.data.sede,
                  row.data.equipamiento,
                  row.data.edificio,
                  row.data.coordX,
                  row.data.coordY,
                ],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "codigo",
                  error: `Ambiente con código ${row.data.codigo} ya existe`,
                });
              }
              break;
            }

            case "docentes": {
              const tipoDocente = row.data.tipo_docente as TipoDocente;
              const categoria =
                tipoDocente === TipoDocente.ORDINARIO
                  ? row.data.categoria
                  : CategoriaDocente.SIN_CATEGORIA;
              const tipoContrato =
                tipoDocente === TipoDocente.ORDINARIO
                  ? TipoContrato.NOMBRADO
                  : TipoContrato.CONTRATADO;
              const result = await queryRunner.manager.query(
                `INSERT INTO docente (codigo, nombres, apellidos, email, telefono, tipo_docente, categoria, tipo_contrato, modalidad, fecha_ingreso, activo, dni, ibm, facultad_id, departamento_id, usuario_id, foto_url, firma_url, firebase_token)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                 ON CONFLICT (email) DO NOTHING
                 RETURNING email`,
                [
                  row.data.codigo,
                  row.data.nombres,
                  row.data.apellidos,
                  row.data.email,
                  row.data.telefono,
                  tipoDocente,
                  categoria,
                  tipoContrato,
                  row.data.modalidad,
                  row.data.fecha_ingreso,
                  row.data.activo,
                  row.data.dni,
                  row.data.ibm,
                  row.data.facultad_id,
                  row.data.departamento_id,
                  row.data.usuario_id,
                  row.data.foto_url,
                  row.data.firma_url,
                  row.data.firebase_token,
                ],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "email",
                  error: `Docente con email ${row.data.email} ya existe`,
                });
              }
              break;
            }

            case "grupos": {
              const result = await queryRunner.manager.query(
                `INSERT INTO grupo (codigo, nombre, tipo, ciclo, cupo_maximo, periodo_id, curso_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (codigo) DO NOTHING
                 RETURNING codigo`,
                [
                  row.data.codigo,
                  row.data.nombre,
                  row.data.tipo,
                  row.data.ciclo,
                  row.data.cupo_maximo,
                  row.data.periodo_id,
                  row.data.curso_id,
                ],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "codigo",
                  error: `Grupo con código ${row.data.codigo} ya existe`,
                });
              }
              break;
            }

            case "docente_curso": {
              const result = await queryRunner.manager.query(
                `INSERT INTO docente_curso (docente_id, curso_id, tipo_clase, periodo_id, grupos)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (docente_id, curso_id, tipo_clase, periodo_id) DO NOTHING
                 RETURNING docente_id`,
                [
                  row.data.docente_id,
                  row.data.curso_id,
                  row.data.tipo_clase,
                  row.data.periodo_id,
                  row.data.grupos || 1,
                ],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "docente_id,curso_id,tipo_clase,periodo_id",
                  error: `Asignación docente-curso ya existe`,
                });
              }
              break;
            }

            case "curso_ambiente": {
              const result = await queryRunner.manager.query(
                `INSERT INTO curso_ambiente (curso_id, ambiente_id)
                 VALUES ($1, $2)
                 ON CONFLICT (curso_id, ambiente_id) DO NOTHING
                 RETURNING curso_id`,
                [row.data.curso_id, row.data.ambiente_id],
              );
              if (result.length > 0) {
                successCount++;
              } else {
                skippedCount++;
                errors.push({
                  row: row.index + 2,
                  field: "curso_id,ambiente_id",
                  error: `Relación curso-ambiente ya existe`,
                });
              }
              break;
            }
          }
        } catch (error) {
          failureCount++;
          this.logger.error(
            `DB error row ${row.index + 2}: ${(error as any).message}`,
            (error as any).stack,
          );
          errors.push({
            row: row.index + 2,
            field: "database",
            error: (error as any).message,
          });
        }
      }

      if (failureCount > 0 && failureCount === rows.length) {
        if (transactionStarted) {
          try {
            await queryRunner.rollbackTransaction();
            transactionStarted = false;
            this.logger.log(`Transaction rolled back for ${entityType} import`);
          } catch (rbError) {
            this.logger.warn(`Rollback failed: ${(rbError as any).message}`);
          }
        }
        throw new Error("Todos los registros fallaron");
      }

      if (transactionStarted) {
        try {
          await queryRunner.commitTransaction();
          this.logger.log(`Transaction committed for ${entityType} import`);
        } catch (commitError) {
          this.logger.error(`Commit failed: ${(commitError as any).message}`);
          throw new InternalServerErrorException(
            "Error al confirmar la transacción",
          );
        }
      }

      return {
        success: successCount,
        failed: failureCount + skippedCount,
        skipped: skippedCount,
        errors,
        message: `${successCount} registros importados exitosamente${skippedCount > 0 ? `, ${skippedCount} omitidos (ya existían)` : ""}${failureCount > 0 ? `, ${failureCount} fallaron` : ""}`,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await queryRunner.rollbackTransaction();
          this.logger.log(`Transaction rolled back for ${entityType} import`);
        } catch (rbError) {
          this.logger.warn(`Rollback failed: ${(rbError as any).message}`);
        }
      }
      throw error;
    } finally {
      try {
        await queryRunner.release();
      } catch (releaseError) {
        this.logger.warn(`Release failed: ${(releaseError as any).message}`);
      }
    }
  }

  private getCodigoField(entityType: EntityType): string | null {
    const fields: Record<EntityType, string | null> = {
      cursos: "codigo",
      ambientes: "codigo",
      docentes: "email",
      grupos: "codigo",
      docente_curso: null,
      curso_ambiente: null,
    };
    return fields[entityType];
  }
}
