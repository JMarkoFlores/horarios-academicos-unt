import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { Grupo } from "../entities/grupo.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { CampañaVentanas } from "../entities/campaña-ventanas.entity";
import {
  VentanaAtencion,
  EstadoVentanaAtencion,
} from "../entities/ventana-atencion.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";
import { EstadoCampaña } from "../common/enums/estado-campaña.enum";
import { CategoriaVentana } from "../common/enums/categoria-ventana.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { OrigenHorario } from "../common/enums/origen-horario.enum";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";

export async function seedAuto(dataSource: DataSource): Promise<void> {
  console.log("🌱 Iniciando seed AUTOMÁTICO...");
  const usuarioRepo = dataSource.getRepository(Usuario);
  const docenteRepo = dataSource.getRepository(Docente);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const turnoRepo = dataSource.getRepository(TurnoHorario);
  const diaActivoRepo = dataSource.getRepository(DiaActivo);
  const facultadRepo = dataSource.getRepository(Facultad);
  const escuelaRepo = dataSource.getRepository(Escuela);
  const departamentoRepo = dataSource.getRepository(Departamento);
  const grupoRepo = dataSource.getRepository(Grupo);
  const docenteCursoRepo = dataSource.getRepository(DocenteCurso);
  const campaniaRepo = dataSource.getRepository(CampañaVentanas);
  const ventanaRepo = dataSource.getRepository(VentanaAtencion);
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const declaracionRepo = dataSource.getRepository(DeclaracionCargaHoraria);

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // ── 1. USUARIOS DEL SISTEMA ──────────────────────────────
  const usuariosSistema = [
    {
      nombre: "Administrador del Sistema",
      email: "admin@unt.edu.pe",
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
    },
    {
      nombre: "Director de Escuela",
      email: "director@unt.edu.pe",
      rol: RolUsuario.DIRECTOR_ESCUELA,
    },
    {
      nombre: "Director de Departamento",
      email: "director.departamento@unt.edu.pe",
      rol: RolUsuario.DIRECTOR_DEPARTAMENTO,
    },
    {
      nombre: "Coordinador Académico",
      email: "coordinador@unt.edu.pe",
      rol: RolUsuario.COORDINADOR_ACADEMICO,
    },
    { nombre: "Decano", email: "decano@unt.edu.pe", rol: RolUsuario.DECANO },
    {
      nombre: "Secretaria",
      email: "secretaria@unt.edu.pe",
      rol: RolUsuario.SECRETARIA,
    },
    {
      nombre: "Operador de Horarios",
      email: "operador@unt.edu.pe",
      rol: RolUsuario.OPERADOR_HORARIOS,
    },
  ];
  const dbUsuariosSistema: Usuario[] = [];
  for (const u of usuariosSistema) {
    const saved = await usuarioRepo.save(
      usuarioRepo.create({ ...u, password_hash: passwordHash, activo: true }),
    );
    dbUsuariosSistema.push(saved);
  }
  console.log("✅ Usuarios del sistema creados");

  // ── 2. TURNOS ────────────────────────────────────────────
  await turnoRepo.save([
    turnoRepo.create({
      nombre: "Mañana",
      hora_inicio: "07:00",
      hora_fin: "14:00",
      activo: true,
    }),
    turnoRepo.create({
      nombre: "Tarde",
      hora_inicio: "14:00",
      hora_fin: "23:00",
      activo: true,
    }),
  ]);

  // ── 3. DÍAS ACTIVOS ──────────────────────────────────────
  const diasExistentes = await diaActivoRepo.count();
  if (diasExistentes === 0) {
    await diaActivoRepo.save([
      { dia_semana: 1, nombre: "Lunes", activo: true },
      { dia_semana: 2, nombre: "Martes", activo: true },
      { dia_semana: 3, nombre: "Miércoles", activo: true },
      { dia_semana: 4, nombre: "Jueves", activo: true },
      { dia_semana: 5, nombre: "Viernes", activo: true },
      { dia_semana: 6, nombre: "Sábado", activo: false },
      { dia_semana: 7, nombre: "Domingo", activo: false },
    ]);
  }

  // ── 4. PERÍODOS ACADÉMICOS ───────────────────────────────
  const periodos = await periodoRepo.save([
    periodoRepo.create({
      codigo: "2025-I",
      nombre: "Semestre 2025-I",
      fecha_inicio: new Date("2025-03-16"),
      fecha_fin: new Date("2025-07-31"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
      modo_asignacion: ModoAsignacion.VENTANAS,
    }),
    periodoRepo.create({
      codigo: "2025-II",
      nombre: "Semestre 2025-II",
      fecha_inicio: new Date("2025-08-16"),
      fecha_fin: new Date("2025-12-20"),
      estado: EstadoPeriodo.FINALIZADO,
      activo: false,
      modo_asignacion: ModoAsignacion.AUTOMATICA,
    }),
    periodoRepo.create({
      codigo: "2026-I",
      nombre: "Semestre 2026-I",
      fecha_inicio: new Date("2026-03-16"),
      fecha_fin: new Date("2026-07-31"),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
      modo_asignacion: ModoAsignacion.MIXTA,
    }),
  ]);
  const periodoActivo = periodos.find((p) => p.codigo === "2026-I")!;

  // ── 5. FACULTAD, ESCUELA, DEPARTAMENTO ───────────────────
  const facultad = await facultadRepo.save(
    facultadRepo.create({
      nombre: "Facultad de Ingeniería",
      codigo: "FI",
      activo: true,
    }),
  );
  const escuela = await escuelaRepo.save(
    escuelaRepo.create({
      nombre: "Ingeniería de Sistemas",
      codigo: "IS",
      activo: true,
      facultad,
    }),
  );
  const departamento = await departamentoRepo.save(
    departamentoRepo.create({
      nombre: "Depto. de Sistemas",
      codigo: "DS",
      activo: true,
      escuela,
    }),
  );

  // ── 5. AMBIENTES ─────────────────────────────────────────
  const ambientesData = [
    {
      codigo: "A-301",
      nombre: "Posgrado A-301",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
    },
    {
      codigo: "A-303",
      nombre: "Posgrado A-303",
      tipo: TipoAmbiente.AULA,
      capacidad: 35,
      piso: 3,
      pabellon: "A",
    },
    {
      codigo: "A-307",
      nombre: "Posgrado A-307",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 3,
      pabellon: "A",
    },
    {
      codigo: "A-311",
      nombre: "Posgrado A-311",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "A",
    },
    {
      codigo: "I-4",
      nombre: "I-4",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 1,
      pabellon: "A",
    },
    {
      codigo: "II-2",
      nombre: "II-2 (Pabellon Ing. Industrial)",
      tipo: TipoAmbiente.AULA,
      capacidad: 30,
      piso: 2,
      pabellon: "Industrial",
    },
    {
      codigo: "TALLER-CONFECCIONES",
      nombre: "Taller de Confecciones",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 2,
      pabellon: "C",
    },
    {
      codigo: "LAB-1",
      nombre: "Lab. 1",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
    },
    {
      codigo: "LAB-2",
      nombre: "Lab. 2",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      piso: 1,
      pabellon: "B",
    },
    {
      codigo: "LAB-3",
      nombre: "Lab. 3",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
    },
    {
      codigo: "LAB-4",
      nombre: "Lab. 4",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 2,
      pabellon: "B",
    },
    {
      codigo: "LAB-FIS",
      nombre: "Lab. Física",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 25,
      piso: 1,
      pabellon: "B",
    },
    {
      codigo: "AUDIOVISUALES",
      nombre: "Sala de Audiovisuales",
      tipo: TipoAmbiente.AULA,
      capacidad: 50,
      piso: 1,
      pabellon: "B",
    },
  ];
  const dbAmbientes: Ambiente[] = [];
  for (const a of ambientesData) {
    const ambiente = await ambienteRepo.save(
      ambienteRepo.create({ ...a, activo: true }),
    );
    dbAmbientes.push(ambiente);
  }
  console.log("✅ Ambientes creados");

  // ── 6. DOCENTES ──────────────────────────────────────────
  const docentesData = [
    {
      nombres: "Marcelino",
      apellidos: "Torres Villanueva",
      codigo: "DOC001",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Alberto",
      apellidos: "Mendoza de los Santos",
      codigo: "DOC002",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Paul",
      apellidos: "Cotrina Castellanos",
      codigo: "DOC003",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Bertha",
      apellidos: "Urtecho Zavaleta",
      codigo: "DOC004",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Jose Luis",
      apellidos: "Ponte Bejarano",
      codigo: "DOC005",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Jorge Luis",
      apellidos: "Rios Gonzales",
      codigo: "DOC006",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Segundo",
      apellidos: "Guibar Obeso",
      codigo: "DOC007",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Miguel",
      apellidos: "Ipanaque Zapata",
      codigo: "DOC008",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Martha",
      apellidos: "Cardoso",
      codigo: "DOC009",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Zoraida",
      apellidos: "Vidal Melgarejo",
      codigo: "DOC010",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Everson David",
      apellidos: "Agreda Gamboa",
      codigo: "DOC011",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.CONTRATADO,
      tc: TipoContrato.CONTRATADO,
    },
    {
      nombres: "Juan Carlos",
      apellidos: "Obando Roldán",
      codigo: "DOC012",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Marcos",
      apellidos: "Ferrer Reyna",
      codigo: "DOC013",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Teresita",
      apellidos: "Rojas Garcia",
      codigo: "DOC014",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Juan",
      apellidos: "Carrascal Cabanillas",
      codigo: "DOC015",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    // Ciclo III extras
    {
      nombres: "Vilma",
      apellidos: "Mendez Gil",
      codigo: "DOC016",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Sheyla Laura",
      apellidos: "Escobedo Rodriguez",
      codigo: "DOC017",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.CONTRATADO,
      tc: TipoContrato.CONTRATADO,
    },
    // Ciclo V extras
    {
      nombres: "Luis",
      apellidos: "Boy Chavil",
      codigo: "DOC018",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Robert Jerry",
      apellidos: "Sánchez Ticona",
      codigo: "DOC019",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Cesar",
      apellidos: "Arellano Salazar",
      codigo: "DOC020",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Camilo",
      apellidos: "Suárez Rebaza",
      codigo: "DOC021",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Marcos",
      apellidos: "Baca Lopez",
      codigo: "DOC022",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Ana",
      apellidos: "Cuadra Mitzugaray",
      codigo: "DOC023",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    // Ciclo VII extras
    {
      nombres: "Juan Pedro",
      apellidos: "Santos Fernández",
      codigo: "DOC024",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Ricardo",
      apellidos: "Mendoza Rivera",
      codigo: "DOC025",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Oscar Romel",
      apellidos: "Alcántara Moreno",
      codigo: "DOC026",
      cat: CategoriaDocente.AUXILIAR,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
    {
      nombres: "Jhoe",
      apellidos: "Gonzalez Vasquez",
      codigo: "DOC027",
      cat: CategoriaDocente.ASOCIADO,
      td: TipoDocente.CONTRATADO,
      tc: TipoContrato.CONTRATADO,
    },
    // Ciclo IX extras
    {
      nombres: "José",
      apellidos: "Gómez Ávila",
      codigo: "DOC028",
      cat: CategoriaDocente.PRINCIPAL,
      td: TipoDocente.ORDINARIO,
      tc: TipoContrato.NOMBRADO,
    },
  ];
  const modalidadesPool = [
    ModalidadDocente.DEDICACION_EXCLUSIVA,
    ModalidadDocente.TIEMPO_COMPLETO_40,
    ModalidadDocente.TIEMPO_PARCIAL_20,
  ];
  const dbDocentes: Docente[] = [];
  for (let i = 0; i < docentesData.length; i++) {
    const dd = docentesData[i];
    const d = await docenteRepo.save(
      docenteRepo.create({
        codigo: dd.codigo,
        nombres: dd.nombres,
        apellidos: dd.apellidos,
        email: `${dd.nombres.toLowerCase().replace(/\s+/g, ".")}.${dd.apellidos.toLowerCase().replace(/\s+/g, ".")}@unt.edu.pe`,
        categoria: dd.cat,
        tipo_docente: dd.td,
        tipo_contrato: dd.tc,
        modalidad: modalidadesPool[i % modalidadesPool.length],
        fecha_ingreso: new Date(2000 + (i % 20), 0, 1),
        activo: true,
      }),
    );
    const usuarioDocente = await usuarioRepo.save(
      usuarioRepo.create({
        nombre: `${d.nombres} ${d.apellidos}`,
        email: d.email,
        password_hash: passwordHash,
        rol: RolUsuario.DOCENTE,
        activo: true,
      }),
    );
    await docenteRepo.update(d.id, {
      usuario_id: usuarioDocente.id,
      departamento_id: departamento.id,
      facultad_id: facultad.id,
    });
    dbDocentes.push(d);
  }
  console.log(`✅ ${dbDocentes.length} docentes creados`);

  // ── 7. CURSOS (PLAN DE ESTUDIOS INGENIERÍA DE SISTEMAS) ──
  const cursosData = [
    // Ciclo I
    {
      codigo: "I-101",
      nombre: "Introducción a la Programación",
      creditos: 4,
      ht: 2,
      hp: 0,
      hl: 4,
      ciclo: 1,
      lab: true,
    },
    {
      codigo: "I-102",
      nombre: "Introducción a la Ingeniería de Sistemas",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    {
      codigo: "I-103",
      nombre: "Desarrollo Personal",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    {
      codigo: "I-104",
      nombre: "Desarrollo del Pensamiento Lógico Matemático",
      creditos: 4,
      ht: 3,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    {
      codigo: "I-105",
      nombre: "Lectura Crítica",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    {
      codigo: "I-106",
      nombre: "Introducción al Análisis Matemático",
      creditos: 4,
      ht: 3,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    {
      codigo: "I-107",
      nombre: "Estadística General",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 1,
      lab: false,
    },
    // Ciclo II
    {
      codigo: "II-201",
      nombre: "Programación Orientada a Objetos I",
      creditos: 4,
      ht: 2,
      hp: 0,
      hl: 4,
      ciclo: 2,
      lab: true,
    },
    {
      codigo: "II-202",
      nombre: "Cálculo I",
      creditos: 4,
      ht: 3,
      hp: 2,
      hl: 0,
      ciclo: 2,
      lab: false,
    },
    {
      codigo: "II-203",
      nombre: "Álgebra Lineal",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 2,
      lab: false,
    },
    {
      codigo: "II-204",
      nombre: "Comunicación Integral",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 2,
      lab: false,
    },
    // Ciclo III
    {
      codigo: "III-301",
      nombre: "Programación Orientada a Objetos II",
      creditos: 4,
      ht: 2,
      hp: 0,
      hl: 4,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-302",
      nombre: "Sistémica",
      creditos: 3,
      ht: 2,
      hp: 1,
      hl: 2,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-303",
      nombre: "Ingeniería Gráfica",
      creditos: 3,
      ht: 1,
      hp: 1,
      hl: 3,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-304",
      nombre: "Matemática Aplicada",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-305",
      nombre: "Estadística Aplicada",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-306",
      nombre: "Administración General",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 3,
      lab: false,
    },
    {
      codigo: "III-307",
      nombre: "Física Electrónica",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 3,
      lab: true,
    },
    {
      codigo: "III-308",
      nombre: "Psicología Organizacional",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 3,
      lab: false,
    },
    // Ciclo IV
    {
      codigo: "IV-401",
      nombre: "Estructuras de Datos",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 4,
      lab: true,
    },
    {
      codigo: "IV-402",
      nombre: "Ecuaciones Diferenciales",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 4,
      lab: false,
    },
    {
      codigo: "IV-403",
      nombre: "Matemática Discreta",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 4,
      lab: false,
    },
    // Ciclo V
    {
      codigo: "V-501",
      nombre: "Ingeniería de Datos I",
      creditos: 4,
      ht: 2,
      hp: 1,
      hl: 3,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-502",
      nombre: "Sistemas de Información",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 5,
      lab: false,
    },
    {
      codigo: "V-503",
      nombre: "Transformación digital",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-504",
      nombre: "Tecnología web",
      creditos: 3,
      ht: 1,
      hp: 1,
      hl: 3,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-505",
      nombre: "Arquitectura de computadoras",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-506",
      nombre: "Teleinformática",
      creditos: 3,
      ht: 1,
      hp: 2,
      hl: 2,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-507",
      nombre: "Investigación de Operaciones",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 5,
      lab: true,
    },
    {
      codigo: "V-508",
      nombre: "Contabilidad Gerencial",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 5,
      lab: true,
    },
    // Ciclo VI
    {
      codigo: "VI-601",
      nombre: "Sistemas Operativos",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 6,
      lab: true,
    },
    {
      codigo: "VI-602",
      nombre: "Redes de Computadoras",
      creditos: 4,
      ht: 2,
      hp: 0,
      hl: 4,
      ciclo: 6,
      lab: true,
    },
    {
      codigo: "VI-603",
      nombre: "Ingeniería de Software II",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 6,
      lab: false,
    },
    // Ciclo VII
    {
      codigo: "VII-701",
      nombre: "Ingeniería de Software I",
      creditos: 3,
      ht: 2,
      hp: 1,
      hl: 3,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-702",
      nombre: "Redes y Comunicaciones I",
      creditos: 4,
      ht: 2,
      hp: 2,
      hl: 3,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-703",
      nombre: "Negocios Electrónicos",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-704",
      nombre: "Gestión de Servicios de TI",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-705",
      nombre: "Metodología de la Investigación Científica",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 7,
      lab: false,
    },
    {
      codigo: "VII-706",
      nombre: "Administración de Base de Datos",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 3,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-707",
      nombre: "Planeamiento Estratégico de TI",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 7,
      lab: true,
    },
    {
      codigo: "VII-708",
      nombre: "Cadena de Suministros",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 7,
      lab: false,
    },
    // Ciclo VIII
    {
      codigo: "VIII-801",
      nombre: "Seguridad Informática",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 8,
      lab: true,
    },
    {
      codigo: "VIII-802",
      nombre: "Inteligencia Artificial",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 8,
      lab: true,
    },
    {
      codigo: "VIII-803",
      nombre: "Auditoría de Sistemas",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 0,
      ciclo: 8,
      lab: false,
    },
    // Ciclo IX
    {
      codigo: "IX-901",
      nombre: "Tesis I",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-902",
      nombre: "Analítica de Negocios",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-903",
      nombre: "Auditoría Informática",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 2,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-904",
      nombre: "Gestión de Proyectos de TI",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 3,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-905",
      nombre: "Emprendimiento Tecnológico",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-906",
      nombre: "Ingeniería Web",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 3,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-907",
      nombre: "Computación en la Nube",
      creditos: 3,
      ht: 2,
      hp: 2,
      hl: 3,
      ciclo: 9,
      lab: true,
    },
    {
      codigo: "IX-908",
      nombre: "Hackeo Ético",
      creditos: 3,
      ht: 2,
      hp: 0,
      hl: 2,
      ciclo: 9,
      lab: true,
    },
    // Ciclo X
    {
      codigo: "X-1001",
      nombre: "Proyecto de Tesis II",
      creditos: 4,
      ht: 2,
      hp: 4,
      hl: 0,
      ciclo: 10,
      lab: false,
    },
    {
      codigo: "X-1002",
      nombre: "Ética Profesional",
      creditos: 2,
      ht: 1,
      hp: 2,
      hl: 0,
      ciclo: 10,
      lab: false,
    },
    {
      codigo: "X-1003",
      nombre: "Legislación Informática",
      creditos: 2,
      ht: 1,
      hp: 2,
      hl: 0,
      ciclo: 10,
      lab: false,
    },
  ];
  const dbCursos: Curso[] = [];
  for (const c of cursosData) {
    const curso = await cursoRepo.save(
      cursoRepo.create({
        codigo: c.codigo,
        nombre: c.nombre,
        creditos: c.creditos,
        horas_teoria: c.ht,
        horas_practica: c.hp,
        horas_laboratorio: c.hl,
        ciclo: c.ciclo,
        tiene_laboratorio: c.lab,
        activo: true,
      }),
    );
    dbCursos.push(curso);
  }
  console.log(`✅ ${dbCursos.length} cursos creados`);

  // ── 8. GRUPOS ────────────────────────────────────────────
  const dbGrupos: Grupo[] = [];
  for (const curso of dbCursos) {
    const numGrupos = curso.horas_laboratorio > 0 ? 2 : 1;
    for (let g = 1; g <= numGrupos; g++) {
      const grupo = await grupoRepo.save(
        grupoRepo.create({
          codigo: `${curso.codigo}-G${g}`,
          nombre: `${curso.nombre} - Grupo ${g}`,
          ciclo: curso.ciclo,
          cupo_maximo: 30,
          periodo_academico_id: periodoActivo.id,
          curso_id: curso.id,
        }),
      );
      dbGrupos.push(grupo);
    }
  }
  console.log(`✅ ${dbGrupos.length} grupos creados`);

  // ── 9. CAMPAÑA DE VENTANAS ───────────────────────────────
  const campania = await campaniaRepo.save(
    campaniaRepo.create({
      nombre: "Campaña 2026-I - Principal",
      descripcion: "Ventanas de atención para el período 2026-I",
      periodo_id: periodoActivo.id,
      estado: EstadoCampaña.PUBLICADO,
      fecha_inicio: new Date("2026-03-20"),
      fecha_fin: new Date("2026-05-30"),
      dias_habilitados: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"],
      bloques_horarios: [
        { nombre: "Mañana", hora_inicio: "08:00", hora_fin: "12:00" },
        { nombre: "Tarde", hora_inicio: "14:00", hora_fin: "17:00" },
      ],
      duracion_turno_minutos: 15,
      buffer_minutos: 5,
      cupos_maximos_ventana: 20,
      porcentaje_reserva: 15,
      reglas_prioridad: [
        { campo: "categoria", orden: "DESC" },
        { campo: "antiguedad", orden: "DESC" },
      ],
      excluir_feriados: true,
      excluir_eventos: true,
      distribucion_equitativa: true,
      creado_por_id: dbUsuariosSistema[0].id,
    }),
  );
  console.log("✅ Campaña de ventanas creada");

  // ── 10. VENTANAS DE ATENCIÓN ─────────────────────────────
  const ventanasData = [
    {
      proposito: CategoriaVentana.DECLARACION,
      fecha: "2026-03-20",
      hora_inicio: "08:00",
      hora_fin: "12:00",
    },
    {
      proposito: CategoriaVentana.SUBSANACION,
      fecha: "2026-04-01",
      hora_inicio: "08:00",
      hora_fin: "12:00",
    },
    {
      proposito: CategoriaVentana.CAMBIO,
      fecha: "2026-04-15",
      hora_inicio: "14:00",
      hora_fin: "17:00",
    },
    {
      proposito: CategoriaVentana.DECLARACION,
      fecha: "2026-03-21",
      hora_inicio: "14:00",
      hora_fin: "17:00",
    },
    {
      proposito: CategoriaVentana.SUBSANACION,
      fecha: "2026-04-02",
      hora_inicio: "14:00",
      hora_fin: "17:00",
    },
  ];
  const dbVentanas: VentanaAtencion[] = [];
  for (const v of ventanasData) {
    const ventana = await ventanaRepo.save({
      periodo: "2026-I",
      fecha: new Date(v.fecha),
      proposito: v.proposito,
      hora_inicio: v.hora_inicio,
      hora_fin: v.hora_fin,
      intervalo_minutos: 30,
      estado: EstadoVentanaAtencion.PROGRAMADA,
      campaña_id: campania.id,
    });
    dbVentanas.push(ventana);
  }
  console.log(`✅ ${dbVentanas.length} ventanas de atención creadas`);

  // ── 11. DOCENTE-CURSO (HABILITACIONES) ───────────────────
  // Asignar cada docente a varios cursos según su especialidad
  const dbDocenteCurso: DocenteCurso[] = [];
  for (let i = 0; i < dbDocentes.length; i++) {
    const docente = dbDocentes[i];
    const cursosAsignar = dbCursos.filter(
      (c, idx) =>
        idx % dbDocentes.length === i % dbDocentes.length ||
        idx % dbDocentes.length === (i + 1) % dbDocentes.length,
    );
    for (const curso of cursosAsignar) {
      const tipos: TipoClase[] = [TipoClase.TEORIA];
      if (curso.tiene_laboratorio) tipos.push(TipoClase.LABORATORIO);
      if (curso.horas_practica > 0) tipos.push(TipoClase.PRACTICA);
      for (const tipo of tipos) {
        const existente = await docenteCursoRepo.findOne({
          where: {
            docenteId: docente.id,
            cursoId: curso.id,
            tipo_clase: tipo,
            periodoId: periodoActivo.id,
          },
        });
        if (!existente) {
          const dc = await docenteCursoRepo.save(
            docenteCursoRepo.create({
              docenteId: docente.id,
              cursoId: curso.id,
              tipo_clase: tipo,
              periodoId: periodoActivo.id,
              grupos: 1,
            }),
          );
          dbDocenteCurso.push(dc);
        }
      }
    }
  }
  console.log(
    `✅ ${dbDocenteCurso.length} habilitaciones docente-curso creadas`,
  );

  // ── 12. HORARIOS ──────────────────────────────────────────
  // Los horarios se insertan mediante script externo (ver seed-horarios-ciclo-*.ts)
  const totalHorarios = 0;

  // ── 13. DECLARACIONES DE CARGA HORARIA ──────────────────
  for (const docente of dbDocentes) {
    const existe = await declaracionRepo.findOne({
      where: { docente_id: docente.id, periodo_academico_id: periodoActivo.id },
    });
    if (!existe) {
      await declaracionRepo.save(
        declaracionRepo.create({
          docente_id: docente.id,
          departamento_id: departamento.id,
          facultad_id: facultad.id,
          periodo_academico_id: periodoActivo.id,
          sede: "Facultad de Ingeniería",
          estado: EstadoDeclaracionCarga.ENVIADO_DOCENTE,
          fecha_firma_docente: new Date(),
        }),
      );
    }
  }
  console.log(`✅ ${dbDocentes.length} declaraciones de carga horaria creadas`);

  console.log(`\n========================================`);
  console.log(`✅ SEED COMPLETADO EXITOSAMENTE`);
  console.log(`   Período activo: ${periodoActivo.codigo}`);
  console.log(`   Docentes: ${dbDocentes.length}`);
  console.log(`   Cursos: ${dbCursos.length}`);
  console.log(`   Grupos: ${dbGrupos.length}`);
  console.log(`   Horarios asignados: ${totalHorarios}`);
  console.log(`   Ventanas de atención: ${dbVentanas.length}`);
  console.log(`   Declaraciones: ${dbDocentes.length}`);
  console.log(`========================================\n`);
}
