import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { Grupo } from "../entities/grupo.entity";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { OfertaAcademica } from "../entities/oferta-academica.entity";
import { AsignacionLectiva } from "../entities/asignacion-lectiva.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { EstadoAsignacionLectiva } from "../common/enums/estado-asignacion-lectiva.enum";
import { TipoCursoPlan } from "../common/enums/tipo-curso-plan.enum";
import { EstadoCursoPlan } from "../common/enums/estado-curso-plan.enum";

const E2E_PREFIX = "E2E_";

async function findOrCreate<T>(
  repo: any,
  where: Record<string, any>,
  data: Partial<T>,
): Promise<T> {
  const existing = await repo.findOne({ where });
  if (existing) {
    Object.assign(existing, data);
    return repo.save(existing);
  }
  return repo.save(repo.create({ ...data, ...where }));
}

export async function seedCargaLectivaE2E(dataSource: DataSource): Promise<void> {
  console.log("🌱 Iniciando SEED E2E - FLUJO CARGA LECTIVA...");

  const usuarioRepo = dataSource.getRepository(Usuario);
  const docenteRepo = dataSource.getRepository(Docente);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const grupoRepo = dataSource.getRepository(Grupo);
  const planRepo = dataSource.getRepository(PlanEstudios);
  const cursoPlanRepo = dataSource.getRepository(CursoPlanEstudios);
  const ofertaRepo = dataSource.getRepository(OfertaAcademica);
  const asignacionRepo = dataSource.getRepository(AsignacionLectiva);
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const declaracionRepo = dataSource.getRepository(DeclaracionCargaHoraria);
  const parametrosRepo = dataSource.getRepository(ParametrosCarga);
  const facultadRepo = dataSource.getRepository(Facultad);
  const escuelaRepo = dataSource.getRepository(Escuela);
  const departamentoRepo = dataSource.getRepository(Departamento);

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // ═══════════════════════════════════════════════════════════════
  // 1. ESTRUCTURA ACADÉMICA BASE
  // ═══════════════════════════════════════════════════════════════

  console.log("🏗️  Creando estructura académica base...");

  const periodo = await findOrCreate(periodoRepo, PeriodoAcademico, {
    codigo: `${E2E_PREFIX}2026-I`,
  }, {
    nombre: "Semestre 2026-I E2E",
    fecha_inicio: new Date("2026-03-16"),
    fecha_fin: new Date("2026-07-31"),
    estado: EstadoPeriodo.ASIGNACION_HORARIOS,
    activo: true,
    modo_asignacion: ModoAsignacion.MIXTA,
  });
  console.log(`   Período: ${periodo.codigo}`);

  const facultad = await findOrCreate(facultadRepo, Facultad, {
    codigo: `${E2E_PREFIX}FI`,
  }, {
    nombre: "Facultad de Ingeniería E2E",
    activo: true,
  });
  console.log(`   Facultad: ${facultad.codigo}`);

  const escuela = await findOrCreate(escuelaRepo, Escuela, {
    codigo: `${E2E_PREFIX}IS`,
  }, {
    nombre: "Ingeniería de Sistemas E2E",
    activo: true,
    facultad_id: facultad.id,
  });
  console.log(`   Escuela: ${escuela.codigo}`);

  const departamento = await findOrCreate(departamentoRepo, Departamento, {
    codigo: `${E2E_PREFIX}DS`,
  }, {
    nombre: "Depto. de Sistemas E2E",
    activo: true,
    escuela_id: escuela.id,
  });
  console.log(`   Departamento: ${departamento.codigo}`);

  // ═══════════════════════════════════════════════════════════════
  // 2. USUARIOS DE PRUEBA (ROLES)
  // ═══════════════════════════════════════════════════════════════

  console.log("👥 Creando usuarios de prueba...");

  const rolesUsuarios = [
    { email: `${E2E_PREFIX}admin@unt.edu.pe`, nombre: "Admin E2E", rol: RolUsuario.ADMINISTRADOR_SISTEMA },
    { email: `${E2E_PREFIX}secretaria@unt.edu.pe`, nombre: "Secretaria E2E", rol: RolUsuario.SECRETARIA },
    { email: `${E2E_PREFIX}coordinador@unt.edu.pe`, nombre: "Coordinador E2E", rol: RolUsuario.COORDINADOR_ACADEMICO },
    { email: `${E2E_PREFIX}director_dpto@unt.edu.pe`, nombre: "Director Depto E2E", rol: RolUsuario.DIRECTOR_DEPARTAMENTO },
    { email: `${E2E_PREFIX}decano@unt.edu.pe`, nombre: "Decano E2E", rol: RolUsuario.DECANO },
  ];

  const dbUsuarios: Record<string, Usuario> = {};
  for (const u of rolesUsuarios) {
    const saved = await findOrCreate(usuarioRepo, Usuario, { email: u.email }, {
      nombre: u.nombre,
      password_hash: passwordHash,
      rol: u.rol,
      activo: true,
      debe_cambiar_password: true,
      facultad_id: facultad.id,
      escuela_id: escuela.id,
      departamento_id: departamento.id,
    });
    dbUsuarios[u.rol] = saved;
  }
  console.log(`   ${rolesUsuarios.length} usuarios de roles creados`);

  // ═══════════════════════════════════════════════════════════════
  // 3. AMBIENTES (4 tipologías para escenarios)
  // ═══════════════════════════════════════════════════════════════

  console.log("🏠 Creando ambientes E2E...");

  const ambientesData = [
    { codigo: `${E2E_PREFIX}AULA-GRANDE`, nombre: "Aula Grande E2E", tipo: TipoAmbiente.AULA, capacidad: 60, piso: 1, pabellon: "A", edificio: "Edificio A", sede: "Campus Central", equipamiento: "Proyector, Pizarra, Aire acondicionado", estado: EstadoAmbiente.ACTIVO, coordX: 25, coordY: 35 },
    { codigo: `${E2E_PREFIX}AULA-PEQUENA`, nombre: "Aula Pequeña E2E", tipo: TipoAmbiente.AULA, capacidad: 25, piso: 2, pabellon: "A", edificio: "Edificio A", sede: "Campus Central", equipamiento: "Proyector, Pizarra", estado: EstadoAmbiente.ACTIVO, coordX: 28, coordY: 32 },
    { codigo: `${E2E_PREFIX}LAB-1`, nombre: "Laboratorio 1 E2E", tipo: TipoAmbiente.LABORATORIO, capacidad: 30, piso: 1, pabellon: "B", edificio: "Edificio B - Labs", sede: "Campus Central", equipamiento: "30 PCs, Proyector, Red cableada, Aire acondicionado", estado: EstadoAmbiente.ACTIVO, coordX: 45, coordY: 55 },
    { codigo: `${E2E_PREFIX}AULA-AFORO-INSUF`, nombre: "Aula Aforo Insuficiente E2E", tipo: TipoAmbiente.AULA, capacidad: 20, piso: 3, pabellon: "A", edificio: "Edificio A", sede: "Campus Central", equipamiento: "Proyector, Pizarra", estado: EstadoAmbiente.ACTIVO, coordX: 31, coordY: 30 },
  ];

  const dbAmbientes: Record<string, Ambiente> = {};
  for (const a of ambientesData) {
    const saved = await findOrCreate(ambienteRepo, Ambiente, { codigo: a.codigo }, {
      ...a,
      activo: true,
    });
    dbAmbientes[a.codigo] = saved;
  }
  console.log(`   ${ambientesData.length} ambientes creados`);

  // ═══════════════════════════════════════════════════════════════
  // 4. DOCENTES DE PRUEBA (4 perfiles distintos)
  // ═══════════════════════════════════════════════════════════════

  console.log("👨‍🏫 Creando docentes E2E...");

  const docentesData = [
    {
      codigo: `${E2E_PREFIX}DOC-D1-LIBRE`,
      dni: `${E2E_PREFIX}11111111`,
      ibm: 9001,
      nombres: "Docente",
      apellidos: "Uno Libre",
      email: `${E2E_PREFIX}docente1.libre@unt.edu.pe`,
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
      horas_lectivas_max: 22,
      horas_lectivas_min: 16,
      horas_max_totales: 40,
    },
    {
      codigo: `${E2E_PREFIX}DOC-D2-NOLECTIVA`,
      dni: `${E2E_PREFIX}22222222`,
      ibm: 9002,
      nombres: "Docente",
      apellidos: "Dos NoLectiva",
      email: `${E2E_PREFIX}docente2.nol@unt.edu.pe`,
      categoria: CategoriaDocente.ASOCIADO,
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
      horas_lectivas_max: 22,
      horas_lectivas_min: 16,
      horas_max_totales: 40,
    },
    {
      codigo: `${E2E_PREFIX}DOC-D3-PARCIAL`,
      dni: `${E2E_PREFIX}33333333`,
      ibm: 9003,
      nombres: "Docente",
      apellidos: "Tres Parcial",
      email: `${E2E_PREFIX}docente3.parcial@unt.edu.pe`,
      categoria: CategoriaDocente.AUXILIAR,
      tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO,
      modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
      horas_lectivas_max: 22,
      horas_lectivas_min: 16,
      horas_max_totales: 40,
    },
    {
      codigo: `${E2E_PREFIX}DOC-D4-RESTRICCION`,
      dni: `${E2E_PREFIX}44444444`,
      ibm: 9004,
      nombres: "Docente",
      apellidos: "Cuatro Restriccion",
      email: `${E2E_PREFIX}docente4.res@unt.edu.pe`,
      categoria: CategoriaDocente.SIN_CATEGORIA,
      tipo_docente: TipoDocente.CONTRATADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      modalidad: ModalidadDocente.TIEMPO_PARCIAL_20,
      horas_lectivas_max: 12,
      horas_lectivas_min: 8,
      horas_max_totales: 20,
    },
  ];

  const dbDocentes: Record<string, Docente> = {};
  for (const d of docentesData) {
    let usuario = await usuarioRepo.findOne({ where: { email: d.email } });
    if (!usuario) {
      usuario = await usuarioRepo.save(usuarioRepo.create({
        nombre: `${d.nombres} ${d.apellidos}`,
        email: d.email,
        password_hash: passwordHash,
        rol: RolUsuario.DOCENTE,
        activo: true,
        debe_cambiar_password: true,
      }));
    }

    const saved = await findOrCreate(docenteRepo, Docente, { codigo: d.codigo }, {
      ...d,
      usuario_id: usuario.id,
      departamento_id: departamento.id,
      facultad_id: facultad.id,
      activo: true,
      fecha_ingreso: new Date("2010-01-01"),
      telefono: null,
      firebase_token: null,
      firma_url: null,
      foto_url: null,
      suspension_vigente: false,
      horas_asignadas: 0,
      horas_no_lectivas: 0,
    });
    dbDocentes[d.codigo] = saved;
  }
  console.log(`   ${docentesData.length} docentes creados`);

  // ═══════════════════════════════════════════════════════════════
  // 5. PARÁMETROS DE CARGA (para todas las combinaciones)
  // ═══════════════════════════════════════════════════════════════

  console.log("📋 Creando parámetros de carga E2E...");

  const modalidades = [
    ModalidadDocente.DEDICACION_EXCLUSIVA,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
    ModalidadDocente.TIEMPO_PARCIAL_12,
    ModalidadDocente.TIEMPO_PARCIAL_10,
    ModalidadDocente.TIEMPO_PARCIAL_8,
  ];
  const categorias = [
    CategoriaDocente.PRINCIPAL,
    CategoriaDocente.ASOCIADO,
    CategoriaDocente.AUXILIAR,
    CategoriaDocente.SIN_CATEGORIA,
  ];
  const tiposDocente = [TipoDocente.ORDINARIO, TipoDocente.CONTRATADO];

  let paramsCount = 0;
  for (const modalidad of modalidades) {
    for (const categoria of categorias) {
      for (const tipoDocente of tiposDocente) {
        const exists = await parametrosRepo.findOne({
          where: {
            periodo_academico: periodo.codigo,
            modalidad,
            categoria,
            tipo_docente: tipoDocente,
          },
        });
        if (!exists) {
          await parametrosRepo.save(parametrosRepo.create({
            periodo_academico: periodo.codigo,
            modalidad,
            categoria,
            tipo_docente: tipoDocente,
            horas_min_semanal: 4,
            horas_max_semanal: modalidad === ModalidadDocente.DEDICACION_EXCLUSIVA ? 44
              : modalidad === ModalidadDocente.TIEMPO_COMPLETO_40 ? 40
              : modalidad === ModalidadDocente.TIEMPO_PARCIAL_20 ? 24
              : modalidad === ModalidadDocente.TIEMPO_PARCIAL_12 ? 16
              : 12,
            cursos_min_docente: 1,
            cursos_max_docente: modalidad === ModalidadDocente.DEDICACION_EXCLUSIVA ? 9
              : modalidad === ModalidadDocente.TIEMPO_COMPLETO_40 ? 8
              : 5,
          }));
          paramsCount++;
        }
      }
    }
  }
  console.log(`   ${paramsCount} parámetros de carga creados/actualizados`);

  // ═══════════════════════════════════════════════════════════════
  // 6. PLAN DE ESTUDIOS E2E
  // ═══════════════════════════════════════════════════════════════

  console.log("📚 Creando Plan de Estudios E2E...");

  const plan = await findOrCreate(planRepo, PlanEstudios, {
    codigo: `${E2E_PREFIX}2018`,
  }, {
    nombre: "Plan de Estudios 2018 E2E",
    descripcion: "Plan E2E para prueba flujo carga lectiva",
    resolucion: "R.N° E2E-2018-UNT",
    anio: 2018,
    activo: true,
    escuela_id: escuela.id,
  });
  console.log(`   Plan: ${plan.codigo}`);

  // ═══════════════════════════════════════════════════════════════
  // 7. CURSOS CATÁLOGO (maestros)
  // ═══════════════════════════════════════════════════════════════

  console.log("📖 Creando cursos catálogo E2E...");

  const cursosCatalogoData = [
    { codigo: `${E2E_PREFIX}C1-SIMPLE`, nombre: "Curso Simple Teoría E2E", creditos: 3, ht: 3, hp: 0, hl: 0, ciclo: 1, tiene_lab: false },
    { codigo: `${E2E_PREFIX}C1-MIXTO`, nombre: "Curso Mixto Teoría+Práctica E2E", creditos: 4, ht: 2, hp: 2, hl: 0, ciclo: 1, tiene_lab: false },
    { codigo: `${E2E_PREFIX}C1-CONLAB`, nombre: "Curso con Laboratorio E2E", creditos: 3, ht: 1, hp: 0, hl: 2, ciclo: 1, tiene_lab: true },
    { codigo: `${E2E_PREFIX}C2-CONFLICTO-DOC`, nombre: "Curso Conflicto Docente E2E", creditos: 3, ht: 2, hp: 0, hl: 0, ciclo: 2, tiene_lab: false },
    { codigo: `${E2E_PREFIX}C2-CONFLICTO-AMB`, nombre: "Curso Conflicto Ambiente E2E", creditos: 3, ht: 2, hp: 0, hl: 0, ciclo: 2, tiene_lab: false },
    { codigo: `${E2E_PREFIX}C2-DOS-GRUPOS`, nombre: "Curso Dos Grupos E2E", creditos: 4, ht: 3, hp: 0, hl: 0, ciclo: 2, tiene_lab: false },
    { codigo: `${E2E_PREFIX}C3-AFORO`, nombre: "Curso Aforo Insuficiente E2E", creditos: 3, ht: 3, hp: 0, hl: 0, ciclo: 3, tiene_lab: false },
  ];

  const dbCursos: Record<string, Curso> = {};
  for (const c of cursosCatalogoData) {
    const saved = await findOrCreate(cursoRepo, Curso, { codigo: c.codigo }, {
      nombre: c.nombre,
      creditos: c.creditos,
      horas_teoria: c.ht,
      horas_practica: c.hp,
      horas_laboratorio: c.hl,
      ciclo: c.ciclo,
      tiene_laboratorio: c.tiene_lab,
      prerequisitos: null,
      activo: true,
      departamento_id: departamento.id,
    });
    dbCursos[c.codigo] = saved;
  }
  console.log(`   ${cursosCatalogoData.length} cursos catálogo creados`);

  // ═══════════════════════════════════════════════════════════════
  // 8. CURSO PLAN ESTUDIOS (vinculación Plan + Curso)
  // ═══════════════════════════════════════════════════════════════

  console.log("🔗 Creando CursoPlanEstudios E2E...");

  const cursosPlanData = [
    { curso: `${E2E_PREFIX}C1-SIMPLE`, ciclo: 1, tipo: TipoCursoPlan.OBLIGATORIO_GENERAL, ht: 3, hp: 0, hl: 0, cred: 3 },
    { curso: `${E2E_PREFIX}C1-MIXTO`, ciclo: 1, tipo: TipoCursoPlan.OBLIGATORIO_PROFESIONAL, ht: 2, hp: 2, hl: 0, cred: 4 },
    { curso: `${E2E_PREFIX}C1-CONLAB`, ciclo: 1, tipo: TipoCursoPlan.ESPECIALIDAD, ht: 1, hp: 0, hl: 2, cred: 3 },
    { curso: `${E2E_PREFIX}C2-CONFLICTO-DOC`, ciclo: 2, tipo: TipoCursoPlan.OBLIGATORIO_GENERAL, ht: 2, hp: 0, hl: 0, cred: 3 },
    { curso: `${E2E_PREFIX}C2-CONFLICTO-AMB`, ciclo: 2, tipo: TipoCursoPlan.OBLIGATORIO_PROFESIONAL, ht: 2, hp: 0, hl: 0, cred: 3 },
    { curso: `${E2E_PREFIX}C2-DOS-GRUPOS`, ciclo: 2, tipo: TipoCursoPlan.ESPECIALIDAD, ht: 3, hp: 0, hl: 0, cred: 4 },
    { curso: `${E2E_PREFIX}C3-AFORO`, ciclo: 3, tipo: TipoCursoPlan.OBLIGATORIO_GENERAL, ht: 3, hp: 0, hl: 0, cred: 3 },
  ];

  const dbCursosPlan: Record<string, CursoPlanEstudios> = {};
  for (const cp of cursosPlanData) {
    const curso = dbCursos[cp.curso];
    const saved = await findOrCreate(cursoPlanRepo, CursoPlanEstudios, {
      plan_estudios_id: plan.id,
      curso_id: curso.id,
    }, {
      plan_estudios_id: plan.id,
      curso_id: curso.id,
      ciclo: cp.ciclo,
      tipo_curso: cp.tipo,
      horas_teoria: cp.ht,
      horas_practica: cp.hp,
      horas_laboratorio: cp.hl,
      creditos: cp.cred,
      estado: EstadoCursoPlan.ACTIVO,
      prerequisitos: [],
    });
    dbCursosPlan[cp.curso] = saved;
  }
  console.log(`   ${cursosPlanData.length} CursoPlanEstudios creados`);

  // ═══════════════════════════════════════════════════════════════
  // 9. OFERTA ACADÉMICA (por tipo_clase con horas > 0)
  // ═══════════════════════════════════════════════════════════════

  console.log("📋 Generando OfertaAcademica E2E...");

  let ofertaCount = 0;
  for (const [key, cp] of Object.entries(dbCursosPlan)) {
    const tipos: { tipo: TipoClase; horas: number }[] = [
      { tipo: TipoClase.TEORIA, horas: cp.horas_teoria },
      { tipo: TipoClase.PRACTICA, horas: cp.horas_practica },
      { tipo: TipoClase.LABORATORIO, horas: cp.horas_laboratorio },
    ];
    for (const { tipo, horas } of tipos) {
      if (horas <= 0) continue;
      const exists = await ofertaRepo.findOne({
        where: { periodo_id: periodo.id, curso_plan_id: cp.id, tipo_clase: tipo },
      });
      if (!exists) {
        await ofertaRepo.save(ofertaRepo.create({
          periodo_id: periodo.id,
          curso_plan_id: cp.id,
          tipo_clase: tipo,
          secciones: 1,
          activo: true,
        }));
        ofertaCount++;
      }
    }
  }
  console.log(`   ${ofertaCount} ofertas académicas creadas`);

  // ═══════════════════════════════════════════════════════════════
  // 10. GRUPOS (uno por curso_plan + tipo_clase ofertado)
  // ═══════════════════════════════════════════════════════════════

  console.log("👥 Creando Grupos E2E...");

  const dbGrupos: Record<string, Grupo> = {};
  let grupoCounter = 1;

  for (const [key, cp] of Object.entries(dbCursosPlan)) {
    const curso = dbCursos[key];
    const ofertas = await ofertaRepo.find({
      where: { periodo_id: periodo.id, curso_plan_id: cp.id, activo: true },
    });

    for (const oferta of ofertas) {
      const tipoStr = oferta.tipo_clase === TipoClase.TEORIA ? "TEO"
        : oferta.tipo_clase === TipoClase.PRACTICA ? "PRA" : "LAB";
      const codigoGrupo = `${curso.codigo}-${tipoStr}-G1`;
      const nombreGrupo = `${curso.nombre} - ${oferta.tipo_clase} - Grupo 1`;

      const cupo = oferta.tipo_clase === TipoClase.LABORATORIO ? 30 : 40;

      const grupo = await findOrCreate(grupoRepo, Grupo, {
        codigo: codigoGrupo,
        periodo_academico_id: periodo.id,
        curso_id: curso.id,
        tipo: oferta.tipo_clase,
      }, {
        nombre: nombreGrupo,
        ciclo: cp.ciclo,
        cupo_maximo: cupo,
        periodo_academico_id: periodo.id,
        curso_id: curso.id,
        tipo: oferta.tipo_clase,
      });

      dbGrupos[`${cp.curso_id}-${oferta.tipo_clase}`] = grupo;
      grupoCounter++;
    }
  }
  console.log(`   ${grupoCounter - 1} grupos creados`);

  // ═══════════════════════════════════════════════════════════════
  // 11. ASIGNACIONES LECTIVAS (escenarios específicos)
  // ═══════════════════════════════════════════════════════════════

  console.log("📝 Creando Asignaciones Lectivas E2E (escenarios)...");

  const docente1 = dbDocentes[`${E2E_PREFIX}DOC-D1-LIBRE`];
  const docente2 = dbDocentes[`${E2E_PREFIX}DOC-D2-NOLECTIVA`];
  const docente3 = dbDocentes[`${E2E_PREFIX}DOC-D3-PARCIAL`];
  const docente4 = dbDocentes[`${E2E_PREFIX}DOC-D4-RESTRICCION`];
  const admin = dbUsuarios[RolUsuario.ADMINISTRADOR_SISTEMA];

  const getGrupo = (cursoKey: string, tipo: TipoClase) => dbGrupos[`${cursoKey}-${tipo}`];

  const asignacionesData = [
    {
      key: "AL-01-HAPPY",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-SIMPLE`],
      grupo: getGrupo(`${E2E_PREFIX}C1-SIMPLE`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 3,
      nro_alumnos: 30,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "✅ Happy path - lista para programar",
    },
    {
      key: "AL-02-HAPPY-PRA",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-MIXTO`],
      grupo: getGrupo(`${E2E_PREFIX}C1-MIXTO`, TipoClase.PRACTICA),
      tipo_clase: TipoClase.PRACTICA,
      seccion: "G1",
      horas_asignadas: 2,
      nro_alumnos: 25,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "✅ Happy path PRA - lista para programar",
    },
    {
      key: "AL-03-PENDIENTE",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-MIXTO`],
      grupo: getGrupo(`${E2E_PREFIX}C1-MIXTO`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 2,
      nro_alumnos: 25,
      estado: EstadoAsignacionLectiva.PENDIENTE,
      descripcion: "⏳ PENDIENTE - no programable",
    },
    {
      key: "AL-04-NOLECTIVA",
      docente: docente2,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-CONLAB`],
      grupo: getGrupo(`${E2E_PREFIX}C1-CONLAB`, TipoClase.LABORATORIO),
      tipo_clase: TipoClase.LABORATORIO,
      seccion: "G1",
      horas_asignadas: 2,
      nro_alumnos: 20,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "⚠️ Docente con carga no lectiva aprobada",
    },
    {
      key: "AL-05-PARCIAL",
      docente: docente3,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C2-CONFLICTO-DOC`],
      grupo: getGrupo(`${E2E_PREFIX}C2-CONFLICTO-DOC`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 3,
      nro_alumnos: 35,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "🔄 Parcialmente programado (falta 2h)",
    },
    {
      key: "AL-06-DOS-GRUPOS",
      docente: docente3,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C2-DOS-GRUPOS`],
      grupo: getGrupo(`${E2E_PREFIX}C2-DOS-GRUPOS`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G2",
      horas_asignadas: 3,
      nro_alumnos: 35,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "🔄 Segundo grupo mismo docente",
    },
    {
      key: "AL-07-AFORO",
      docente: docente4,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C3-AFORO`],
      grupo: getGrupo(`${E2E_PREFIX}C3-AFORO`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 3,
      nro_alumnos: 45,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "🚫 nro_alumnos=45 > cap Aula Pequeña (25)",
    },
    {
      key: "AL-08-CONFLICTO-DOC",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C2-CONFLICTO-DOC`],
      grupo: getGrupo(`${E2E_PREFIX}C2-CONFLICTO-DOC`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 2,
      nro_alumnos: 30,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "⚔️ Conflicto docente si mismo día/hora que AL-01",
    },
    {
      key: "AL-09-CONFLICTO-AMB",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C2-CONFLICTO-AMB`],
      grupo: getGrupo(`${E2E_PREFIX}C2-CONFLICTO-AMB`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G1",
      horas_asignadas: 2,
      nro_alumnos: 30,
      estado: EstadoAsignacionLectiva.CONFIRMADO,
      descripcion: "⚔️ Conflicto ambiente si mismo ambiente que AL-01",
    },
    {
      key: "AL-10-RECHAZADO",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-SIMPLE`],
      grupo: getGrupo(`${E2E_PREFIX}C1-SIMPLE`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G2",
      horas_asignadas: 3,
      nro_alumnos: 30,
      estado: EstadoAsignacionLectiva.RECHAZADO,
      observaciones: "Rechazado por prueba E2E",
      descripcion: "🔴 RECHAZADO - bloqueado",
    },
    {
      key: "AL-11-REABIERTO",
      docente: docente1,
      cursoPlan: dbCursosPlan[`${E2E_PREFIX}C1-SIMPLE`],
      grupo: getGrupo(`${E2E_PREFIX}C1-SIMPLE`, TipoClase.TEORIA),
      tipo_clase: TipoClase.TEORIA,
      seccion: "G3",
      horas_asignadas: 3,
      nro_alumnos: 30,
      estado: EstadoAsignacionLectiva.PENDIENTE,
      descripcion: "🔓 Reabierto - editable de nuevo",
    },
  ];

  const dbAsignaciones: Record<string, AsignacionLectiva> = {};
  for (const a of asignacionesData) {
    const where = {
      docente_id: a.docente.id,
      curso_plan_id: a.cursoPlan.id,
      periodo_id: periodo.id,
      tipo_clase: a.tipo_clase,
      seccion: a.seccion,
    };

    let asignacion = await asignacionRepo.findOne({ where });

    if (!asignacion) {
      asignacion = asignacionRepo.create({
        ...where,
        grupo_id: a.grupo?.id ?? null,
        horas_asignadas: a.horas_asignadas,
        nro_alumnos: a.nro_alumnos,
        estado: a.estado,
        observaciones: a.observaciones ?? null,
        asignado_por_id: admin.id,
        confirmado_por_id: a.estado === EstadoAsignacionLectiva.CONFIRMADO ? admin.id : null,
        confirmado_en: a.estado === EstadoAsignacionLectiva.CONFIRMADO ? new Date() : null,
      });
    } else {
      Object.assign(asignacion, {
        grupo_id: a.grupo?.id ?? null,
        horas_asignadas: a.horas_asignadas,
        nro_alumnos: a.nro_alumnos,
        estado: a.estado,
        observaciones: a.observaciones ?? null,
        confirmado_por_id: a.estado === EstadoAsignacionLectiva.CONFIRMADO ? admin.id : null,
        confirmado_en: a.estado === EstadoAsignacionLectiva.CONFIRMADO ? new Date() : null,
      });
    }

    const saved = await asignacionRepo.save(asignacion);
    dbAsignaciones[a.key] = saved;
    console.log(`   ${a.key}: ${a.descripcion} (ID: ${saved.id})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 12. CARGA NO LECTIVA (Declaración aprobada para D2)
  // ═══════════════════════════════════════════════════════════════

  console.log("📄 Creando Declaración Carga No Lectiva (D2 - APROBADO_FACULTAD)...");

  const declaracionD2 = await findOrCreate(declaracionRepo, DeclaracionCargaHoraria, {
    docente_id: docente2.id,
    periodo_academico_id: periodo.id,
  }, {
    departamento_id: departamento.id,
    facultad_id: facultad.id,
    sede: "Facultad de Ingeniería E2E",
    estado: EstadoDeclaracionCarga.APROBADO_FACULTAD,
    fecha_firma_docente: new Date("2026-03-20"),
    fecha_aprobacion_dpto: new Date("2026-03-25"),
    fecha_aprobacion_facultad: new Date("2026-03-28"),
    carga_no_lectiva: {
      actividades: [
        {
          id: 1,
          nombre: "Investigación",
          descripcion: "Proyecto de investigación E2E",
          tipo: "INVESTIGACION",
          horas_semanales: 8,
          horarios: [
            { dia: 1, hora_inicio: "14:00", hora_fin: "16:00" },
            { dia: 3, hora_inicio: "14:00", hora_fin: "16:00" },
            { dia: 5, hora_inicio: "10:00", hora_fin: "12:00" },
          ],
        },
        {
          id: 2,
          nombre: "Extensión Universitaria",
          descripcion: "Actividades de extensión E2E",
          tipo: "EXTENSION",
          horas_semanales: 4,
          horarios: [
            { dia: 2, hora_inicio: "08:00", hora_fin: "10:00" },
            { dia: 4, hora_inicio: "08:00", hora_fin: "10:00" },
          ],
        },
      ],
    },
    observaciones: "Declaración E2E para probar conflictos con carga lectiva",
  });
  console.log(`   Declaración D2: ${declaracionD2.estado} (ID: ${declaracionD2.id})`);

  // ═══════════════════════════════════════════════════════════════
  // 13. HORARIOS PARCIALES (para AL-05: 1h programada de 3h)
  // ═══════════════════════════════════════════════════════════════

  console.log("⏰ Creando horarios parciales previos (AL-05)...");

  const al05 = dbAsignaciones["AL-05-PARCIAL"];
  const aulaGrande = dbAmbientes[`${E2E_PREFIX}AULA-GRANDE`];
  const grupo05 = getGrupo(`${E2E_PREFIX}C2-CONFLICTO-DOC`, TipoClase.TEORIA);

  const horarioExistente = await findOrCreate(horarioRepo, HorarioAsignado, {
    asignacion_lectiva_id: al05.id,
    dia: 1,
    hora_inicio: "07:00:00",
  }, {
    docente_id: docente3.id,
    curso_id: dbCursos[`${E2E_PREFIX}C2-CONFLICTO-DOC`].id,
    ambiente_id: aulaGrande.id,
    grupo_id: grupo05.id,
    periodo: periodo.codigo,
    dia: 1,
    hora_inicio: "07:00:00",
    hora_fin: "08:00:00",
    tipo_clase: TipoClase.TEORIA,
    estado: EstadoHorario.BORRADOR,
    origen: OrigenHorario.ASIGNACION_LECTIVA,
    asignacion_lectiva_id: al05.id,
  });
  console.log(`   Horario previo AL-05: Lunes 07:00-08:00 (ID: ${horarioExistente.id})`);

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════

  console.log("\n============================================");
  console.log("✅ SEED E2E CARGA LECTIVA COMPLETADO");
  console.log("============================================");
  console.log(`Período: ${periodo.codigo} (${periodo.estado})`);
  console.log(`Plan: ${plan.codigo} (${plan.nombre})`);
  console.log(`Cursos Plan: ${Object.keys(dbCursosPlan).length}`);
  console.log(`Ofertas: ${ofertaCount}`);
  console.log(`Grupos: ${grupoCounter - 1}`);
  console.log(`Asignaciones: ${Object.keys(dbAsignaciones).length}`);
  console.log(`Docentes: ${Object.keys(dbDocentes).length}`);
  console.log(`Ambientes: ${Object.keys(dbAmbientes).length}`);
  console.log(`Usuarios Roles: ${Object.keys(dbUsuarios).length}`);
  console.log("============================================\n");
}

// Ejecutable directo
if (require.main === module) {
  const { DataSource } = require("typeorm");
  const { config } = require("dotenv");
  const { join } = require("path");

  config({ path: join(__dirname, "..", "..", ".env") });

  const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST ?? "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
    database: process.env.DATABASE_NAME ?? "horarios_unt",
    username: process.env.DATABASE_USER ?? "unt_user",
    password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
    entities: [join(__dirname, "../entities/**/*.entity{.ts,.js}")],
    synchronize: false,
    logging: false,
  });

  AppDataSource.initialize()
    .then(async () => {
      try {
        await seedCargaLectivaE2E(AppDataSource);
      } catch (error) {
        console.error("❌ Error en seed E2E:", error);
        process.exit(1);
      } finally {
        await AppDataSource.destroy();
      }
    })
    .catch((err) => {
      console.error("❌ Error conectando:", err);
      process.exit(1);
    });
}