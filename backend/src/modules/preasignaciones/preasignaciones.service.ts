import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Preasignacion } from "../../entities/preasignacion.entity";
import { CreatePreasignacionDto } from "./dto/create-preasignacion.dto";
import { QueryPreasignacionDto } from "./dto/query-preasignacion.dto";
import { UpdatePreasignacionDto } from "./dto/update-preasignacion.dto";
import { ValidadorHorarioService } from "../../horarios/validador-horario.service";
import { TipoClase } from "../../common/enums/tipo-clase.enum";

@Injectable()
export class PreasignacionesService {
  constructor(
    @InjectRepository(Preasignacion)
    private readonly preasignacionRepo: Repository<Preasignacion>,
    private readonly validadorHorarioService: ValidadorHorarioService,
  ) {}

  async findAll(query: QueryPreasignacionDto): Promise<Preasignacion[]> {
    const qb = this.preasignacionRepo
      .createQueryBuilder("preasignacion")
      .leftJoinAndSelect("preasignacion.docente", "docente")
      .leftJoinAndSelect("preasignacion.curso", "curso")
      .leftJoinAndSelect("preasignacion.grupo", "grupo")
      .leftJoinAndSelect("preasignacion.ambiente", "ambiente");

    if (query.periodo) {
      qb.andWhere("preasignacion.periodo = :periodo", {
        periodo: query.periodo,
      });
    }
    if (query.docente_id) {
      qb.andWhere("preasignacion.docente_id = :docente_id", {
        docente_id: query.docente_id,
      });
    }

    return qb.orderBy("preasignacion.creado_en", "DESC").getMany();
  }

  async create(dto: CreatePreasignacionDto): Promise<Preasignacion> {
    await this.validarSlotSiAplica(dto);
    const entity = this.preasignacionRepo.create({
      ...dto,
      grupo_id: dto.grupo_id ?? null,
      tipo_clase: dto.tipo_clase ?? null,
      dia: dto.dia ?? null,
      hora_inicio: dto.hora_inicio ?? null,
      hora_fin: dto.hora_fin ?? null,
      ambiente_id: dto.ambiente_id ?? null,
    });
    return this.preasignacionRepo.save(entity);
  }

  async update(
    id: string,
    dto: UpdatePreasignacionDto,
  ): Promise<Preasignacion> {
    const current = await this.preasignacionRepo.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Preasignación ${id} no encontrada`);
    }

    this.validarCamposRequeridos(dto);

    const merged = {
      ...current,
      ...dto,
      grupo_id: this.resolveNullableField(dto, "grupo_id", current.grupo_id),
      tipo_clase: this.resolveNullableField(
        dto,
        "tipo_clase",
        current.tipo_clase,
      ),
      dia: this.resolveNullableField(dto, "dia", current.dia),
      hora_inicio: this.resolveNullableField(
        dto,
        "hora_inicio",
        current.hora_inicio,
      ),
      hora_fin: this.resolveNullableField(dto, "hora_fin", current.hora_fin),
      ambiente_id: this.resolveNullableField(
        dto,
        "ambiente_id",
        current.ambiente_id,
      ),
    };

    await this.validarSlotSiAplica(merged);
    Object.assign(current, merged);
    return this.preasignacionRepo.save(current);
  }

  async remove(id: string): Promise<void> {
    const current = await this.preasignacionRepo.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Preasignación ${id} no encontrada`);
    }
    await this.preasignacionRepo.remove(current);
  }

  private async validarSlotSiAplica(payload: {
    docente_id: number;
    curso_id: number;
    grupo_id?: number | null;
    tipo_clase?: TipoClase | null;
    dia?: number | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    ambiente_id?: number | null;
    periodo: string;
    motivo?: string;
  }): Promise<void> {
    const tieneBloqueBase =
      typeof payload.dia === "number" &&
      typeof payload.hora_inicio === "string" &&
      typeof payload.ambiente_id === "number";

    if (!tieneBloqueBase) {
      return;
    }

    if (typeof payload.grupo_id !== "number") {
      throw new BadRequestException(
        "grupo_id es obligatorio cuando se define dia, hora y ambiente.",
      );
    }

    const horaFin =
      typeof payload.hora_fin === "string"
        ? payload.hora_fin
        : this.calcularHoraFinPorDefecto(payload.hora_inicio);

    const validacion = await this.validadorHorarioService.validarSlot({
      docente_id: payload.docente_id,
      grupo_id: payload.grupo_id,
      ambiente_id: payload.ambiente_id,
      laboratorio_ambiente_id:
        payload.tipo_clase === TipoClase.LABORATORIO
          ? payload.ambiente_id
          : undefined,
      periodo: payload.periodo,
      dia: payload.dia,
      hora_inicio: payload.hora_inicio,
      hora_fin: horaFin,
      tipo_clase: payload.tipo_clase ?? TipoClase.TEORIA,
      fecha: this.construirFecha(payload.dia),
    });

    if (!validacion.valido) {
      throw new BadRequestException({
        message: "La preasignación no es válida para el slot indicado.",
        errores: validacion.errores,
      });
    }
  }

  private validarCamposRequeridos(dto: UpdatePreasignacionDto): void {
    const camposRequeridos: Array<keyof UpdatePreasignacionDto> = [
      "docente_id",
      "curso_id",
      "periodo",
      "motivo",
    ];

    for (const campo of camposRequeridos) {
      if (
        Object.prototype.hasOwnProperty.call(dto, campo) &&
        dto[campo] == null
      ) {
        throw new BadRequestException(`${campo} no puede ser null.`);
      }
    }
  }

  private resolveNullableField<T extends keyof UpdatePreasignacionDto>(
    dto: UpdatePreasignacionDto,
    field: T,
    currentValue: UpdatePreasignacionDto[T] | null,
  ): UpdatePreasignacionDto[T] | null {
    return Object.prototype.hasOwnProperty.call(dto, field)
      ? (dto[field] ?? null)
      : currentValue;
  }

  private construirFecha(dia: number): string {
    const base = new Date();
    const day = base.getDay() === 0 ? 7 : base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + (dia - 1));
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, "0");
    const dd = String(monday.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private calcularHoraFinPorDefecto(horaInicio: string): string {
    const [hora, minuto] = horaInicio.split(":").map(Number);
    const totalMinutos = (hora || 0) * 60 + (minuto || 0) + 60;
    const horaFin = Math.floor(totalMinutos / 60)
      .toString()
      .padStart(2, "0");
    const minutoFin = (totalMinutos % 60).toString().padStart(2, "0");
    return `${horaFin}:${minutoFin}`;
  }
}
