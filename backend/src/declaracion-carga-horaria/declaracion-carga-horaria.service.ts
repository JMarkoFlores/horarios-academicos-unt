import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Usuario } from "../entities/usuario.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { DeclaracionObservacion } from "../entities/declaracion-observacion.entity";
import { DeclaracionJurada } from "../entities/declaracion-jurada.entity";
import { CargaAdicional } from "../entities/carga-adicional.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { TipoObservacion } from "../common/enums/tipo-observacion.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { CreateDeclaracionCargaHorariaDto } from "./dto/create-declaracion-carga-horaria.dto";
import { UpdateDeclaracionCargaHorariaDto } from "./dto/update-declaracion-carga-horaria.dto";
import { AccionDeclaracionCargaHorariaDto } from "./dto/accion-declaracion-carga-horaria.dto";
import { AuditoriaService } from "../modules/auditoria/auditoria.service";
import { EntidadAuditoriaCarga, AccionAuditoriaCarga } from "../entities/auditoria-carga.entity";
import { CargaAdicionalService } from "./carga-adicional.service";
import { ContextoAcademicoService } from "../common/services/contexto-academico.service";
import { UsuarioAutenticado } from "../common/interfaces/contexto-academico.interface";

interface CargaLectivaDetalle {
  horarioAsignadoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  tipoCurso: string;
  escuela: string;
  grupoId: number;
  seccion: string;
  ciclo: number;
  nroAlumnos: number;
  tipoClase: TipoClase;
  horasTeoria: number;
  horasPractica: number;
  horasLaboratorio: number;
  horasBloque: number;
  ambiente: string;
  dia: number;
  horaInicio: string;
  horaFin: string;
}

interface AgrupadoHorasCurso {
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  horas: number;
}

interface AgrupadoHorasSeccion {
  grupoId: number;
  seccion: string;
  horas: number;
}

interface AgrupadoHorasTipoClase {
  tipoClase: TipoClase;
  horas: number;
}

interface ResumenCargaLectiva {
  totalHoras: number;
  totalCursos: number;
  totalSecciones: number;
  totalBloques: number;
  horasPorCurso: AgrupadoHorasCurso[];
  horasPorSeccion: AgrupadoHorasSeccion[];
  horasPorTipoClase: AgrupadoHorasTipoClase[];
}

interface CargaLectivaGenerada {
  docenteId: number;
  periodoId: number;
  periodoCodigo: string;
  registros: CargaLectivaDetalle[];
  resumen: ResumenCargaLectiva;
  generadoEn: string;
}

interface CargaLectivaDeclaracionResultado {
  declaracionId: number;
  cargaLectiva: CargaLectivaGenerada;
  snapshotGuardado: CargaLectivaGenerada | null;
}

interface DeclaracionVista {
  declaracion: DeclaracionCargaHoraria | null;
  estado: EstadoDeclaracionCarga;
  docente: Docente;
  departamento: Departamento | null;
  facultad: Facultad | null;
  periodo: PeriodoAcademico;
  cargaLectiva: CargaLectivaGenerada;
  cargaAdicional: CargaAdicional[];
  snapshotGuardado: CargaLectivaGenerada | null;
}

interface DocumentacionResumen {
  id: number;
  docente_id: number;
  docente_nombre: string;
  docente_ibm: number | null;
  estado: EstadoDeclaracionCarga;
  periodo: string;
  fecha_envio: Date | null;
  departamento_nombre?: string | null;
  facultad_nombre?: string | null;
}

@Injectable()
export class DeclaracionCargaHorariaService {
  private readonly logger = new Logger(DeclaracionCargaHorariaService.name);

  constructor(
    @InjectRepository(DeclaracionCargaHoraria)
    private readonly declaracionRepo: Repository<DeclaracionCargaHoraria>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
    @InjectRepository(Facultad)
    private readonly facultadRepo: Repository<Facultad>,
    @InjectRepository(PeriodoAcademico)
    private readonly periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(HorarioAsignado)
    private readonly horarioRepo: Repository<HorarioAsignado>,
    @InjectRepository(DocenteCurso)
    private readonly docenteCursoRepo: Repository<DocenteCurso>,
    @InjectRepository(AsignacionLectiva)
    private readonly asignacionLectivaRepo: Repository<AsignacionLectiva>,
    @InjectRepository(ParametrosCarga)
    private readonly parametrosCargaRepo: Repository<ParametrosCarga>,
    @InjectRepository(DeclaracionObservacion)
    private readonly observacionRepo: Repository<DeclaracionObservacion>,
    @InjectRepository(DeclaracionJurada)
    private readonly declaracionJuradaRepo: Repository<DeclaracionJurada>,
    @InjectRepository(CargaAdicional)
    private readonly cargaAdicionalRepo: Repository<CargaAdicional>,
    private readonly auditoriaService: AuditoriaService,
    private readonly cargaAdicionalService: CargaAdicionalService,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async obtenerMia(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const docente = await this.resolverDocente(usuario);
    const periodo = await this.obtenerPeriodoActivo();
    const cargaLectiva = await this.cargarCargaLectiva(docente.id, periodo.id);
    const declaracion = await this.declaracionRepo.findOne({
      where: {
        docente_id: docente.id,
        periodo_academico_id: periodo.id,
      },
      relations: [
        "docente",
        "departamento",
        "facultad",
        "periodo_academico",
        "usuario_firmante",
      ],
    });

    if (!declaracion) {
      return {
        declaracion: null,
        estado: EstadoDeclaracionCarga.BORRADOR,
        docente,
        departamento: docente.departamento ?? null,
        facultad:
          docente.facultad ?? docente.departamento?.escuela?.facultad ?? null,
        periodo,
        cargaLectiva,
        cargaAdicional: [],
        snapshotGuardado: null,
      };
    }

    const cargaAdicional = await this.cargaAdicionalService.findAll(declaracion.id);

    return {
      declaracion,
      estado: declaracion.estado,
      docente,
      departamento: declaracion.departamento,
      facultad: declaracion.facultad,
      periodo,
      cargaLectiva,
      cargaAdicional,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_lectiva_json,
      ),
    };
  }

  async obtenerPorId(
    id: number,
    usuario?: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const declaracion = await this.declaracionRepo.findOne({
      where: { id },
      relations: [
        "docente",
        "docente.departamento",
        "docente.departamento.escuela",
        "docente.departamento.escuela.facultad",
        "docente.facultad",
        "departamento",
        "facultad",
        "periodo_academico",
        "usuario_firmante",
      ],
    });

    if (!declaracion) {
      throw new NotFoundException(`DeclaraciÃ³n ${id} no encontrada`);
    }

    if (usuario) {
      await this.verificarAccesoDeclaracion(usuario, declaracion);
    }

    const cargaLectiva = await this.cargarCargaLectiva(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    const cargaAdicional = await this.cargaAdicionalService.findAll(declaracion.id);

    return {
      declaracion,
      estado: declaracion.estado,
      docente: declaracion.docente,
      departamento: declaracion.departamento,
      facultad: declaracion.facultad,
      periodo: declaracion.periodo_academico,
      cargaLectiva,
      cargaAdicional,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_lectiva_json,
      ),
    };
  }

