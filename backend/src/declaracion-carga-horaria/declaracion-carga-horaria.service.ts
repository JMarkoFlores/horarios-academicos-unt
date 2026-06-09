import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CreateDeclaracionCargaHorariaDto } from "./dto/create-declaracion-carga-horaria.dto";
import { UpdateDeclaracionCargaHorariaDto } from "./dto/update-declaracion-carga-horaria.dto";
import { AccionDeclaracionCargaHorariaDto } from "./dto/accion-declaracion-carga-horaria.dto";

interface CargaLectivaDetalle {
  horarioAsignadoId: number;
  cursoId: number;
  codigoCurso: string;
  nombreCurso: string;
  grupoId: number;
  seccion: string;
  ciclo: number;
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
}

@Injectable()
export class DeclaracionCargaHorariaService {
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
  ) {}

  async obtenerMia(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const docente = await this.resolverDocente(usuario);
    const periodo = await this.obtenerPeriodoActivo();
    const cargaLectiva = await this.generarCargaLectivaDesdeHorarios(
      docente.id,
      periodo.id,
    );
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
        estado: EstadoDeclaracionCarga.NO_INICIADO,
        docente,
        departamento: docente.departamento ?? null,
        facultad:
          docente.facultad ?? docente.departamento?.escuela?.facultad ?? null,
        periodo,
        cargaLectiva,
        snapshotGuardado: null,
      };
    }

    return {
      declaracion,
      estado: declaracion.estado,
      docente,
      departamento: declaracion.departamento,
      facultad: declaracion.facultad,
      periodo,
      cargaLectiva,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_no_lectiva,
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
      throw new NotFoundException(`Declaración ${id} no encontrada`);
    }

    if (usuario) {
      this.verificarAccesoDeclaracion(usuario, declaracion);
    }

    const cargaLectiva = await this.generarCargaLectivaDesdeHorarios(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    return {
      declaracion,
      estado: declaracion.estado,
      docente: declaracion.docente,
      departamento: declaracion.departamento,
      facultad: declaracion.facultad,
      periodo: declaracion.periodo_academico,
      cargaLectiva,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_no_lectiva,
      ),
    };
  }

  async obtenerDocumentaciones(
    usuario: Usuario & { docenteId?: number | null },
    periodo?: string,
  ): Promise<DocumentacionResumen[]> {
    this.verificarRol(usuario.rol, [
      RolUsuario.ADMINISTRADOR_SISTEMA,
      RolUsuario.DIRECTOR_ESCUELA,
    ]);

    const periodoActivo = await this.resolverPeriodoPorCodigo(periodo);
    const estadosVisibles = [
      EstadoDeclaracionCarga.ENVIADO_DOCENTE,
      EstadoDeclaracionCarga.OBSERVADO_DPTO,
      EstadoDeclaracionCarga.SUBSANADO,
      EstadoDeclaracionCarga.VALIDADO_DPTO,
      EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
      EstadoDeclaracionCarga.APROBADO_FACULTAD,
      EstadoDeclaracionCarga.CERRADO,
    ];

    const qb = this.declaracionRepo
      .createQueryBuilder("declaracion")
      .innerJoinAndSelect("declaracion.docente", "docente")
      .innerJoinAndSelect("declaracion.periodo_academico", "periodo")
      .leftJoinAndSelect("declaracion.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .where("declaracion.periodo_academico_id = :periodoId", {
        periodoId: periodoActivo.id,
      })
      .andWhere("declaracion.estado IN (:...estados)", {
        estados: estadosVisibles,
      })
      .orderBy("docente.apellidos", "ASC")
      .addOrderBy("docente.nombres", "ASC");

    if (usuario.rol === RolUsuario.DIRECTOR_ESCUELA) {
      qb.andWhere("escuela.coordinador_id = :usuarioId", {
        usuarioId: usuario.id,
      });
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
        `Ya existe una declaración para el docente ${docente.id} en el período activo`,
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
    return this.obtenerPorId(saved.id);
  }

  async actualizar(
    id: number,
    dto: UpdateDeclaracionCargaHorariaDto,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionVista> {
    const declaracion = await this.obtenerEntidadEditable(id);
    this.verificarAccesoEdicion(usuario, declaracion.docente_id);

    declaracion.sede = dto.sede ?? declaracion.sede;
    declaracion.observaciones =
      dto.observaciones !== undefined
        ? dto.observaciones
        : declaracion.observaciones;
    declaracion.usuario_firmante_id = usuario.id;

    const saved = await this.declaracionRepo.save(declaracion);
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
      EstadoDeclaracionCarga.ENVIADO_DOCENTE,
    );

    declaracion.estado = EstadoDeclaracionCarga.ENVIADO_DOCENTE;
    declaracion.fecha_firma_docente = new Date();
    declaracion.usuario_firmante_id = usuario.id;
    if (dto.observaciones !== undefined) {
      declaracion.observaciones = dto.observaciones;
    }

    const saved = await this.declaracionRepo.save(declaracion);
    return this.obtenerPorId(saved.id);
  }

  async observar(
    id: number,
    usuario: Usuario & { docenteId?: number | null },
    dto: AccionDeclaracionCargaHorariaDto,
  ): Promise<DeclaracionVista> {
    const declaracion = await this.obtenerEntidadEditable(id);
    this.verificarAccesoDeclaracion(usuario, declaracion);
    const estadoObjetivo = this.resolverEstadoObservacion(usuario.rol);
    this.validarTransicionEstado(declaracion.estado, estadoObjetivo);

    declaracion.estado = estadoObjetivo;
    declaracion.observaciones = dto.observaciones ?? declaracion.observaciones;
    declaracion.usuario_firmante_id = usuario.id;
    if (estadoObjetivo === EstadoDeclaracionCarga.OBSERVADO_DPTO) {
      declaracion.fecha_firma_director = new Date();
    }

    const saved = await this.declaracionRepo.save(declaracion);
    return this.obtenerPorId(saved.id);
  }

  async validar(
    id: number,
    usuario: Usuario & { docenteId?: number | null },
    dto: AccionDeclaracionCargaHorariaDto,
  ): Promise<DeclaracionVista> {
    this.verificarRol(usuario.rol, [
      RolUsuario.DIRECTOR_DEPARTAMENTO,
      RolUsuario.DIRECTOR_ESCUELA,
      RolUsuario.ADMINISTRADOR_SISTEMA,
    ]);

    const declaracion = await this.obtenerEntidadEditable(id);
    this.verificarAccesoDeclaracion(usuario, declaracion);
    this.validarTransicionEstado(
      declaracion.estado,
      EstadoDeclaracionCarga.VALIDADO_DPTO,
    );

    declaracion.estado = EstadoDeclaracionCarga.VALIDADO_DPTO;
    declaracion.fecha_firma_director = new Date();
    declaracion.usuario_firmante_id = usuario.id;
    if (dto.observaciones !== undefined) {
      declaracion.observaciones = dto.observaciones;
    }

    const saved = await this.declaracionRepo.save(declaracion);
    return this.obtenerPorId(saved.id);
  }

  async aprobar(
    id: number,
    usuario: Usuario & { docenteId?: number | null },
    dto: AccionDeclaracionCargaHorariaDto,
  ): Promise<DeclaracionVista> {
    this.verificarRol(usuario.rol, [
      RolUsuario.DECANO,
      RolUsuario.ADMINISTRADOR_SISTEMA,
    ]);

    const declaracion = await this.obtenerEntidadEditable(id);
    this.validarTransicionEstado(
      declaracion.estado,
      EstadoDeclaracionCarga.APROBADO_FACULTAD,
    );

    declaracion.estado = EstadoDeclaracionCarga.APROBADO_FACULTAD;
    declaracion.fecha_firma_decano = new Date();
    declaracion.usuario_firmante_id = usuario.id;
    if (dto.observaciones !== undefined) {
      declaracion.observaciones = dto.observaciones;
    }

    const saved = await this.declaracionRepo.save(declaracion);
    return this.obtenerPorId(saved.id);
  }

  validarTransicionEstado(
    actual: EstadoDeclaracionCarga,
    siguiente: EstadoDeclaracionCarga,
  ): void {
    if (this.esEstadoFinal(actual)) {
      throw new BadRequestException(
        `La declaración en estado ${actual} no permite transiciones`,
      );
    }

    const transiciones: Record<
      EstadoDeclaracionCarga,
      EstadoDeclaracionCarga[]
    > = {
      [EstadoDeclaracionCarga.NO_INICIADO]: [
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.BORRADOR]: [
        EstadoDeclaracionCarga.PENDIENTE_ENVIO,
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.PENDIENTE_ENVIO]: [
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.ENVIADO_DOCENTE]: [
        EstadoDeclaracionCarga.OBSERVADO_DPTO,
        EstadoDeclaracionCarga.VALIDADO_DPTO,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.OBSERVADO_DPTO]: [
        EstadoDeclaracionCarga.SUBSANADO,
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.VALIDADO_DPTO,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.SUBSANADO]: [
        EstadoDeclaracionCarga.PENDIENTE_ENVIO,
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.VALIDADO_DPTO]: [
        EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.OBSERVADO_FACULTAD]: [
        EstadoDeclaracionCarga.SUBSANADO,
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.ANULADO,
      ],
      [EstadoDeclaracionCarga.APROBADO_FACULTAD]: [
        EstadoDeclaracionCarga.CERRADO,
      ],
      [EstadoDeclaracionCarga.CERRADO]: [],
      [EstadoDeclaracionCarga.ANULADO]: [],
    };

    const permitidos = transiciones[actual] ?? [];
    if (!permitidos.includes(siguiente)) {
      throw new BadRequestException(
        `Transición inválida de ${actual} a ${siguiente}`,
      );
    }
  }

  private async obtenerEntidadEditable(
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
      throw new NotFoundException(`Declaración ${id} no encontrada`);
    }

    this.asegurarEditable(declaracion.estado);
    return declaracion;
  }

  private asegurarEditable(estado: EstadoDeclaracionCarga): void {
    if (
      [
        EstadoDeclaracionCarga.VALIDADO_DPTO,
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
        EstadoDeclaracionCarga.CERRADO,
        EstadoDeclaracionCarga.ANULADO,
      ].includes(estado)
    ) {
      throw new BadRequestException(
        `La declaración en estado ${estado} es inmutable`,
      );
    }
  }

  private esEstadoFinal(estado: EstadoDeclaracionCarga): boolean {
    return [
      EstadoDeclaracionCarga.CERRADO,
      EstadoDeclaracionCarga.ANULADO,
    ].includes(estado);
  }

  private asegurarRegeneracionPermitida(estado: EstadoDeclaracionCarga): void {
    if (
      [
        EstadoDeclaracionCarga.VALIDADO_DPTO,
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
        EstadoDeclaracionCarga.CERRADO,
        EstadoDeclaracionCarga.ANULADO,
      ].includes(estado)
    ) {
      throw new BadRequestException(
        `La declaración en estado ${estado} no permite regenerar la carga lectiva`,
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
        "No puede actuar sobre la declaración de otro docente",
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
        "No tiene permisos para editar la declaración",
      );
    }

    if (usuario.docenteId !== docenteId) {
      throw new ForbiddenException(
        "No puede editar la declaración de otro docente",
      );
    }
  }

  private resolverEstadoObservacion(rol: RolUsuario): EstadoDeclaracionCarga {
    if (
      rol === RolUsuario.DIRECTOR_ESCUELA ||
      rol === RolUsuario.DIRECTOR_DEPARTAMENTO ||
      rol === RolUsuario.ADMINISTRADOR_SISTEMA
    ) {
      return EstadoDeclaracionCarga.OBSERVADO_DPTO;
    }

    if (rol === RolUsuario.DECANO) {
      return EstadoDeclaracionCarga.OBSERVADO_FACULTAD;
    }

    throw new ForbiddenException(
      "Rol no autorizado para observar la declaración",
    );
  }

  private verificarRol(rol: RolUsuario, rolesPermitidos: RolUsuario[]): void {
    if (!rolesPermitidos.includes(rol)) {
      throw new ForbiddenException("Rol no autorizado para esta operación");
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
        "El docente debe tener departamento y facultad asociados para crear una declaración",
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
      throw new NotFoundException("No existe un período académico activo");
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
        `Periodo académico ${periodoId} no encontrado`,
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

  async obtenerCargaLectivaDeclaracion(
    declaracionId: number,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<CargaLectivaDeclaracionResultado> {
    const declaracion =
      await this.obtenerDeclaracionConRelaciones(declaracionId);
    this.verificarAccesoDeclaracion(usuario, declaracion);

    const cargaLectiva = await this.generarCargaLectivaDesdeHorarios(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    return {
      declaracionId: declaracion.id,
      cargaLectiva,
      snapshotGuardado: this.normalizarSnapshotCargaLectiva(
        declaracion.carga_no_lectiva,
      ),
    };
  }

  async actualizarCargaLectivaDeclaracion(
    declaracionId: number,
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<CargaLectivaDeclaracionResultado> {
    const declaracion =
      await this.obtenerDeclaracionConRelaciones(declaracionId);
    this.verificarAccesoDeclaracion(usuario, declaracion);

    this.asegurarRegeneracionPermitida(declaracion.estado);

    const cargaLectiva = await this.generarCargaLectivaDesdeHorarios(
      declaracion.docente_id,
      declaracion.periodo_academico_id,
    );

    declaracion.carga_no_lectiva = cargaLectiva as unknown as Record<
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
        saved.carga_no_lectiva,
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
      grupoId: horario.grupo_id,
      seccion: horario.grupo?.codigo ?? horario.grupo?.nombre ?? "",
      ciclo: horario.curso?.ciclo ?? 0,
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
      throw new NotFoundException(`Declaración ${id} no encontrada`);
    }

    return declaracion;
  }

  private verificarAccesoDeclaracion(
    usuario: Usuario & { docenteId?: number | null },
    declaracion: DeclaracionCargaHoraria,
  ): void {
    if (usuario.rol === RolUsuario.ADMINISTRADOR_SISTEMA) {
      return;
    }

    if (usuario.rol === RolUsuario.DIRECTOR_ESCUELA) {
      const coordinadorId =
        declaracion.docente?.departamento?.escuela?.coordinador_id ??
        declaracion.departamento?.escuela?.coordinador_id ??
        null;
      if (coordinadorId !== usuario.id) {
        throw new ForbiddenException(
          "No puede acceder a documentaciones fuera de su escuela",
        );
      }
      return;
    }

    if (
      usuario.rol === RolUsuario.DOCENTE &&
      usuario.docenteId !== declaracion.docente_id
    ) {
      throw new ForbiddenException(
        "No puede acceder a la declaración de otro docente",
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
      console.warn(`[DEBUG] No se encontró periodo: ${periodo} -> ${periodoCodigo}`);
      return [];
    }

    // Buscamos los horarios asignados
    const horarios = await this.horarioRepo.createQueryBuilder("horario")
      .leftJoinAndSelect("horario.curso", "curso")
      .leftJoinAndSelect("horario.grupo", "grupo")
      .leftJoinAndSelect("horario.ambiente", "ambiente")
      .leftJoinAndSelect("curso.departamento", "departamento")
      .leftJoinAndSelect("departamento.escuela", "escuela")
      .where("horario.docente_id = :docenteId", { docenteId })
      .andWhere("horario.periodo = :periodo", { periodo: periodoCodigo })
      .getMany();

    console.log(`[DEBUG] Horarios para docente ${docenteId} en ${periodoCodigo}:`, horarios.length);

    const cursosMap = new Map<string, any>();

    for (const h of horarios) {
      if (!h.curso || !h.grupo) continue;

      const key = `${h.curso_id}-${h.grupo_id}`;
      const horasBloque = this.calcularHorasBloque(h.hora_inicio, h.hora_fin);

      if (!cursosMap.has(key)) {
        cursosMap.set(key, {
          id: h.curso_id,
          codigo: h.curso.codigo,
          nombre: h.curso.nombre,
          seccion: h.grupo.codigo || h.grupo.nombre || "",
          escuela: h.curso.departamento?.escuela?.nombre || "Ingeniería de Sistemas",
          ciclo: h.curso.ciclo || 0,
          nroAlumnos: h.grupo.cupo_maximo || 40,
          hrsTeo: h.tipo_clase === TipoClase.TEORIA ? horasBloque : 0,
          hrsPra: h.tipo_clase === TipoClase.PRACTICA ? horasBloque : 0,
          hrsLab: h.tipo_clase === TipoClase.LABORATORIO ? horasBloque : 0,
          totalHrs: horasBloque,
        });
      } else {
        const entry = cursosMap.get(key);
        if (h.tipo_clase === TipoClase.TEORIA) entry.hrsTeo += horasBloque;
        if (h.tipo_clase === TipoClase.PRACTICA) entry.hrsPra += horasBloque;
        if (h.tipo_clase === TipoClase.LABORATORIO) entry.hrsLab += horasBloque;
        entry.totalHrs += horasBloque;
      }
    }

    const resultado = Array.from(cursosMap.values());
    console.log(`[DEBUG] Resultado final (${resultado.length} cursos):`, JSON.stringify(resultado));
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
      relations: ["usuario_firmante"],
    });
  }

  async guardarDeclaracion(
    dto: any,
    usuario?: Usuario & { docenteId?: number | null },
  ): Promise<DeclaracionCargaHoraria> {
    const {
      docente_id,
      periodo,
      estado,
      cursos_lectivos,
      carga_no_lectiva,
      total_horas,
    } = dto;

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
        "No se encontró un período académico válido",
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

    let declaracion = await this.declaracionRepo.findOne({
      where: { docente_id, periodo_academico_id: periodoId },
    });

    if (
      declaracion &&
      ![
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.NO_INICIADO,
        EstadoDeclaracionCarga.OBSERVADO_DPTO,
        EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
      ].includes(declaracion.estado)
    ) {
      throw new BadRequestException(
        "La declaración no puede ser modificada en este estado",
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

    declaracion.carga_no_lectiva = carga_no_lectiva || null;
    declaracion.estado = estado || EstadoDeclaracionCarga.BORRADOR;

    // Validación: Total Horas Lectivas (Tabla 1)
    const totalLectivas = (cursos_lectivos || []).reduce(
      (sum: number, c: any) => sum + (Number(c.total_hrs) || 0),
      0,
    );

    // Regla específica para Preparación y Evaluación (id: 2): Max 50% con redondeo hacia abajo
    const actPreparacion = (carga_no_lectiva?.actividades || []).find((a: any) => a.id === 2);
    if (actPreparacion) {
      const maxPrep = Math.floor(totalLectivas * 0.5);
      if (Number(actPreparacion.horas) > maxPrep) {
        throw new BadRequestException(
          `Las horas de Preparación y Evaluación (${actPreparacion.horas}h) no pueden exceder el 50% del Trabajo Lectivo (${maxPrep}h).`
        );
      }
    }

    // Validación general: Total Horas No Lectivas <= Total Horas Lectivas
    const totalNoLectivas = (carga_no_lectiva?.actividades || []).reduce(
      (sum: number, a: any) => sum + (Number(a.horas) || 0),
      0,
    );

    if (totalNoLectivas > totalLectivas) {
      throw new BadRequestException(
        `El total de horas no lectivas (${totalNoLectivas}h) no puede sobrepasar el total de Trabajo Lectivo (${totalLectivas}h)`,
      );
    }

    return this.declaracionRepo.save(declaracion);
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
        "No se encontró un período académico válido",
      );
    }

    const declaracion = await this.declaracionRepo.findOne({
      where: { docente_id: docenteId, periodo_academico_id: periodoId },
    });

    if (!declaracion) {
      throw new NotFoundException("No se encontró declaración para enviar");
    }

    if (
      ![
        EstadoDeclaracionCarga.BORRADOR,
        EstadoDeclaracionCarga.NO_INICIADO,
        EstadoDeclaracionCarga.OBSERVADO_DPTO,
        EstadoDeclaracionCarga.OBSERVADO_FACULTAD,
      ].includes(declaracion.estado)
    ) {
      throw new BadRequestException(
        "La declaración ya ha sido enviada o no puede ser modificada",
      );
    }

    declaracion.estado = EstadoDeclaracionCarga.ENVIADO_DOCENTE;
    return this.declaracionRepo.save(declaracion);
  }

  private toMinutes(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
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
}
