import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditoriaHorario } from "../../entities/auditoria-horario.entity";
import { AuditoriaCarga, EntidadAuditoriaCarga, AccionAuditoriaCarga } from "../../entities/auditoria-carga.entity";

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaHorario)
    private readonly auditoriaRepo: Repository<AuditoriaHorario>,
    @InjectRepository(AuditoriaCarga)
    private readonly auditoriaCargaRepo: Repository<AuditoriaCarga>,
  ) {}

  async registrar(datos: {
    horario_id: number;
    usuario_id: number;
    accion: string;
    datos_anteriores: Record<string, unknown> | null;
    datos_nuevos: Record<string, unknown> | null;
    ip: string;
    motivo?: string | null;
  }): Promise<AuditoriaHorario> {
    const auditoria = this.auditoriaRepo.create(datos);
    return this.auditoriaRepo.save(auditoria);
  }

  async getHistorial(filtros: {
    periodo?: string;
    usuario_id?: number;
    accion?: string;
    desde?: string;
    hasta?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
    const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.auditoriaRepo.createQueryBuilder("a");
    qb.leftJoinAndSelect("a.horario", "h");

    if (filtros.periodo) {
      qb.andWhere("h.periodo = :periodo", { periodo: filtros.periodo });
    }
    if (filtros.usuario_id) {
      qb.andWhere("a.usuario_id = :usuario_id", {
        usuario_id: filtros.usuario_id,
      });
    }
    if (filtros.accion) {
      qb.andWhere("a.accion = :accion", { accion: filtros.accion });
    }
    if (filtros.desde) {
      qb.andWhere("a.creado_en >= :desde", { desde: filtros.desde });
    }
    if (filtros.hasta) {
      qb.andWhere("a.creado_en <= :hasta", { hasta: filtros.hasta });
    }

    qb.orderBy("a.creado_en", "DESC");
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async registrarCarga(datos: {
    entidad: EntidadAuditoriaCarga;
    entidad_id: number;
    usuario_id: number;
    accion: AccionAuditoriaCarga;
    estado_anterior?: string | null;
    estado_nuevo?: string | null;
    datos_anteriores?: Record<string, unknown> | null;
    datos_nuevos?: Record<string, unknown> | null;
    ip: string;
    motivo?: string | null;
  }): Promise<AuditoriaCarga> {
    const auditoria = this.auditoriaCargaRepo.create(datos);
    return this.auditoriaCargaRepo.save(auditoria);
  }

  async getHistorialCarga(filtros: {
    periodo?: string;
    usuario_id?: number;
    entidad?: EntidadAuditoriaCarga;
    accion?: AccionAuditoriaCarga;
    desde?: string;
    hasta?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
    const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.auditoriaCargaRepo.createQueryBuilder("a");
    qb.leftJoinAndSelect("a.usuario", "u");

    if (filtros.periodo) {
      qb.andWhere("a.datos_nuevos::text LIKE :periodo", {
        periodo: `%${filtros.periodo}%`,
      });
    }
    if (filtros.usuario_id) {
      qb.andWhere("a.usuario_id = :usuario_id", {
        usuario_id: filtros.usuario_id,
      });
    }
    if (filtros.entidad) {
      qb.andWhere("a.entidad = :entidad", { entidad: filtros.entidad });
    }
    if (filtros.accion) {
      qb.andWhere("a.accion = :accion", { accion: filtros.accion });
    }
    if (filtros.desde) {
      qb.andWhere("a.creado_en >= :desde", { desde: filtros.desde });
    }
    if (filtros.hasta) {
      qb.andWhere("a.creado_en <= :hasta", { hasta: filtros.hasta });
    }

    qb.orderBy("a.creado_en", "DESC");
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