  async obtenerDocumentaciones(
    usuario: UsuarioAutenticado,
    periodo?: string,
  ): Promise<DocumentacionResumen[]> {
    this.verificarRol(usuario.rol, [
      RolUsuario.ADMINISTRADOR_SISTEMA,
      RolUsuario.DIRECTOR_ESCUELA,
      RolUsuario.DIRECTOR_DEPARTAMENTO,
      RolUsuario.DECANO,
      RolUsuario.COORDINADOR_ACADEMICO,
    ]);

    const periodoActivo = await this.resolverPeriodoPorCodigo(periodo);
    const estadosVisibles = [
      EstadoDeclaracionCarga.CONFIRMADO,
      EstadoDeclaracionCarga.CERRADO,
    ];

    const qb = this.declaracionRepo
      .createQueryBuilder("declaracion")
      .innerJoinAndSelect("declaracion.docente", "docente")
      .innerJoinAndSelect("declaracion.periodo_academico", "periodo")
      .leftJoinAndSelect("declaracion.departamento", "departamento")
      .leftJoinAndSelect("declaracion.facultad", "facultad")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .where("declaracion.periodo_academico_id = :periodoId", {
        periodoId: periodoActivo.id,
      })
      .andWhere("declaracion.estado IN (:...estados)", {
        estados: estadosVisibles,
      })
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC");

    if (usuario.rol !== RolUsuario.ADMINISTRADOR_SISTEMA) {
      const contexto =
        usuario.contextoAcademico ??
        (await this.contextoAcademicoService.resolverContexto(usuario));
      this.contextoAcademicoService.aplicarFiltroDeclaracion(qb, contexto);
    }

    const declaraciones = await qb.getMany();

    return declaraciones.map((declaracion) => ({
      id: declaracion.id,
      docente_id: declaracion.docente_id,
      docente_nombre: `${declaracion.docente.apellidos}, ${declaracion.docente.nombres}`,
      docente_ibm: declaracion.docente.ibm ?? null,
      estado: declaracion.estado,
      periodo: declaracion.periodo_academico.codigo,
      fecha_envio: declaracion.fecha_firma_docente,
      departamento_nombre: declaracion.departamento?.nombre ?? null,
      facultad_nombre: declaracion.facultad?.nombre ?? null,
    }));
  }

