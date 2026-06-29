import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { Curso } from "../entities/curso.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import {
  VentanaAtencion,
  EstadoVentanaAtencion,
} from "../entities/ventana-atencion.entity";
import { ColaDocente, EstadoCola } from "../entities/cola-docentes.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { CreatePeriodoDto } from "./dto/create-periodo.dto";
import { UpdatePeriodoDto } from "./dto/update-periodo.dto";
import { QueryPeriodoDto } from "./dto/query-periodo.dto";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

@Injectable()
export class PeriodosService {
  constructor(
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(Curso)
    private readonly cursoRepo: Repository<Curso>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private readonly ambienteRepo: Repository<Ambiente>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(VentanaAtencion)
    private readonly ventanaRepo: Repository<VentanaAtencion>,
    @InjectRepository(ColaDocente)
    private readonly colaRepo: Repository<ColaDocente>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
  ) {}

  async findAll(query: QueryPeriodoDto) {
    const { page = 1, limit = 20, activo } = query;

    const qb = this.periodoRepo.createQueryBuilder("periodo");

    if (activo !== undefined) {
      qb.andWhere("periodo.activo = :activo", { activo });
    }

    if (query.codigo) {
      qb.andWhere("periodo.codigo = :codigo", { codigo: query.codigo });
    }

    const [items, total] = await qb
      .orderBy("periodo.fecha_inicio", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findAllSinPaginar() {
    return this.periodoRepo.find({
      order: { fecha_inicio: "DESC" },
    });
  }

  async findOne(id: number) {
    const item = await this.periodoRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException("Periodo académico no encontrado");
    return item;
  }

  async create(dto: CreatePeriodoDto) {
    if (new Date(dto.fecha_inicio) >= new Date(dto.fecha_fin)) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    const existe = await this.periodoRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe) {
      throw new ConflictException(
        `El periodo académico con código ${dto.codigo} ya existe`,
      );
    }

    if (dto.activo) {
      await this.periodoRepo.update({ activo: true }, { activo: false });
    }

    const periodo = this.periodoRepo.create(dto);
    return this.periodoRepo.save(periodo);
  }

  async update(id: number, dto: UpdatePeriodoDto) {
    const periodo = await this.findOne(id);

    const inicio = dto.fecha_inicio ?? periodo.fecha_inicio;
    const fin = dto.fecha_fin ?? periodo.fecha_fin;
    if (new Date(inicio) >= new Date(fin)) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    if (dto.codigo && dto.codigo !== periodo.codigo) {
      const existe = await this.periodoRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe) {
        throw new ConflictException(
          `El periodo académico con código ${dto.codigo} ya existe`,
        );
      }
    }

    if (dto.activo && !periodo.activo) {
      await this.periodoRepo.update({ activo: true }, { activo: false });
    }

    Object.assign(periodo, dto);
    return this.periodoRepo.save(periodo);
  }

  async finalizar(id: number) {
    const periodo = await this.findOne(id);

    if (!periodo.activo) {
      throw new BadRequestException("El periodo ya se encuentra inactivo o finalizado");
    }

    // 1. Marcar el periodo como inactivo y actualizar su estado a FINALIZADO
    periodo.activo = false;
    periodo.estado = EstadoPeriodo.FINALIZADO;
    await this.periodoRepo.save(periodo);

    // 2. Cerrar las declaraciones confirmadas
    await this.declaracionRepo.update(
      { periodo_academico_id: id, estado: EstadoDeclaracionCarga.CONFIRMADO },
      { estado: EstadoDeclaracionCarga.CERRADO }
    );

    return { success: true, message: "Periodo finalizado, declaraciones cerradas." };
  }

  async remove(id: number) {
    const periodo = await this.findOne(id);
    return this.periodoRepo.remove(periodo);
  }

  async generarAutomatico(id: number) {
    const periodo = await this.findOne(id);

    if (periodo.modo_asignacion === ModoAsignacion.VENTANAS) {
      throw new BadRequestException(
        "El período está en modo VENTANAS, no permite generación automática",
      );
    }

    // Si ya hay horarios generados para este período, eliminarlos antes de regenerar
    await this.horarioRepo.delete({ periodo: periodo.codigo });

    // Obtener cursos activos del período
    const cursos = await this.cursoRepo.find({ where: { activo: true } });
    const docentes = await this.docenteRepo.find({ where: { activo: true } });
    const ambientes = await this.ambienteRepo.find({
      where: { estado: EstadoAmbiente.ACTIVO },
    });
    const grupos = await this.grupoRepo.find({ relations: ["curso"] });

    if (cursos.length === 0) {
      throw new BadRequestException(
        "No hay cursos activos para generar horarios",
      );
    }

    if (docentes.length === 0) {
      throw new BadRequestException("No hay docentes activos para asignar");
    }

    if (ambientes.length === 0) {
      throw new BadRequestException("No hay ambientes activos para asignar");
    }

    // Generar horarios (lógica simplificada por ahora)
    const horariosCreados: HorarioAsignado[] = [];
    let docenteIndex = 0;
    let ambienteIndex = 0;

    for (const curso of cursos) {
      // Asignar docente rotativo
      const docente = docentes[docenteIndex % docentes.length];
      docenteIndex++;

      // Asignar ambiente rotativo
      const ambiente = ambientes[ambienteIndex % ambientes.length];
      ambienteIndex++;

      // Buscar grupo del curso
      const grupo = grupos.find((g) => g.curso?.id === curso.id);

      // Crear horario (placeholder - lógica real de asignación requeriría más reglas)
      const horario = this.horarioRepo.create();
      horario.docente = docente;
      horario.curso = curso;
      horario.ambiente = ambiente;
      horario.grupo = grupo;
      horario.periodo = periodo.codigo;
      horario.dia = 1; // Lunes (placeholder)
      horario.hora_inicio = "08:00:00";
      horario.hora_fin = "10:00:00";
      horario.tipo_clase = TipoClase.TEORIA;
      horario.estado = EstadoHorario.BORRADOR;
      horario.origen = OrigenHorario.GENERACION_AUTOMATICA;

      horariosCreados.push(horario);
    }

    await this.horarioRepo.save(horariosCreados);

    return {
      message: `Se generaron ${horariosCreados.length} horarios automáticamente`,
      horarios_creados: horariosCreados.length,
    };
  }

