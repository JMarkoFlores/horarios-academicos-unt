import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateCursoDto } from '../../cursos/dto/create-curso.dto';
import { CreateAmbienteDto } from '../../ambientes/dto/create-ambiente.dto';
import { CreateDocenteDto } from '../../docentes/dto/create-docente.dto';
import { CreateGrupoDto } from '../../grupos/dto/create-grupo.dto';

export type EntityType = 'cursos' | 'ambientes' | 'docentes' | 'grupos' | 'docente_curso' | 'curso_ambiente';

type ImportError = { row: number; field: string; error: string };
type MappedRow = { index: number; data: any };
type MappingResult = { valid: MappedRow[]; invalid: (MappedRow & { errors: ImportError[] })[] };

@Injectable()
export class CsvMapperService {
  mapCursos(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      const dto = plainToClass(CreateCursoDto, {
        codigo: record.codigo?.toUpperCase(),
        nombre: record.nombre,
        creditos: parseInt(record.creditos, 10),
        horas_teoria: parseInt(record.horas_teoria, 10),
        horas_laboratorio: parseInt(record.horas_laboratorio, 10) || 0,
        ciclo: parseInt(record.ciclo, 10),
        tiene_laboratorio: record.tiene_laboratorio?.toLowerCase() === 'true' || record.horas_laboratorio > 0,
        activo: true,
      });
      return dto;
    });
  }

  mapAmbientes(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      const dto = plainToClass(CreateAmbienteDto, {
        codigo: record.codigo?.toUpperCase(),
        nombre: record.nombre,
        tipo: record.tipo?.toUpperCase(),
        capacidad: parseInt(record.capacidad, 10),
        estado: record.estado?.toUpperCase() || 'ACTIVO',
        activo: true,
      });
      return dto;
    });
  }

  mapDocentes(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      const dto = plainToClass(CreateDocenteDto, {
        codigo: record.codigo,
        nombres: record.nombres,
        apellidos: record.apellidos,
        email: record.email?.toLowerCase(),
        telefono: record.telefono,
        tipo_docente: record.tipo_docente?.toUpperCase(),
        categoria: record.categoria?.toUpperCase(),
        modalidad: record.modalidad?.toUpperCase(),
        fecha_ingreso: record.fecha_ingreso,
        horas_asignadas: parseInt(record.horas_asignadas || '0', 10),
      });
      return dto;
    });
  }

  mapGrupos(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      const dto = plainToClass(CreateGrupoDto, {
        codigo: record.codigo?.toUpperCase(),
        cupo_maximo: parseInt(record.cupo_maximo, 10),
        curso_id: parseInt(record.curso_id, 10),
        periodo_id: parseInt(record.periodo_id, 10),
      });
      return dto;
    });
  }

  mapDocenteCurso(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      return {
        docente_id: parseInt(record.docente_id, 10),
        curso_id: parseInt(record.curso_id, 10),
      };
    });
  }

  mapCursoAmbiente(rows: Record<string, any>[]): MappingResult {
    return this.mapRows(rows, (record, index) => {
      return {
        curso_id: parseInt(record.curso_id, 10),
        ambiente_id: parseInt(record.ambiente_id, 10),
      };
    });
  }

  private mapRows(
    rows: Record<string, any>[],
    mapFn: (record: Record<string, any>, index: number) => any,
  ): MappingResult {
    const valid: MappedRow[] = [];
    const invalid: (MappedRow & { errors: ImportError[] })[] = [];

    rows.forEach((record, index) => {
      try {
        const mapped = mapFn(record, index);
        valid.push({ index, data: mapped });
      } catch (error) {
        invalid.push({
          index,
          data: record,
          errors: [{ row: index + 2, field: 'mapping', error: (error as any).message }],
        });
      }
    });

    return { valid, invalid };
  }
}