  async crear(
    dto: CreateDeclaracionCargaHorariaDto,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const periodo = await this.obtenerPeriodoActivo();
    const docente = await this.resolverDocente(usuario);
    this.verificarPermisoDocente(usuario, docente.id);

    const existe = await this.declaracionRepo.findOne({
      where: {
        docente_id: docente.id,
        periodo_academico_id: periodo.id,
      },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe una declaraciÃ³n para el docente ${docente.id} en el perÃ­odo activo`,
      );
    }

    const vinculacion = await this.resolverVinculacionInstitucional(docente);
    const declaracion = this.declaracionRepo.create({
      docente_id: docente.id,
      departamento_id: vinculacion.departamento_id,
      facultad_id: vinculacion.facultad_id,
      periodo_academico_id: periodo.id,
      sede: dto.sede ?? this.resolverSede(docente),
      observaciones: dto.observaciones ?? null,
      estado: EstadoDeclaracionCarga.BORRADOR,
      fecha_firma_docente: null,
      fecha_firma_director: null,
      fecha_firma_decano: null,
      usuario_firmante_id: usuario.id,
    });

    const saved = await this.declaracionRepo.save(declaracion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.DECLARACION_CARGA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.CREAR,
      estado_anterior: null,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        docente_id: saved.docente_id,
        periodo_academico_id: saved.periodo_academico_id,
        sede: saved.sede,
      },
      ip: "0.0.0.0",
    });

    return this.obtenerPorId(saved.id);
  }

  async actualizar(
    id: number,
    dto: UpdateDeclaracionCargaHorariaDto,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const declaracion = await this.obtenerEntidadEditable(id);
    this.verificarAccesoEdicion(usuario, declaracion.docente_id);

    const datosAnteriores = {
      sede: declaracion.sede,
      observaciones: declaracion.observaciones,
    };

    declaracion.sede = dto.sede ?? declaracion.sede;
    declaracion.observaciones =
      dto.observaciones !== undefined
        ? dto.observaciones
        : declaracion.observaciones;
    declaracion.usuario_firmante_id = usuario.id;

    const saved = await this.declaracionRepo.save(declaracion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.DECLARACION_CARGA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ACTUALIZAR,
      estado_anterior: null,
      estado_nuevo: null,
      datos_anteriores: datosAnteriores,
      datos_nuevos: {
        sede: saved.sede,
        observaciones: saved.observaciones,
      },
      ip: "0.0.0.0",
    });

    return this.obtenerPorId(saved.id);
  }

  async enviar(
    id: number,
    usuario: Usuario & { docenteId?: number | null },
    dto: AccionDeclaracionCargaHorariaDto,
  ): Promise<DeclaracionVista> {
    const declaracion = await this.obtenerEntidadEditable(id);
    this.verificarPermisoDocente(usuario, declaracion.docente_id);
    this.validarTransicionEstado(
      declaracion.estado,
      EstadoDeclaracionCarga.CONFIRMADO,
    );

    const estadoAnterior = declaracion.estado;

    // CL-V4: validar que todos los rubros con horas tengan detalle al enviar
    const actividades =
      (declaracion.carga_no_lectiva as any)?.actividades ?? [];
    for (const act of actividades) {
      const horas = Number(act.horas) || 0;
      if (horas > 0 && act.id !== 1) {
        if (!act.detalle || act.detalle.trim().length < 10) {
          throw new BadRequestException(
            `No puede enviar la declaraciÃ³n. El rubro "${act.nombre || act.id}" tiene ${horas}h pero su detalle descriptivo debe tener al menos 10 caracteres.`,
          );
        }
        if (!act.horarios || !Array.isArray(act.horarios) || act.horarios.length === 0) {
          throw new BadRequestException(
            `No puede enviar la declaraciÃ³n. El rubro "${act.nombre || act.id}" tiene ${horas}h pero no tiene horario registrado.`,
          );
        }
      }
    }

    // Validar que no haya conflictos de horario entre actividades
    this.validarConflictosHorarios(actividades);

    // V6: Horas totales <= horas de modalidad
    const totalLectivas = declaracion.total_horas_lectivas;
    const totalNoLectivas = declaracion.total_horas_no_lectivas;
    const horasModalidad = await this.obtenerHorasModalidad(
      declaracion.docente?.modalidad ?? "",
      declaracion.periodo_academico_id,
    );
    if (totalLectivas + totalNoLectivas > horasModalidad) {
      throw new BadRequestException(
        `El total de horas (${totalLectivas}h lectivas + ${totalNoLectivas}h no lectivas = ${totalLectivas + totalNoLectivas}h) excede las ${horasModalidad}h permitidas para la modalidad.`,
      );
    }

    declaracion.estado = EstadoDeclaracionCarga.CONFIRMADO;
    declaracion.fecha_firma_docente = new Date();
    declaracion.usuario_firmante_id = usuario.id;
    if (dto.observaciones !== undefined) {
      declaracion.observaciones = dto.observaciones;
    }

    const saved = await this.declaracionRepo.save(declaracion);

    // Audit logging
    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.DECLARACION_CARGA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.ENVIAR,
      estado_anterior: estadoAnterior,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: {
        observaciones: dto.observaciones,
      },
      ip: "0.0.0.0",
    });

    return this.obtenerPorId(saved.id);
  }

  async cerrar(
    id: number,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const declaracion = await this.obtenerEntidadBase(id);
    await this.verificarAccesoDeclaracion(usuario, declaracion);
    const estadoAnterior = declaracion.estado;
    this.validarTransicionEstado(
      estadoAnterior,
      EstadoDeclaracionCarga.CERRADO,
    );

    declaracion.estado = EstadoDeclaracionCarga.CERRADO;
    declaracion.fecha_firma_director = new Date();
    const saved = await this.declaracionRepo.save(declaracion);

    await this.auditoriaService.registrarCarga({
      entidad: EntidadAuditoriaCarga.DECLARACION_CARGA,
      entidad_id: saved.id,
      usuario_id: usuario.id,
      accion: AccionAuditoriaCarga.CERRAR,
      estado_anterior: estadoAnterior,
      estado_nuevo: saved.estado,
      datos_anteriores: null,
      datos_nuevos: null,
      ip: "0.0.0.0",
    });

    return this.obtenerPorId(saved.id);
  }

  async agregarObservacion(
    id: number,
    texto: string,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<void> {
    const declaracion = await this.obtenerEntidadBase(id);
    await this.verificarAccesoDeclaracion(usuario, declaracion);
    if (!texto || texto.trim().length < 10) {
      throw new BadRequestException("La observaciÃ³n debe tener al menos 10 caracteres");
    }
    const observacion = this.observacionRepo.create({
      declaracion_id: id,
      usuario_id: usuario.id,
      observacion: texto,
      estado_origen: declaracion.estado,
      estado_destino: declaracion.estado,
      tipo: TipoObservacion.OBSERVACION_DPTO,
      subsanada: false,
    });
    await this.observacionRepo.save(observacion);
  }


  async obtenerObservaciones(
    declaracionId: number,
  ): Promise<DeclaracionObservacion[]> {
    return this.observacionRepo.find({
      where: { declaracion_id: declaracionId },
      relations: ["usuario"],
      order: { created_at: "DESC" },
    });
  }

  async pendientesDepartamento(
    usuario: UsuarioAutenticado,
    periodo?: string,
  ): Promise<DocumentacionResumen[]> {
    this.verificarRol(usuario.rol, [
      RolUsuario.DIRECTOR_DEPARTAMENTO,
      RolUsuario.ADMINISTRADOR_SISTEMA,
    ]);

    const periodoActivo = await this.resolverPeriodoPorCodigo(periodo);
    const estadosVisibles = [
      EstadoDeclaracionCarga.CONFIRMADO,
      EstadoDeclaracionCarga.BORRADOR,
    ];

    const qb = this.declaracionRepo
      .createQueryBuilder("declaracion")
      .innerJoinAndSelect("declaracion.docente", "docente")
      .innerJoinAndSelect("declaracion.periodo_academico", "periodo")
      .leftJoinAndSelect("declaracion.departamento", "departamento")
      .leftJoinAndSelect("declaracion.facultad", "facultad")
      .leftJoin("departamento.escuela", "escuela")
      .where("declaracion.periodo_academico_id = :periodoId", {
        periodoId: periodoActivo.id,
      })
      .andWhere("declaracion.estado IN (:...estados)", {
        estados: estadosVisibles,
      })
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC");

    const contexto =
      usuario.contextoAcademico ??
      (await this.contextoAcademicoService.resolverContexto(usuario));
    this.contextoAcademicoService.aplicarFiltroDeclaracion(qb, contexto);

    const declaraciones = await qb.getMany();

    return declaraciones.map((d) => ({
      id: d.id,
      docente_id: d.docente_id,
      docente_nombre: `${d.docente.apellidos}, ${d.docente.nombres}`,
      docente_ibm: d.docente.ibm ?? null,
      estado: d.estado,
      periodo: d.periodo_academico.codigo,
      fecha_envio: d.fecha_firma_docente,
      departamento_nombre: d.departamento?.nombre ?? null,
      facultad_nombre: d.facultad?.nombre ?? null,
    }));
  }

  async pendientesFacultad(
    usuario: UsuarioAutenticado,
    periodo?: string,
  ): Promise<DocumentacionResumen[]> {
    this.verificarRol(usuario.rol, [
      RolUsuario.DECANO,
      RolUsuario.ADMINISTRADOR_SISTEMA,
    ]);

    const periodoActivo = await this.resolverPeriodoPorCodigo(periodo);

    const qb = this.declaracionRepo
      .createQueryBuilder("declaracion")
      .innerJoinAndSelect("declaracion.docente", "docente")
      .innerJoinAndSelect("declaracion.periodo_academico", "periodo")
      .leftJoinAndSelect("declaracion.facultad", "facultad")
      .leftJoinAndSelect("declaracion.departamento", "departamento")
      .where("declaracion.periodo_academico_id = :periodoId", {
        periodoId: periodoActivo.id,
      })
      .andWhere("declaracion.estado = :estado", {
        estado: EstadoDeclaracionCarga.CONFIRMADO,
      })
      .orderBy("facultad.nombre", "ASC")
      .addOrderBy("docente.apellidos", "ASC");

    const contexto =
      usuario.contextoAcademico ??
      (await this.contextoAcademicoService.resolverContexto(usuario));
    this.contextoAcademicoService.aplicarFiltroDeclaracion(qb, contexto);

    const declaraciones = await qb.getMany();

    return declaraciones.map((d) => ({
      id: d.id,
      docente_id: d.docente_id,
      docente_nombre: `${d.docente.apellidos}, ${d.docente.nombres}`,
      docente_ibm: d.docente.ibm ?? null,
      estado: d.estado,
      periodo: d.periodo_academico.codigo,
      fecha_envio: d.fecha_firma_director,
      departamento_nombre: d.departamento?.nombre ?? null,
      facultad_nombre: d.facultad?.nombre ?? null,
    }));
  }

  validarTransicionEstado(
    actual: EstadoDeclaracionCarga,
    siguiente: EstadoDeclaracionCarga,
  ): void {
    if (this.esEstadoFinal(actual)) {
      throw new BadRequestException(
        `La declaraciÃ³n en estado ${actual} no permite transiciones`,
      );
    }

    const transiciones: Record<
      EstadoDeclaracionCarga,
      EstadoDeclaracionCarga[]
    > = {
      [EstadoDeclaracionCarga.BORRADOR]: [
        EstadoDeclaracionCarga.CONFIRMADO,
      ],
      [EstadoDeclaracionCarga.CONFIRMADO]: [
        EstadoDeclaracionCarga.CERRADO,
      ],
      [EstadoDeclaracionCarga.CERRADO]: [],
    };

    const permitidos = transiciones[actual] ?? [];
    if (!permitidos.includes(siguiente)) {
      throw new BadRequestException(
        `TransiciÃ³n invÃ¡lida de ${actual} a ${siguiente}`,
      );
    }
  }

  private async obtenerEntidadBase(id: number): Promise<DeclaracionCargaHoraria> {
    const declaracion = await this.declaracionRepo.findOne({
      where: { id },
      relations: [
        "docente",
        "docente.departamento",
        "docente.departamento.escuela",
        "docente.departamento.escuela.facultad",
        "docente.facultad",
        "departamento",
        "facultad",
        "periodo_academico",
        "usuario_firmante",
      ],
    });

    if (!declaracion) {
      throw new NotFoundException(`DeclaraciÃ³n ${id} no encontrada`);
    }

    return declaracion;
  }

  private async obtenerEntidadEditable(
    id: number,
  ): Promise<DeclaracionCargaHoraria> {
    const declaracion = await this.obtenerEntidadBase(id);
    this.asegurarEditable(declaracion.estado);
    return declaracion;
  }

  private asegurarEditable(estado: EstadoDeclaracionCarga): void {
    if (
      [
        EstadoDeclaracionCarga.CONFIRMADO,
        EstadoDeclaracionCarga.CERRADO,
      ].includes(estado)
    ) {
      throw new BadRequestException(
        `La declaraciÃ³n en estado ${estado} es inmutable`,
      );
    }
  }

  private esEstadoFinal(estado: EstadoDeclaracionCarga): boolean {
    return [
      EstadoDeclaracionCarga.CERRADO,
    ].includes(estado);
  }

  private asegurarRegeneracionPermitida(estado: EstadoDeclaracionCarga): void {
    if (
      [
        EstadoDeclaracionCarga.CONFIRMADO,
        EstadoDeclaracionCarga.CERRADO,
      ].includes(estado)
    ) {
      throw new BadRequestException(
        `La declaraciÃ³n en estado ${estado} no permite regenerar la carga lectiva`,
      );
    }
  }

  private async resolverDocente(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<Docente> {
    const docenteId = usuario.docenteId ?? null;
    if (docenteId) {
      const docente = await this.docenteRepo.findOne({
        where: { id: docenteId },
        relations: [
          "departamento",
          "departamento.escuela",
          "departamento.escuela.facultad",
          "facultad",
        ],
      });
      if (!docente) {
        throw new NotFoundException(
          `Docente con ID ${docenteId} no encontrado`,
        );
      }
      return docente;
    }

    const docentePorUsuario = await this.docenteRepo.findOne({
      where: { usuario_id: usuario.id },
      relations: [
        "departamento",
        "departamento.escuela",
        "departamento.escuela.facultad",
        "facultad",
      ],
    });
    if (docentePorUsuario) {
      return docentePorUsuario;
    }

    const docenteLegacy = await this.docenteRepo.findOne({
      where: { email: usuario.email },
      relations: [
        "departamento",
        "departamento.escuela",
        "departamento.escuela.facultad",
        "facultad",
      ],
    });
    if (docenteLegacy) {
      return docenteLegacy;
    }

    throw new NotFoundException(
      "No se pudo resolver un docente asociado al usuario autenticado",
    );
  }

  private verificarPermisoDocente(
    usuario: Usuario & { docenteId?: number | null },
    docenteId: number,
  ): void {
    if (usuario.rol === RolUsuario.ADMINISTRADOR_SISTEMA) {
      return;
    }

    if (usuario.rol !== RolUsuario.DOCENTE) {
      return;
    }

    if (usuario.docenteId !== docenteId) {
      throw new ForbiddenException(
        "No puede actuar sobre la declaraciÃ³n de otro docente",
      );
    }
  }

  private verificarAccesoEdicion(
    usuario: Usuario & { docenteId?: number | null },
    docenteId: number,
  ): void {
    if (usuario.rol === RolUsuario.ADMINISTRADOR_SISTEMA) {
      return;
    }

    if (usuario.rol !== RolUsuario.DOCENTE) {
      throw new ForbiddenException(
        "No tiene permisos para editar la declaraciÃ³n",
      );
    }

    if (usuario.docenteId !== docenteId) {
      throw new ForbiddenException(
        "No puede editar la declaraciÃ³n de otro docente",
      );
    }
  }

  private verificarRol(rol: RolUsuario, rolesPermitidos: RolUsuario[]): void {
    if (!rolesPermitidos.includes(rol)) {
      throw new ForbiddenException("Rol no autorizado para esta operaciÃ³n");
    }
  }

  private async resolverVinculacionInstitucional(docente: Docente): Promise<{
    departamento_id: number;
    facultad_id: number;
  }> {
    if (docente.departamento_id && docente.facultad_id) {
      return {
        departamento_id: docente.departamento_id,
        facultad_id: docente.facultad_id,
      };
    }

    const departamento =
      docente.departamento ??
      (docente.departamento_id
        ? await this.departamentoRepo.findOne({
            where: { id: docente.departamento_id },
            relations: ["escuela", "escuela.facultad"],
          })
        : null);

    const facultad =
      docente.facultad ??
      (docente.facultad_id
        ? await this.facultadRepo.findOne({
            where: { id: docente.facultad_id },
          })
        : null);

    const facultadId =
      facultad?.id ?? departamento?.escuela?.facultad?.id ?? null;
    const departamentoId = departamento?.id ?? null;

    if (!facultadId || !departamentoId) {
      throw new BadRequestException(
        "El docente debe tener departamento y facultad asociados para crear una declaraciÃ³n",
      );
    }

    return {
      departamento_id: departamentoId,
      facultad_id: facultadId,
    };
  }

  private resolverSede(docente: Docente): string | null {
    return (
      docente.facultad?.nombre ??
      docente.departamento?.escuela?.facultad?.nombre ??
      null
    );
  }

  private async obtenerPeriodoActivo(): Promise<PeriodoAcademico> {
    const periodo = await this.periodoRepo.findOne({ where: { activo: true } });
    if (!periodo) {
      throw new NotFoundException("No existe un perÃ­odo acadÃ©mico activo");
    }
    return periodo;
  }

  async generarCargaLectivaDesdeHorarios(
    docenteId: number,
    periodoId: number,
  ): Promise<CargaLectivaGenerada> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: periodoId },
    });
    if (!periodo) {
      throw new NotFoundException(
        `Periodo acadÃ©mico ${periodoId} no encontrado`,
      );
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: [
        "departamento",
        "departamento.escuela",
        "departamento.escuela.facultad",
        "facultad",
      ],
    });
    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.docente", "docente")
      .leftJoinAndSelect("docente.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .leftJoinAndSelect("escuela.facultad", "facultad_escuela")
      .leftJoinAndSelect("docente.facultad", "facultad_docente")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .where("docente.id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo: periodo.codigo })
      .andWhere("horario.estado IN (:...estados)", {
        estados: [EstadoHorario.CONFIRMADO, EstadoHorario.PUBLICADO],
      })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    const registros = horarios.map((horario) =>
      this.construirRegistroCargaLectiva(horario),
    );
    const resumen = this.construirResumenCargaLectiva(registros);

    return {
      docenteId,
      periodoId,
      periodoCodigo: periodo.codigo,
      registros,
      resumen,
      generadoEn: new Date().toISOString(),
    };
  }

  async generarCargaLectivaDesdeAsignaciones(
    docenteId: number,
    periodoId: number,
  ): Promise<CargaLectivaGenerada> {
    const periodo = await this.periodoRepo.findOne({
      where: { id: periodoId },
    });
    if (!periodo) {
      throw new NotFoundException(`Periodo ${periodoId} no encontrado`);
    }

    const asignaciones = await this.asignacionLectivaRepo.find({
      where: { docente_id: docenteId, periodo_id: periodoId },
      relations: [
        "curso_plan",
        "curso_plan.curso",
        "curso_plan.curso.departamento",
        "curso_plan.curso.departamento.escuela",
        "grupo",
      ],
    });

    const registros: CargaLectivaDetalle[] = [];
    for (const a of asignaciones) {
      if (!a.curso_plan) continue;
      const curso = a.curso_plan.curso;
      registros.push({
        horarioAsignadoId: a.id,
        cursoId: curso?.id ?? 0,
        codigoCurso: curso?.codigo ?? "",
        nombreCurso: curso?.nombre ?? "",
        tipoCurso: a.curso_plan.tipo_curso || "OBLIGATORIO_GENERAL",
        escuela: curso?.departamento?.escuela?.nombre ?? "",
        grupoId: a.grupo_id ?? 0,
        seccion: a.grupo?.codigo ?? a.seccion ?? "",
        ciclo: a.curso_plan.ciclo,
        nroAlumnos: a.nro_alumnos,
        tipoClase: a.tipo_clase as TipoClase,
        horasTeoria: a.tipo_clase === "TEORIA" ? Number(a.horas_asignadas) : 0,
        horasPractica:
          a.tipo_clase === "PRACTICA" ? Number(a.horas_asignadas) : 0,
        horasLaboratorio:
          a.tipo_clase === "LABORATORIO" ? Number(a.horas_asignadas) : 0,
        horasBloque: Number(a.horas_asignadas),
        ambiente: "",
        dia: 0,
        horaInicio: "",
        horaFin: "",
      });
    }

    const resumen = this.construirResumenCargaLectiva(registros);
    return {
      docenteId,
      periodoId,
      periodoCodigo: periodo.codigo,
      registros,
      resumen,
      generadoEn: new Date().toISOString(),
    };
  }

  private async cargarCargaLectiva(
    docenteId: number,
    periodoId: number,
  ): Promise<CargaLectivaGenerada> {
    const asignaciones = await this.asignacionLectivaRepo.find({
      where: { docente_id: docenteId, periodo_id: periodoId },
      take: 1,
    });
    if (asignaciones.length > 0) {
      return this.generarCargaLectivaDesdeAsignaciones(docenteId, periodoId);
    }
    return this.generarCargaLectivaDesdeHorarios(docenteId, periodoId);
  }

  async obtenerCargaLectivaDeclaracion(
    declaracionId: number,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<CargaLectivaDeclaracionResultado> {
    const declaracion =
      await this.obtenerDeclaracionConRelaciones(declaracionId);
    await this.verificarAccesoDeclaracion(usuario, declaracion);

    const cargaLectiva = await this.cargarCargaLectiva(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    return {
      declaracionId: declaracion.id,
      cargaLectiva,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_lectiva_json,
      ),
    };
  }

  async actualizarCargaLectivaDeclaracion(
    declaracionId: number,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<CargaLectivaDeclaracionResultado> {
    const declaracion =
      await this.obtenerDeclaracionConRelaciones(declaracionId);
    await this.verificarAccesoDeclaracion(usuario, declaracion);

    this.asegurarRegeneracionPermitida(declaracion.estado);

    const cargaLectiva = await this.cargarCargaLectiva(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    declaracion.carga_lectiva_json = cargaLectiva as unknown as Record<
      string,
      unknown
    >;
    declaracion.estado = EstadoDeclaracionCarga.BORRADOR;
    declaracion.fecha_firma_docente = null;
    declaracion.fecha_firma_director = null;
    declaracion.fecha_firma_decano = null;
    declaracion.usuario_firmante_id = usuario.id;

    const saved = await this.declaracionRepo.save(declaracion);

    return {
      declaracionId: saved.id,
      cargaLectiva,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        saved.carga_lectiva_json,
      ),
    };
  }

  private construirRegistroCargaLectiva(
    horario: HorarioAsignado,
  ): CargaLectivaDetalle {
    const horasTeoria = horario.curso?.horas_teoria ?? 0;
    const horasPractica = horario.curso?.horas_practica ?? 0;
    const horasLaboratorio = horario.curso?.horas_laboratorio ?? 0;

    return {
      horarioAsignadoId: horario.id,
      cursoId: horario.curso_id,
      codigoCurso: horario.curso?.codigo ?? "",
      nombreCurso: horario.curso?.nombre ?? "",
      tipoCurso: "",
      escuela: horario.curso?.departamento?.escuela?.nombre ?? "",
      grupoId: horario.grupo_id,
      seccion: horario.grupo?.codigo ?? horario.grupo?.nombre ?? "",
      ciclo: horario.curso?.ciclo ?? 0,
      nroAlumnos: horario.grupo?.cupo_maximo ?? 0,
      tipoClase: horario.tipo_clase,
      horasTeoria,
      horasPractica,
      horasLaboratorio,
      horasBloque: this.calcularHorasBloque(
        horario.hora_inicio,
        horario.hora_fin,
      ),
      ambiente: horario.ambiente?.codigo ?? horario.ambiente?.nombre ?? "",
      dia: horario.dia,
      horaInicio: horario.hora_inicio,
      horaFin: horario.hora_fin,
    };
  }

  private construirResumenCargaLectiva(
    registros: CargaLectivaDetalle[],
  ): ResumenCargaLectiva {
    const horasPorCurso = new Map<number, AgrupadoHorasCurso>();
    const horasPorSeccion = new Map<number, AgrupadoHorasSeccion>();
    const horasPorTipoClase = new Map<TipoClase, AgrupadoHorasTipoClase>();

    let totalHoras = 0;

    for (const registro of registros) {
      totalHoras += registro.horasBloque;

      const cursoActual = horasPorCurso.get(registro.cursoId) ?? {
        cursoId: registro.cursoId,
        codigoCurso: registro.codigoCurso,
        nombreCurso: registro.nombreCurso,
        horas: 0,
      };
      cursoActual.horas += registro.horasBloque;
      horasPorCurso.set(registro.cursoId, cursoActual);

      const seccionActual = horasPorSeccion.get(registro.grupoId) ?? {
        grupoId: registro.grupoId,
        seccion: registro.seccion,
        horas: 0,
      };
      seccionActual.horas += registro.horasBloque;
      horasPorSeccion.set(registro.grupoId, seccionActual);

      const tipoActual = horasPorTipoClase.get(registro.tipoClase) ?? {
        tipoClase: registro.tipoClase,
        horas: 0,
      };
      tipoActual.horas += registro.horasBloque;
      horasPorTipoClase.set(registro.tipoClase, tipoActual);
    }

    return {
      totalHoras,
      totalCursos: horasPorCurso.size,
      totalSecciones: horasPorSeccion.size,
      totalBloques: registros.length,
      horasPorCurso: Array.from(horasPorCurso.values()),
      horasPorSeccion: Array.from(horasPorSeccion.values()),
      horasPorTipoClase: Array.from(horasPorTipoClase.values()),
    };
  }

  private normalizarSnapshotCargaLectiva(
    snapshot: Record<string, unknown> | null,
  ): CargaLectivaGenerada | null {
    return snapshot ? (snapshot as unknown as CargaLectivaGenerada) : null;
  }

  private calcularHorasBloque(horaInicio: string, horaFin: string): number {
    return (this.toMinutes(horaFin) - this.toMinutes(horaInicio)) / 60;
  }

  private async obtenerDeclaracionConRelaciones(
    id: number,
  ): Promise<DeclaracionCargaHoraria> {
    const declaracion = await this.declaracionRepo.findOne({
      where: { id },
      relations: [
        "docente",
        "docente.departamento",
        "docente.departamento.escuela",
        "docente.departamento.escuela.facultad",
        "docente.facultad",
        "departamento",
        "facultad",
        "periodo_academico",
        "usuario_firmante",
      ],
    });

    if (!declaracion) {
      throw new NotFoundException(`DeclaraciÃ³n ${id} no encontrada`);
    }

    return declaracion;
  }

  private async verificarAccesoDeclaracion(
    usuario: UsuarioAutenticado,
    declaracion: DeclaracionCargaHoraria,
  ): Promise<void> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR_SISTEMA) {
      return;
    }

    const contexto =
      usuario.contextoAcademico ??
      (await this.contextoAcademicoService.resolverContexto(usuario));

    if (contexto.verTodo) {
      return;
    }

    if (
      contexto.docenteId &&
      declaracion.docente_id !== contexto.docenteId
    ) {
      throw new ForbiddenException(
        "No puede acceder a la declaraciÃ³n de otro docente",
      );
    }

    if (
      contexto.departamentoIds.length > 0 &&
      declaracion.departamento_id &&
      !contexto.departamentoIds.includes(declaracion.departamento_id)
    ) {
      throw new ForbiddenException(
        "No puede acceder a declaraciones fuera de su unidad acadÃ©mica",
      );
    }
  }

  async obtenerDocentesActivos(): Promise<Docente[]> {
    return this.docenteRepo.find({
      where: { activo: true },
      select: [
        "id",
        "codigo",
        "ibm",
        "nombres",
        "apellidos",
        "email",
        "tipo_contrato",
        "categoria",
        "modalidad",
      ],
      relations: ["departamento", "facultad"],
      order: { apellidos: "ASC", nombres: "ASC" },
    });
  }

  async obtenerCursosAsignadosDocente(
    docenteId: number,
    periodo?: string,
  ): Promise<any[]> {
    let periodoId: number | undefined;
    let periodoCodigo: string | undefined;

    if (periodo) {
      const p = await this.periodoRepo.findOne({ where: { codigo: periodo } });
      if (p) {
        periodoId = p.id;
        periodoCodigo = p.codigo;
      }
    }

    if (!periodoId) {
      const p = await this.periodoRepo.findOne({
        where: { activo: true },
        order: { id: "DESC" },
      });
      if (p) {
        periodoId = p.id;
        periodoCodigo = p.codigo;
      }
    }

    if (!periodoId || !periodoCodigo) {
      this.logger.warn(`No se encontrÃ³ periodo: ${periodo}`);
      return [];
    }

    // Intentar cargar desde AsignacionLectiva (plan hours, read-only)
    const asignaciones = await this.asignacionLectivaRepo.find({
      where: { docente_id: docenteId, periodo_id: periodoId },
      relations: [
        "curso_plan",
        "curso_plan.curso",
        "curso_plan.curso.departamento",
        "curso_plan.curso.departamento.escuela",
        "grupo",
      ],
    });

    if (asignaciones.length > 0) {
      this.logger.debug(
        `Asignaciones para docente ${docenteId} en ${periodoCodigo}: ${asignaciones.length}`,
      );
      const cursosMap = new Map<string, any>();
      for (const a of asignaciones) {
        if (!a.curso_plan?.curso) continue;
        const curso = a.curso_plan.curso;
        const key = `${curso.id}`;
        // Usar nro_alumnos de la asignacion o fallback a cupo_maximo del grupo
        const alumnos = a.nro_alumnos || a.grupo?.cupo_maximo || 0;
        if (!cursosMap.has(key)) {
          cursosMap.set(key, {
            id: curso.id,
            codigo: curso.codigo,
            nombre: curso.nombre,
            tipoCurso: a.curso_plan.tipo_curso || "OBLIGATORIO_GENERAL",
            secciones: new Set([a.seccion || ""]),
            escuela:
              curso.departamento?.escuela?.nombre ?? "IngenierÃ­a de Sistemas",
            ciclo: a.curso_plan.ciclo,
            nroAlumnos: alumnos,
            hrsTeo: a.tipo_clase === "TEORIA" ? Number(a.horas_asignadas) : 0,
            hrsPra: a.tipo_clase === "PRACTICA" ? Number(a.horas_asignadas) : 0,
            hrsLab:
              a.tipo_clase === "LABORATORIO" ? Number(a.horas_asignadas) : 0,
            totalHrs: Number(a.horas_asignadas),
            plan_hours: true,
          });
        } else {
          const entry = cursosMap.get(key);
          if (a.seccion) entry.secciones.add(a.seccion);
          if (a.tipo_clase === "TEORIA")
            entry.hrsTeo += Number(a.horas_asignadas);
          if (a.tipo_clase === "PRACTICA")
            entry.hrsPra += Number(a.horas_asignadas);
          if (a.tipo_clase === "LABORATORIO")
            entry.hrsLab += Number(a.horas_asignadas);
          entry.totalHrs += Number(a.horas_asignadas);
          entry.nroAlumnos = Math.max(entry.nroAlumnos, alumnos);
        }
      }
      // Convertir Set de secciones a string plano para el frontend
      const resultado = Array.from(cursosMap.values());
      for (const entry of resultado) {
        entry.seccion = Array.from(entry.secciones).filter(Boolean).join(", ");
        delete entry.secciones;
      }
      this.logger.debug(
        `Resultado desde asignaciones: ${resultado.length} cursos`,
      );
      return resultado;
    }

    // Fallback: cargar desde horarios (datos de schedule)
    const horarios = await this.horarioRepo
      .createQueryBuilder("horario")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .where("horario.docente_id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo: periodoCodigo })
      .getMany();

    this.logger.debug(
      `Horarios para docente ${docenteId} en ${periodoCodigo}: ${horarios.length}`,
    );

    const cursosMap = new Map<string, any>();

    for (const h of horarios) {
      if (!h.curso || !h.grupo) continue;

      const key = `${h.curso_id}`;
      const horasBloque = this.calcularHorasBloque(h.hora_inicio, h.hora_fin);

      if (!cursosMap.has(key)) {
        cursosMap.set(key, {
          id: h.curso_id,
          codigo: h.curso.codigo,
          nombre: h.curso.nombre,
          tipoCurso: "",
          secciones: new Set([h.grupo.codigo || h.grupo.nombre || ""]),
          escuela:
            h.curso.departamento?.escuela?.nombre || "IngenierÃ­a de Sistemas",
          ciclo: h.curso.ciclo || 0,
          nroAlumnos: h.grupo.cupo_maximo || 40,
          hrsTeo: h.tipo_clase === TipoClase.TEORIA ? horasBloque : 0,
          hrsPra: h.tipo_clase === TipoClase.PRACTICA ? horasBloque : 0,
          hrsLab: h.tipo_clase === TipoClase.LABORATORIO ? horasBloque : 0,
          totalHrs: horasBloque,
        });
      } else {
        const entry = cursosMap.get(key);
        const seccion = h.grupo.codigo || h.grupo.nombre || "";
        if (seccion) entry.secciones.add(seccion);
        if (h.tipo_clase === TipoClase.TEORIA) entry.hrsTeo += horasBloque;
        if (h.tipo_clase === TipoClase.PRACTICA) entry.hrsPra += horasBloque;
        if (h.tipo_clase === TipoClase.LABORATORIO) entry.hrsLab += horasBloque;
        entry.totalHrs += horasBloque;
        entry.nroAlumnos = Math.max(entry.nroAlumnos, h.grupo.cupo_maximo || 40);
      }
    }

    const resultado = Array.from(cursosMap.values());
    for (const entry of resultado) {
      entry.seccion = Array.from(entry.secciones).filter(Boolean).join(", ");
      delete entry.secciones;
    }
    this.logger.debug(`Resultado final: ${resultado.length} cursos`);
    return resultado;
  }

  async obtenerDeclaracionPorDocentePeriodo(
    docenteId: number,
    periodo?: string,
  ): Promise<DeclaracionCargaHoraria | null> {
    let periodoId: number | undefined;
    if (periodo) {
      const p = await this.periodoRepo.findOne({ where: { codigo: periodo } });
      if (p) periodoId = p.id;
    }
    if (!periodoId) {
      const p = await this.periodoRepo.findOne({
        where: { activo: true },
        order: { id: "DESC" },
      });
      if (p) periodoId = p.id;
    }
    if (!periodoId) return null;

    return this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoId },
      relations: ["usuario_firmante", "periodo_academico", "carga_adicional"],
    });
  }

  async guardarDeclaracion(
    dto: any,
    usuario?: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionCargaHoraria> {
    const { docente_id, periodo, estado, carga_no_lectiva } = dto;

    let periodoId: number | undefined;
    if (periodo) {
      const p = await this.periodoRepo.findOne({ where: { codigo: periodo } });
      if (p) periodoId = p.id;
    }
    if (!periodoId) {
      const p = await this.periodoRepo.findOne({
        where: { activo: true },
        order: { id: "DESC" },
      });
      if (p) periodoId = p.id;
    }
    if (!periodoId) {
      throw new BadRequestException(
        "No se encontrÃ³ un perÃ­odo acadÃ©mico vÃ¡lido",
      );
    }

    const docente = await this.docenteRepo.findOne({
      where: { id: docente_id },
      relations: [
        "departamento",
        "departamento.escuela",
        "departamento.escuela.facultad",
        "facultad",
      ],
    });
    if (!docente) {
      throw new NotFoundException("Docente no encontrado");
    }

    // V12: docente debe tener modalidad asignada
    if (!docente.modalidad) {
      throw new BadRequestException(
        "El docente no tiene una modalidad asignada. Complete la ficha del docente antes de declarar.",
      );
    }

    let declaracion = await this.declaracionRepo.findOne({
      where: { docente_id, periodo_academico_id: periodoId },
    });

    if (
      declaracion &&
      ![
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
      ].includes(declaracion.estado)
    ) {
      throw new BadRequestException(
        "La declaraciÃ³n no puede ser modificada en este estado",
      );
    }

    if (!declaracion) {
      const vinculacion = await this.resolverVinculacionInstitucional(docente);
      declaracion = this.declaracionRepo.create({
        docente_id,
        departamento_id: vinculacion.departamento_id,
        facultad_id: vinculacion.facultad_id,
        periodo_academico_id: periodoId,
        estado: EstadoDeclaracionCarga.BORRADOR,
        sede: this.resolverSede(docente),
        usuario_firmante_id: usuario?.id ?? null,
      });
    } else if (usuario?.id) {
      declaracion.usuario_firmante_id = usuario.id;
    }

    // CL-V1: Carga lectiva SIEMPRE desde AsignacionLectiva (source of truth)
    // Fallback a HorarioAsignado si no hay asignaciones lectivas
    let asignaciones = await this.asignacionLectivaRepo.find({
      where: { docente_id, periodo_id: periodoId },
    });
    let totalLectivas = asignaciones.reduce(
      (sum, a) => sum + Number(a.horas_asignadas),
      0,
    );

    // Fallback: calcular desde HorarioAsignado si no hay asignaciones lectivas
    if (totalLectivas === 0) {
      const periodo = await this.periodoRepo.findOne({ where: { id: periodoId } });
      if (periodo) {
        const horarios = await this.horarioRepo
          .createQueryBuilder("horario")
          .where("horario.docente_id = :docente_id", { docente_id })
          .andWhere("horario.periodo = :periodo", { periodo: periodo.codigo })
          .getMany();
        
        totalLectivas = horarios.reduce((sum, h) => {
          const horasBloque = this.calcularHorasBloque(h.hora_inicio, h.hora_fin);
          return sum + horasBloque;
        }, 0);
        
        this.logger.debug(`Carga lectiva calculada desde HorarioAsignado: ${totalLectivas}h para docente ${docente_id}`);
      }
    }
    
    const totalCursosAsignados =
      asignaciones.length > 0
        ? new Set(asignaciones.map((a) => a.curso_plan_id)).size
        : 0;

    // V10: carga lectiva no puede ser 0 si hay cursos
    if (totalLectivas === 0 && totalCursosAsignados > 0) {
      throw new BadRequestException(
        "La carga lectiva no puede ser 0 si hay cursos asignados en el plan de estudios.",
      );
    }

    // Persistir snapshot de carga lectiva
    const cargaLectivaSnapshot = {
      totalHoras: totalLectivas,
      totalCursos: totalCursosAsignados,
      totalAsignaciones: asignaciones.length,
      detalle: asignaciones.map((a) => ({
        cursoPlanId: a.curso_plan_id,
        grupoId: a.grupo_id,
        seccion: a.seccion,
        tipoClase: a.tipo_clase,
        horasAsignadas: Number(a.horas_asignadas),
        nroAlumnos: a.nro_alumnos,
      })),
    };

    declaracion.carga_lectiva_json = cargaLectivaSnapshot;
    declaracion.total_horas_lectivas = totalLectivas;

    // CL-V2 + CL-V4: validar rubros no lectivos
    const actividades = carga_no_lectiva?.actividades ?? [];
    
    // Validar sincronizaciÃ³n entre horarios y horas
    for (const act of actividades) {
      const horasDeclaradas = Number(act.horas) || 0;
      const horasManual = act.horasManual === true;
      
      if (horasDeclaradas > 0 && act.id !== 1 && (!act.detalle || act.detalle.trim().length < 10)) {
        throw new BadRequestException(
          `El rubro "${act.descripcion || act.id}" tiene ${horasDeclaradas}h pero su detalle descriptivo debe tener al menos 10 caracteres.`,
        );
      }
      
      // Validar que si hay horas, haya horarios (excepto rubro 1) - ahora es advertencia, no error bloqueante
      if (horasDeclaradas > 0 && act.id !== 1 && (!act.horarios || !Array.isArray(act.horarios) || act.horarios.length === 0)) {
        this.logger.warn(
          `Advertencia: El rubro "${act.descripcion || act.id}" tiene ${horasDeclaradas}h pero no tiene horarios registrados. Se recomienda asignar horarios.`,
        );
      }
    }
    
    const totalNoLectivas = actividades.reduce(
      (sum: number, a: any) => sum + (Number(a.horas) || 0),
      0,
    );

    declaracion.carga_no_lectiva = carga_no_lectiva || null;
    declaracion.total_horas_no_lectivas = totalNoLectivas;

    // V6: Horas totales (lectivas + no lectivas) <= horas de modalidad
    const horasModalidad = await this.obtenerHorasModalidad(
      docente.modalidad,
      periodoId,
    );
    if (totalLectivas + totalNoLectivas > horasModalidad) {
      throw new BadRequestException(
        `El total de horas (${totalLectivas}h lectivas + ${totalNoLectivas}h no lectivas = ${totalLectivas + totalNoLectivas}h) excede las ${horasModalidad}h permitidas para la modalidad ${docente.modalidad}.`,
      );
    }

    // Regla PreparaciÃ³n y EvaluaciÃ³n <= 50% de lectivas
    const actPreparacion = actividades.find((a: any) => a.id === 2);
    if (actPreparacion) {
      const maxPrep = Math.floor(totalLectivas * 0.5);
      if (Number(actPreparacion.horas) > maxPrep) {
        throw new BadRequestException(
          `Las horas de PreparaciÃ³n y EvaluaciÃ³n (${actPreparacion.horas}h) no pueden exceder el 50% del Trabajo Lectivo (${maxPrep}h).`,
        );
      }
    }

    declaracion.total_horas_general = totalLectivas + totalNoLectivas;
    declaracion.estado = estado || EstadoDeclaracionCarga.BORRADOR;

    return this.declaracionRepo.save(declaracion);
  }

  private async obtenerHorasModalidad(
    modalidad: string,
    periodoId: number,
  ): Promise<number> {
    const params = await this.parametrosCargaRepo.findOne({
      where: { modalidad, periodo_academico: String(periodoId) },
    });
    if (params?.horas_max_semanal) return params.horas_max_semanal;
    const match = modalidad.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    if (modalidad === "DEDICACION_EXCLUSIVA") return 40;
    return 40;
  }

  async enviarDeclaracionDocente(
    docenteId: number,
    periodo?: string,
  ): Promise<DeclaracionCargaHoraria> {
    let periodoId: number | undefined;
    if (periodo) {
      const p = await this.periodoRepo.findOne({ where: { codigo: periodo } });
      if (p) periodoId = p.id;
    }
    if (!periodoId) {
      const p = await this.periodoRepo.findOne({
        where: { activo: true },
        order: { id: "DESC" },
      });
      if (p) periodoId = p.id;
    }
    if (!periodoId) {
      throw new BadRequestException(
        "No se encontrÃ³ un perÃ­odo acadÃ©mico vÃ¡lido",
      );
    }

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoId },
    });

    if (!declaracion) {
      throw new NotFoundException("No se encontrÃ³ declaraciÃ³n para enviar");
    }

    if (
      ![
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.BORRADOR,
      ].includes(declaracion.estado)
    ) {
      throw new BadRequestException(
        "La declaraciÃ³n ya ha sido enviada o no puede ser modificada",
      );
    }

    // CL-V4: validar que todos los rubros con horas tengan detalle al enviar
    const actividades =
      (declaracion.carga_no_lectiva as any)?.actividades ?? [];
    for (const act of actividades) {
      const horas = Number(act.horas) || 0;
      if (horas > 0 && act.id !== 1) {
        if (!act.detalle || act.detalle.trim().length < 10) {
          throw new BadRequestException(
            `No puede enviar la declaraciÃ³n. El rubro "${act.nombre || act.id}" tiene ${horas}h pero su detalle descriptivo debe tener al menos 10 caracteres.`,
          );
        }
        if (!act.horarios || !Array.isArray(act.horarios) || act.horarios.length === 0) {
          throw new BadRequestException(
            `No puede enviar la declaraciÃ³n. El rubro "${act.nombre || act.id}" tiene ${horas}h pero no tiene horario registrado.`,
          );
        }
      }
    }

    // Validar que no haya conflictos de horario entre actividades
    this.validarConflictosHorarios(actividades);

    declaracion.estado = EstadoDeclaracionCarga.CONFIRMADO;
    return this.declaracionRepo.save(declaracion);
  }

  private toMinutes(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private validarConflictosHorarios(actividades: any[]): void {
    const conflictos: string[] = [];
    for (let i = 0; i < actividades.length; i++) {
      const a = actividades[i];
      if (!a.horarios || !Array.isArray(a.horarios)) continue;
      for (let j = i + 1; j < actividades.length; j++) {
        const b = actividades[j];
        if (!b.horarios || !Array.isArray(b.horarios)) continue;
        for (const h1 of a.horarios) {
          for (const h2 of b.horarios) {
            if (h1.dia !== h2.dia) continue;
            if (h1.hora_inicio < h2.hora_fin && h2.hora_inicio < h1.hora_fin) {
              conflictos.push(
                `Rubro ${a.id} (${h1.dia} ${h1.hora_inicio}-${h1.hora_fin}) y rubro ${b.id} (${h2.dia} ${h2.hora_inicio}-${h2.hora_fin})`,
              );
            }
          }
        }
      }
    }
    if (conflictos.length > 0) {
      throw new BadRequestException(
        `Conflictos de horario detectados entre actividades: ${conflictos.join("; ")}`,
      );
    }
  }

  private async resolverPeriodoPorCodigo(
    periodo?: string,
  ): Promise<PeriodoAcademico> {
    if (periodo) {
      const periodoEncontrado = await this.periodoRepo.findOne({
        where: { codigo: periodo },
      });
      if (periodoEncontrado) {
        return periodoEncontrado;
      }
    }

    return this.obtenerPeriodoActivo();
  }

  async obtenerDeclaracionJurada(
    docenteId: number,
    periodo?: string,
  ): Promise<DeclaracionJurada | null> {
    const periodoObj = await this.resolverPeriodoPorCodigo(periodo);
    return this.declaracionJuradaRepo.findOne({
      where: {
        docente_id: docenteId,
        periodo_id: periodoObj.id,
      },
      order: { generada_en: "DESC" },
    });
  }

  async generarDeclaracionJurada(
    docenteId: number,
    periodo?: string,
    usuario?: Usuario,
  ): Promise<DeclaracionJurada> {
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId },
      relations: ["departamento", "facultad"],
    });
    if (!docente) throw new NotFoundException("Docente no encontrado");

    const periodoObj = await this.resolverPeriodoPorCodigo(periodo);

    const declaracion = await this.declaracionRepo.findOne({
      where: {
        docente_id: docenteId,
        periodo_academico_id: periodoObj.id,
      },
    });

    const modalidad = docente.modalidad || "TIEMPO_COMPLETO_40";
    let tipoDeclaracion = "COMPATIBILIDAD_TOTAL";

    if (modalidad === "DEDICACION_EXCLUSIVA") {
      tipoDeclaracion = "EXCLUSIVIDAD";
    } else if (modalidad.startsWith("TIEMPO_COMPLETO")) {
      tipoDeclaracion = "COMPATIBILIDAD_TOTAL";
    } else {
      tipoDeclaracion = "COMPATIBILIDAD_PARCIAL";
    }

    const contenido = {
      docente: `${docente.apellidos.toUpperCase()}, ${docente.nombres.toUpperCase()}`,
      dni: docente.ibm || docente.codigo,
      departamento: docente.departamento?.nombre || "No asignado",
      facultad: docente.facultad?.nombre || "No asignada",
      modalidad: modalidad,
      tipoDeclaracion,
      periodo: periodoObj.codigo,
      fechaGeneracion: new Date().toISOString(),
    };

    const jurada = this.declaracionJuradaRepo.create({
      declaracion_id: declaracion?.id || 0,
      docente_id: docenteId,
      periodo_id: periodoObj.id,
      tipo_declaracion: tipoDeclaracion,
      contenido: contenido as unknown as Record<string, unknown>,
      estado: "PENDIENTE",
    });

    return this.declaracionJuradaRepo.save(jurada);
  }
}