  async publicarHorarios(id: number) {
    const periodo = await this.findOne(id);

    const result = await this.horarioRepo.update(
      { periodo: periodo.codigo, estado: EstadoHorario.BORRADOR },
      { estado: EstadoHorario.PUBLICADO },
    );

    return {
      message: `Se publicaron ${result.affected || 0} horarios`,
      horarios_publicados: result.affected || 0,
    };
  }

  async getDocentesPendientes(id: number) {
    const periodo = await this.findOne(id);

    // Obtener todos los docentes activos
    const todosDocentes = await this.docenteRepo.find({
      where: { activo: true },
    });

    // Obtener horarios del período
    const horarios = await this.horarioRepo.find({
      where: { periodo: periodo.codigo },
      relations: ["docente"],
    });

    // Docentes que ya tienen al menos un horario
    const docentesConHorario = new Set(horarios.map((h) => h.docente_id));

    // Docentes sin horario (pendientes)
    const pendientes = todosDocentes.filter(
      (d) => !docentesConHorario.has(d.id),
    );

    return {
      total_docentes: todosDocentes.length,
      docentes_con_horario: docentesConHorario.size,
      docentes_pendientes: pendientes.length,
      pendientes: pendientes.map((d) => ({
        id: d.id,
        nombre: d.nombres,
        apellido: d.apellidos,
        email: d.email,
        categoria: d.categoria,
      })),
    };
  }

  async actualizarModoAsignacion(id: number, modo: ModoAsignacion) {
    const periodo = await this.findOne(id);
    periodo.modo_asignacion = modo;
    return await this.periodoRepo.save(periodo);
  }

  async crearVentanasPendientes(id: number) {
    const periodo = await this.findOne(id);

    if (periodo.modo_asignacion !== ModoAsignacion.MIXTA) {
      throw new BadRequestException(
        "Solo se pueden crear ventanas pendientes en modo MIXTA",
      );
    }

    // Obtener docentes pendientes
    const pendientes = await this.getDocentesPendientes(id);

    if (pendientes.docentes_pendientes === 0) {
      throw new BadRequestException(
        "No hay docentes pendientes. Todos los docentes ya tienen horarios asignados.",
      );
    }

    // Verificar si ya existe una ventana activa para este período
    const ventanaActiva = await this.ventanaRepo.findOne({
      where: {
        periodo: periodo.codigo,
        estado: EstadoVentanaAtencion.EN_CURSO,
      },
    });

    if (ventanaActiva) {
      throw new BadRequestException(
        "Ya existe una ventana en curso. Finalícela antes de crear una nueva.",
      );
    }

    // Crear ventana para docentes pendientes
    const hoy = new Date();
    const ventana = this.ventanaRepo.create({
      periodo: periodo.codigo,
      fecha: hoy,
      proposito: "CONTINGENCIA", // Ventana especial para docentes pendientes
      hora_inicio: "08:00",
      hora_fin: "18:00",
      intervalo_minutos: 30,
      estado: EstadoVentanaAtencion.PROGRAMADA,
    });

    const ventanaGuardada = await this.ventanaRepo.save(ventana);

    // Agregar docentes pendientes a la cola
    const docentesIds = pendientes.pendientes.map((d) => d.id);
    const docentes = await this.docenteRepo.findByIds(docentesIds);

    const colas = docentes.map((docente, index) =>
      this.colaRepo.create({
        ventana_id: ventanaGuardada.id,
        docente_id: docente.id,
        orden: index + 1,
        estado: EstadoCola.ESPERANDO,
        ventana: ventanaGuardada,
        docente,
      }),
    );

    await this.colaRepo.save(colas);

    return {
      message: `Se creó ventana para ${docentes.length} docentes pendientes`,
      ventana_id: ventanaGuardada.id,
      docentes_en_cola: docentes.length,
    };
  }

  async limpiarHorariosInconsistentes(id: number) {
    const periodo = await this.findOne(id);

    // Obtener todos los horarios del período
    const horarios = await this.horarioRepo.find({
      where: { periodo: periodo.codigo },
    });

    const inconsistentes: number[] = [];

    for (const horario of horarios) {
      // Verificar si el docente tiene el curso habilitado (filtrando por periodoId)
      const habilitacion = await this.docenteCursoRepo.findOne({
        where: {
          docenteId: horario.docente_id,
          cursoId: horario.curso_id,
          tipo_clase: horario.tipo_clase,
          periodoId: id,
        },
      });

      if (!habilitacion) {
        inconsistentes.push(horario.id);
        await this.horarioRepo.delete(horario.id);
      }
    }

    return {
      message: `Se eliminaron ${inconsistentes.length} horarios inconsistentes`,
      horarios_eliminados: inconsistentes,
    };
  }
}
