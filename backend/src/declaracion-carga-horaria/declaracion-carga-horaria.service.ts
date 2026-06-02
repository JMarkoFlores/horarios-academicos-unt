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

  async obtenerPorId(id: number): Promise<DeclaracionVista> {
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
    const estadoObjetivo = this.resolverEstadoObservacion(usuario.rol);
    this.validarTransicionEstado(declaracion.estado, estadoObjetivo);

    declaracion.estado = estadoObjetivo;
    declaracion.observaciones = dto.observaciones ?? declaracion.observaciones;
    declaracion.usuario_firmante_id = usuario.id;

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
      RolUsuario.ADMINISTRADOR_SISTEMA,
    ]);

    const declaracion = await this.obtenerEntidadEditable(id);
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
      .andWhere("horario.estado = :estado", {
        estado: EstadoHorario.CONFIRMADO,
      })
      .orderBy("horario.dia", "ASC")
      .addOrderBy("horario.hora_inicio", "ASC")
      .getMany();

    const horariosConfirmados = horarios.filter(
      (horario) => horario.estado === EstadoHorario.CONFIRMADO,
    );

    const registros = horariosConfirmados.map((horario) =>
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
    if (!periodoId) return [];

    const docenteCursos = await this.docenteCursoRepo.find({
      where: { docenteId, periodoId },
      relations: ["curso"],
    });

    return docenteCursos.map((dc) => ({
      id: dc.id,
      codigo: dc.curso?.codigo || "",
      nombre: dc.curso?.nombre || "",
      seccion: "",
      escuela: "",
      ciclo: dc.curso?.ciclo || 0,
      nroAlumnos: 0,
      hrsTeo: dc.curso?.horas_teoria || 0,
      hrsPra: dc.curso?.horas_practica || 0,
      hrsLab: dc.curso?.horas_laboratorio || 0,
      totalHrs:
        (dc.curso?.horas_teoria || 0) +
        (dc.curso?.horas_practica || 0) +
        (dc.curso?.horas_laboratorio || 0),
    }));
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
    });
  }

  async guardarDeclaracion(dto: any): Promise<DeclaracionCargaHoraria> {
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
      relations: ["departamento", "facultad"],
    });
    if (!docente) {
      throw new NotFoundException("Docente no encontrado");
    }

    let declaracion = await this.declaracionRepo.findOne({
      where: { docente_id, periodo_academico_id: periodoId },
    });

    if (
      declaracion &&
      declaracion.estado !== EstadoDeclaracionCarga.BORRADOR &&
      declaracion.estado !== EstadoDeclaracionCarga.NO_INICIADO
    ) {
      throw new BadRequestException(
        "La declaración no puede ser modificada en este estado",
      );
    }

    if (!declaracion) {
      declaracion = this.declaracionRepo.create({
        docente_id,
        departamento_id: docente.departamento?.id || 1,
        facultad_id: docente.facultad?.id || 1,
        periodo_academico_id: periodoId,
        estado: EstadoDeclaracionCarga.BORRADOR,
      });
    }

    declaracion.carga_no_lectiva = carga_no_lectiva || null;
    declaracion.estado = estado || EstadoDeclaracionCarga.BORRADOR;

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
      declaracion.estado !== EstadoDeclaracionCarga.BORRADOR &&
      declaracion.estado !== EstadoDeclaracionCarga.NO_INICIADO
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
}
