import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CargaAdicional } from "../entities/carga-adicional.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { CreateCargaAdicionalDto } from "./dto/create-carga-adicional.dto";
import { UpdateCargaAdicionalDto } from "./dto/update-carga-adicional.dto";

@Injectable()
export class CargaAdicionalService {
  constructor(
    @InjectRepository(CargaAdicional)
    private readonly cargaAdicionalRepo: Repository<CargaAdicional>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
  ) {}

  async findAll(declaracionId?: number, docenteId?: number) {
    const qb = this.cargaAdicionalRepo
      .createQueryBuilder("ca")
      .leftJoinAndSelect("ca.declaracion", "declaracion")
      .leftJoinAndSelect("ca.docente", "docente");

    if (declaracionId) {
      qb.andWhere("ca.declaracion_id = :declaracionId", { declaracionId });
    }
    if (docenteId) {
      qb.andWhere("ca.docente_id = :docenteId", { docenteId });
    }

    qb.orderBy("ca.created_at", "DESC");
    return qb.getMany();
  }

  async findOne(id: number) {
    const carga = await this.cargaAdicionalRepo.findOne({
      where: { id },
      relations: ["declaracion", "docente"],
    });
    if (!carga) {
      throw new NotFoundException(`Carga adicional #${id} no encontrada`);
    }
    return carga;
  }

  async create(dto: CreateCargaAdicionalDto) {
    const declaracion = await this.declaracionRepo.findOne({
      where: { id: dto.declaracion_id },
      relations: ["docente", "periodo_academico"],
    });
    if (!declaracion) {
      throw new NotFoundException(
        `Declaración #${dto.declaracion_id} no encontrada`,
      );
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: dto.docente_id },
    });
    if (!docente) {
      throw new NotFoundException(`Docente #${dto.docente_id} no encontrado`);
    }

    if (dto.fecha_inicio > dto.fecha_fin) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    // Validate modalidad limit
    await this.validarLimiteModalidad(declaracion, dto.total_horas, 0);

    const carga = this.cargaAdicionalRepo.create(dto);
    return this.cargaAdicionalRepo.save(carga);
  }

  async update(id: number, dto: UpdateCargaAdicionalDto) {
    const carga = await this.findOne(id);

    if (dto.fecha_inicio && dto.fecha_fin && dto.fecha_inicio > dto.fecha_fin) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    // Validate modalidad limit if total_horas is being updated
    if (dto.total_horas !== undefined) {
      const declaracion = await this.declaracionRepo.findOne({
        where: { id: carga.declaracion_id },
        relations: ["docente", "periodo_academico"],
      });
      if (declaracion) {
        const horasDiferencia = dto.total_horas - carga.total_horas;
        await this.validarLimiteModalidad(declaracion, horasDiferencia, 0);
      }
    }

    Object.assign(carga, dto);
    return this.cargaAdicionalRepo.save(carga);
  }

  async remove(id: number) {
    const carga = await this.findOne(id);
    await this.cargaAdicionalRepo.remove(carga);
  }

  async getTotalHorasByDeclaracion(declaracionId: number): Promise<number> {
    const result = await this.cargaAdicionalRepo
      .createQueryBuilder("ca")
      .select("SUM(ca.total_horas)", "total")
      .where("ca.declaracion_id = :declaracionId", { declaracionId })
      .getRawOne();

    return Number(result?.total || 0);
  }

  private async validarLimiteModalidad(
    declaracion: DeclaracionCargaHoraria,
    horasAdicionales: number,
    excludeCargaId?: number,
  ): Promise<void> {
    const totalLectivas = declaracion.total_horas_lectivas || 0;
    const totalNoLectivas = declaracion.total_horas_no_lectivas || 0;
    const totalCargaAdicional = await this.getTotalHorasByDeclaracion(
      declaracion.id,
    );
    const horasModalidad = await this.obtenerHorasModalidad(
      declaracion.docente?.modalidad ?? "",
      declaracion.periodo_academico_id,
    );

    const totalActual = totalLectivas + totalNoLectivas + totalCargaAdicional;
    const totalNuevo = totalActual + horasAdicionales;

    if (totalNuevo > horasModalidad) {
      throw new BadRequestException(
        `El total de horas (${totalNuevo}h) excede las ${horasModalidad}h permitidas para la modalidad del docente. Actual: ${totalActual}h lectivas + no lectivas + adicional.`,
      );
    }
  }

  private async obtenerHorasModalidad(
    modalidad: string,
    periodoId: number,
  ): Promise<number> {
    const periodo = await this.declaracionRepo
      .createQueryBuilder("d")
      .select("d.periodo_academico")
      .leftJoin("d.periodo_academico", "p")
      .where("d.id = :id", { id: periodoId })
      .getOne();

    if (!periodo) {
      return 40; // Default fallback
    }

    const parametros = await this.parametrosCargaRepo.findOne({
      where: {
        periodo_academico: periodo.periodo_academico?.codigo || "",
        modalidad: modalidad,
      },
    });

    if (!parametros) {
      return 40; // Default fallback
    }

    return parametros.horas_max_semanal || 40;
  }
}
