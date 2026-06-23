import { Repository } from "typeorm";
import { PlanEstudios } from "../entities/plan-estudios.entity";
import { CursoPlanEstudios } from "../entities/curso-plan-estudios.entity";
import { Curso } from "../entities/curso.entity";
import { Departamento } from "../entities/departamento.entity";
import { TipoCursoPlan } from "../common/enums/tipo-curso-plan.enum";
import { Escuela } from "../entities/escuela.entity";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const TIPO_MAP: Record<string, string> = {
  S: TipoCursoPlan.ESPECIALIDAD,
  OB: TipoCursoPlan.OBLIGATORIO_GENERAL,
  OP: TipoCursoPlan.OBLIGATORIO_PROFESIONAL,
  EL: TipoCursoPlan.ELECTIVO,
};

const cursosRaw = [
  // ciclo 1
  { codigo: "1939", ciclo: 1, tipo: "S", nombre: "INTRODUCCION A LA INGENIERIA DE SISTEMAS", ht: 3, hp: 2, hl: 0, creditos: 2, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "2347", ciclo: 1, tipo: "S", nombre: "INTRODUCCION A LA PROGRAMACION", ht: 1, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "1854", ciclo: 1, tipo: "OB", nombre: "DESARROLLO PERSONAL", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "CIENCIAS PSICOLOGICAS FILOSOFIA Y ARTE", prereq: "" },
  { codigo: "1855", ciclo: 1, tipo: "OB", nombre: "DESARROLLO DEL PENSAMIENTO LOGICO MATEMATICO", ht: 1, hp: 4, hl: 0, creditos: 3, depto: "MATEMATICAS", prereq: "" },
  { codigo: "1857", ciclo: 1, tipo: "OB", nombre: "LECTURA CRITICA Y REDACCION DE TEXTOS ACADEMICOS", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "LENGUA NACIONAL Y LITERATURA", prereq: "" },
  { codigo: "1863", ciclo: 1, tipo: "OB", nombre: "INTRODUCCION AL ANALISIS MATEMATICO", ht: 2, hp: 4, hl: 0, creditos: 4, depto: "MATEMATICAS", prereq: "" },
  { codigo: "1867", ciclo: 1, tipo: "OP", nombre: "ESTADISTICA GENERAL", ht: 2, hp: 4, hl: 0, creditos: 4, depto: "ESTADISTICA", prereq: "" },
  { codigo: "1883", ciclo: 1, tipo: "EL", nombre: "TALLER DE TECNICAS DE COMUNICACION EFICAZ", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "COMUNICACION SOCIAL", prereq: "" },
  { codigo: "1884", ciclo: 1, tipo: "EL", nombre: "TALLER DE MUSICA", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "FILOSOFIA Y ARTE", prereq: "" },
  { codigo: "1908", ciclo: 1, tipo: "EL", nombre: "TALLER DE LIDERAZGO Y TRABAJO EN EQUIPO", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "CIENCIAS PSICOLOGICAS", prereq: "" },
  { codigo: "2055", ciclo: 1, tipo: "EL", nombre: "TALLER DE DEPORTE", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "CIENCIAS DE LA EDUCACION", prereq: "" },
  { codigo: "2056", ciclo: 1, tipo: "EL", nombre: "TALLER DE TEATRO", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "FILOSOFIA Y ARTE", prereq: "" },
  // ciclo 2
  { codigo: "2051", ciclo: 2, tipo: "S", nombre: "PROGRAMACION ORIENTADO A OBJETOS I", ht: 2, hp: 0, hl: 4, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "1939 INTRODUCCION A LA INGENIERIA DE SISTEMAS (Ciclo 1)" },
  { codigo: "1858", ciclo: 2, tipo: "OB", nombre: "SOCIEDAD CULTURA Y ECOLOGIA", ht: 1, hp: 4, hl: 0, creditos: 3, depto: "CIENCIAS SOCIALES", prereq: "" },
  { codigo: "1859", ciclo: 2, tipo: "OB", nombre: "CULTURA INVESTIGATIVA Y PENSAMIENTO CRITICO", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "CIENCIAS DE LA EDUCACION", prereq: "" },
  { codigo: "1860", ciclo: 2, tipo: "OB", nombre: "ETICA CONVIVENCIA HUMANA Y CIUDADANIA", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "FILOSOFIA Y ARTE CIENCIAS PSICOLOGICAS", prereq: "" },
  { codigo: "1861", ciclo: 2, tipo: "OB", nombre: "ANALISIS MATEMATICO", ht: 2, hp: 4, hl: 0, creditos: 4, depto: "MATEMATICAS", prereq: "1863 INTRODUCCION AL ANALISIS MATEMATICO (Ciclo 1)" },
  { codigo: "1875", ciclo: 2, tipo: "OP", nombre: "FISICA GENERAL", ht: 2, hp: 4, hl: 0, creditos: 4, depto: "FISICA", prereq: "" },
  { codigo: "1888", ciclo: 2, tipo: "EL", nombre: "TALLER DE MANEJO DE TIC", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "1889", ciclo: 2, tipo: "EL", nombre: "TALLER DE DANZAS FOLCLORICAS", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "FILOSOFIA Y ARTE", prereq: "" },
  { codigo: "1890", ciclo: 2, tipo: "EL", nombre: "TALLER DE DEPORTE", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "CIENCIAS DE LA EDUCACION", prereq: "" },
  { codigo: "2057", ciclo: 2, tipo: "EL", nombre: "TALLER DE MUSICA", ht: 0, hp: 2, hl: 0, creditos: 1, depto: "FILOSOFIA Y ARTE", prereq: "" },
  // ciclo 3
  { codigo: "2140", ciclo: 3, tipo: "S", nombre: "ADMINISTRACION GENERAL", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "ADMINISTRACION", prereq: "1860 ETICA CONVIVENCIA HUMANA Y CIUDADANIA (Ciclo 2)" },
  { codigo: "2141", ciclo: 3, tipo: "S", nombre: "SISTEMICA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "1939 INTRODUCCION A LA INGENIERIA DE SISTEMAS (Ciclo 1)" },
  { codigo: "2142", ciclo: 3, tipo: "S", nombre: "ESTADISTICA APLICADA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "ESTADISTICA", prereq: "1867 ESTADISTICA GENERAL (Ciclo 1)" },
  { codigo: "2143", ciclo: 3, tipo: "S", nombre: "MATEMATICA APLICADA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "MATEMATICAS", prereq: "1861 ANALISIS MATEMATICO (Ciclo 2)" },
  { codigo: "2144", ciclo: 3, tipo: "S", nombre: "FISICA ELECTRONICA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "FISICA", prereq: "1875 FISICA GENERAL (Ciclo 2)" },
  { codigo: "2145", ciclo: 3, tipo: "S", nombre: "PROGRAMACION ORIENTADA A OBJETOS II", ht: 2, hp: 0, hl: 4, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "2051 PROGRAMACION ORIENTADO A OBJETOS I (Ciclo 2)" },
  { codigo: "2146", ciclo: 3, tipo: "EL", nombre: "INGENIERIA GRAFICA", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "2147", ciclo: 3, tipo: "EL", nombre: "SICOLOGIA ORGANIZACIONAL", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "CIENCIAS PSICOLOGICAS", prereq: "" },
  // ciclo 4
  { codigo: "2650", ciclo: 4, tipo: "S", nombre: "ECONOMIA GENERAL", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "ECONOMIA", prereq: "2141 SISTEMICA (Ciclo 3)" },
  { codigo: "2651", ciclo: 4, tipo: "S", nombre: "DISEÑO WEB", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2142 ESTADISTICA APLICADA (Ciclo 3)" },
  { codigo: "2652", ciclo: 4, tipo: "S", nombre: "PENSAMIENTO DE DISEÑO", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2141 SISTEMICA (Ciclo 3)" },
  { codigo: "2653", ciclo: 4, tipo: "S", nombre: "GESTIÓN DE PROCESOS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2141 SISTEMICA (Ciclo 3)" },
  { codigo: "2654", ciclo: 4, tipo: "S", nombre: "SISTEMAS DIGITALES", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2143 MATEMATICA APLICADA (Ciclo 3); 2144 FISICA ELECTRONICA (Ciclo 3)" },
  { codigo: "2655", ciclo: 4, tipo: "S", nombre: "ESTRUCTURA DE DATOS ORIENTADO A OBJETOS", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "2145 PROGRAMACION ORIENTADA A OBJETOS II (Ciclo 3)" },
  { codigo: "2656", ciclo: 4, tipo: "EL", nombre: "COMPUTACIÓN GRÁFICA Y VISUAL", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "2657", ciclo: 4, tipo: "EL", nombre: "PLATAFORMAS TECNOLÓGICAS", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  // ciclo 5
  { codigo: "2689", ciclo: 5, tipo: "S", nombre: "CONTABILIDAD GERENCIAL", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "CONTABILIDAD Y FINANZAS", prereq: "2650 ECONOMIA GENERAL (Ciclo 4)" },
  { codigo: "2690", ciclo: 5, tipo: "S", nombre: "TECNOLOGIAS WEB", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2651 DISEÑO WEB (Ciclo 4)" },
  { codigo: "2691", ciclo: 5, tipo: "S", nombre: "INVESTIGACIÓN DE OPERACIONES", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS INGENIERIA INDUSTRIAL", prereq: "2652 PENSAMIENTO DE DISEÑO (Ciclo 4)" },
  { codigo: "2692", ciclo: 5, tipo: "S", nombre: "INGENIERIA DE DATOS I", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "2653 GESTIÓN DE PROCESOS (Ciclo 4); 2655 ESTRUCTURA DE DATOS ORIENTADO A OBJETOS (Ciclo 4)" },
  { codigo: "2693", ciclo: 5, tipo: "S", nombre: "ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2654 SISTEMAS DIGITALES (Ciclo 4)" },
  { codigo: "2694", ciclo: 5, tipo: "S", nombre: "SISTEMAS DE INFORMACIÓN", ht: 2, hp: 2, hl: 2, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "2651 DISEÑO WEB (Ciclo 4); 2655 ESTRUCTURA DE DATOS ORIENTADO A OBJETOS (Ciclo 4)" },
  { codigo: "2695", ciclo: 5, tipo: "EL", nombre: "TELEINFORMÁTICA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "2696", ciclo: 5, tipo: "EL", nombre: "TRANSFORMACIÓN DIGITAL", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  // ciclo 6
  { codigo: "3125", ciclo: 6, tipo: "S", nombre: "FINANZAS CORPORATIVAS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "CONTABILIDAD Y FINANZAS", prereq: "2689 CONTABILIDAD GERENCIAL (Ciclo 5)" },
  { codigo: "3126", ciclo: 6, tipo: "S", nombre: "SISTEMAS INTELIGENTES", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2141 SISTEMICA (Ciclo 3); 2693 ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS (Ciclo 5)" },
  { codigo: "3127", ciclo: 6, tipo: "S", nombre: "INGENIERÍA ECONÓMICA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA INDUSTRIAL", prereq: "2689 CONTABILIDAD GERENCIAL (Ciclo 5); 2691 INVESTIGACIÓN DE OPERACIONES (Ciclo 5)" },
  { codigo: "3128", ciclo: 6, tipo: "S", nombre: "INGENIERÍA DE DATOS II", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "2692 INGENIERIA DE DATOS I (Ciclo 5)" },
  { codigo: "3129", ciclo: 6, tipo: "S", nombre: "SISTEMAS OPERATIVOS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2693 ARQUITECTURA Y ORGANIZACIÓN DE COMPUTADORAS (Ciclo 5)" },
  { codigo: "3130", ciclo: 6, tipo: "S", nombre: "INGENIERÍA DE REQUERIMIENTOS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2692 INGENIERIA DE DATOS I (Ciclo 5); 2694 SISTEMAS DE INFORMACIÓN (Ciclo 5)" },
  { codigo: "3131", ciclo: 6, tipo: "EL", nombre: "INGENIERÍA AMBIENTAL", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "INGENIERIA QUIMICA INGENIERIA AMBIENTAL", prereq: "" },
  { codigo: "3132", ciclo: 6, tipo: "EL", nombre: "GESTIÓN DEL TALENTO HUMANO", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "ADMINISTRACION", prereq: "" },
  // ciclo 7
  { codigo: "3444", ciclo: 7, tipo: "S", nombre: "CADENA DE SUMINISTRO", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "INGENIERIA INDUSTRIAL", prereq: "3125 FINANZAS CORPORATIVAS (Ciclo 6)" },
  { codigo: "3445", ciclo: 7, tipo: "S", nombre: "GESTIÓN DE SERVICIOS DE TIC", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3126 SISTEMAS INTELIGENTES (Ciclo 6); 3130 INGENIERÍA DE REQUERIMIENTOS (Ciclo 6)" },
  { codigo: "3446", ciclo: 7, tipo: "S", nombre: "METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2142 ESTADISTICA APLICADA (Ciclo 3)" },
  { codigo: "3447", ciclo: 7, tipo: "S", nombre: "PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3127 INGENIERÍA ECONÓMICA (Ciclo 6); 3128 INGENIERÍA DE DATOS II (Ciclo 6)" },
  { codigo: "3448", ciclo: 7, tipo: "S", nombre: "REDES Y COMUNICACIONES I", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3129 SISTEMAS OPERATIVOS (Ciclo 6)" },
  { codigo: "3449", ciclo: 7, tipo: "S", nombre: "INGENIERÍA DEL SOFTWARE I", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "3130 INGENIERÍA DE REQUERIMIENTOS (Ciclo 6)" },
  { codigo: "3450", ciclo: 7, tipo: "EL", nombre: "ADMINISTRACIÓN DE BASE DE DATOS", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "3451", ciclo: 7, tipo: "EL", nombre: "NEGOCIOS ELECTRÓNICOS", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  // ciclo 8
  { codigo: "4482", ciclo: 8, tipo: "S", nombre: "MARKETING Y MEDIOS SOCIALES", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "2690 TECNOLOGIAS WEB (Ciclo 5); 3444 CADENA DE SUMINISTRO (Ciclo 7)" },
  { codigo: "4483", ciclo: 8, tipo: "S", nombre: "SEGURIDAD DE LA INFORMACIÓN", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3445 GESTIÓN DE SERVICIOS DE TIC (Ciclo 7); 3448 REDES Y COMUNICACIONES I (Ciclo 7)" },
  { codigo: "4484", ciclo: 8, tipo: "S", nombre: "INTERNET DE LAS COSAS", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3448 REDES Y COMUNICACIONES I (Ciclo 7); 3449 INGENIERÍA DEL SOFTWARE I (Ciclo 7)" },
  { codigo: "4485", ciclo: 8, tipo: "S", nombre: "INTELIGENCIA DE NEGOCIOS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3447 PLANEAMIENTO ESTRATÉGICO DE LA INFORMACIÓN (Ciclo 7)" },
  { codigo: "4486", ciclo: 8, tipo: "S", nombre: "REDES Y COMUNICACIONES II", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3448 REDES Y COMUNICACIONES I (Ciclo 7)" },
  { codigo: "4487", ciclo: 8, tipo: "S", nombre: "INGENIERÍA DEL SOFTWARE II", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "3449 INGENIERÍA DEL SOFTWARE I (Ciclo 7)" },
  { codigo: "4488", ciclo: 8, tipo: "EL", nombre: "DEONTOLOGÍA Y DERECHO INFORMÁTICO", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "DERECHO", prereq: "" },
  { codigo: "4489", ciclo: 8, tipo: "EL", nombre: "ARQUITECTURA BASADA EN MICROSERVICIOS", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  // ciclo 9
  { codigo: "4490", ciclo: 9, tipo: "S", nombre: "GESTIÓN DE PROYECTOS DE TIC", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "3445 GESTIÓN DE SERVICIOS DE TIC (Ciclo 7); 4484 INTERNET DE LAS COSAS (Ciclo 8)" },
  { codigo: "4491", ciclo: 9, tipo: "S", nombre: "AUDITORÍA INFORMÁTICA", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4483 SEGURIDAD DE LA INFORMACIÓN (Ciclo 8)" },
  { codigo: "4492", ciclo: 9, tipo: "S", nombre: "TESIS I", ht: 2, hp: 2, hl: 2, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "3446 METODOLOGÍA DE LA INVESTIGACIÓN CIENTÍFICA (Ciclo 7); 170 creditos aprobados" },
  { codigo: "4493", ciclo: 9, tipo: "S", nombre: "ANALÍTICA DE NEGOCIOS", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4482 MARKETING Y MEDIOS SOCIALES (Ciclo 8); 4485 INTELIGENCIA DE NEGOCIOS (Ciclo 8)" },
  { codigo: "4494", ciclo: 9, tipo: "S", nombre: "COMPUTACIÓN EN LA NUBE", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4486 REDES Y COMUNICACIONES II (Ciclo 8)" },
  { codigo: "4495", ciclo: 9, tipo: "S", nombre: "INGENIERÍA WEB", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4486 REDES Y COMUNICACIONES II (Ciclo 8); 4487 INGENIERÍA DEL SOFTWARE II (Ciclo 8)" },
  { codigo: "4496", ciclo: 9, tipo: "EL", nombre: "EMPRENDEDURISMO TECNOLÓGICO", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  { codigo: "4497", ciclo: 9, tipo: "EL", nombre: "HACKEO ÉTICO", ht: 2, hp: 0, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "" },
  // ciclo 10
  { codigo: "4498", ciclo: 10, tipo: "S", nombre: "SISTEMAS DE INFORMACIÓN EMPRESARIAL", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "4490 GESTIÓN DE PROYECTOS DE TIC (Ciclo 9)" },
  { codigo: "4499", ciclo: 10, tipo: "S", nombre: "GOBIERNO DE TIC", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4490 GESTIÓN DE PROYECTOS DE TIC (Ciclo 9); 4491 AUDITORÍA INFORMÁTICA (Ciclo 9)" },
  { codigo: "4501", ciclo: 10, tipo: "S", nombre: "ARQUITECTURA EMPRESARIAL", ht: 1, hp: 2, hl: 2, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4491 AUDITORÍA INFORMÁTICA (Ciclo 9); 4494 COMPUTACIÓN EN LA NUBE (Ciclo 9)" },
  { codigo: "4502", ciclo: 10, tipo: "S", nombre: "RESPONSABILIDAD SOCIAL CORPORATIVA", ht: 2, hp: 2, hl: 0, creditos: 3, depto: "INGENIERIA INDUSTRIAL", prereq: "4490 GESTIÓN DE PROYECTOS DE TIC (Ciclo 9)" },
  { codigo: "4503", ciclo: 10, tipo: "S", nombre: "APLICACIONES MÓVILES", ht: 1, hp: 1, hl: 3, creditos: 3, depto: "INGENIERIA DE SISTEMAS", prereq: "4495 INGENIERÍA WEB (Ciclo 9)" },
  { codigo: "4504", ciclo: 10, tipo: "S", nombre: "PRÁCTICAS PRE PROFESIONALES", ht: 2, hp: 1, hl: 3, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "4492 TESIS I (Ciclo 9); 192 creditos aprobados" },
  { codigo: "5265", ciclo: 10, tipo: "S", nombre: "TRABAJO DE INVESTIGACIÓN", ht: 2, hp: 2, hl: 2, creditos: 4, depto: "INGENIERIA DE SISTEMAS", prereq: "4492 TESIS I (Ciclo 9)" },
];

export async function seedPlanEstudios2027(
  planRepo: Repository<PlanEstudios>,
  cursoRepo: Repository<Curso>,
  cursoPlanRepo: Repository<CursoPlanEstudios>,
  escuela: Escuela,
  departamentos: Record<string, Departamento>
) {
  const plan2027 = await planRepo.save(
    planRepo.create({
      codigo: "2027",
      nombre: "Plan de Estudios 2027",
      descripcion: "Plan de estudios de Ingeniería de Sistemas - Versión 2027",
      resolucion: "R.N° 001-2027-UNT",
      anio: 2027,
      activo: false,
      escuela_id: escuela.id,
    })
  );
  console.log("✅ Plan de Estudios 2027 creado");

  let cursosReutilizados = 0;
  let cursosCreados = 0;
  const dbCursos: Curso[] = [];

  for (const c of cursosRaw) {
    let curso = await cursoRepo.findOne({ where: { codigo: c.codigo } });

    if (curso) {
      cursosReutilizados++;
    } else {
      const deptoNorm = normalize(c.depto);
      let departamento: Departamento | null = null;
      for (const [key, dep] of Object.entries(departamentos)) {
        if (normalize(key) === deptoNorm) {
          departamento = dep;
          break;
        }
      }

      curso = await cursoRepo.save(
        cursoRepo.create({
          codigo: c.codigo,
          nombre: c.nombre,
          creditos: c.creditos,
          horas_teoria: c.ht,
          horas_practica: c.hp,
          horas_laboratorio: c.hl,
          ciclo: c.ciclo,
          tiene_laboratorio: c.hl > 0,
          prerequisitos: c.prereq || null,
          activo: true,
          departamento_id: departamento?.id ?? null,
        })
      );
      cursosCreados++;
    }

    await cursoPlanRepo.save(
      cursoPlanRepo.create({
        plan_estudios_id: plan2027.id,
        curso_id: curso.id,
        ciclo: c.ciclo,
        tipo_curso: TIPO_MAP[c.tipo] || TipoCursoPlan.OBLIGATORIO_GENERAL,
        horas_teoria: c.ht,
        horas_practica: c.hp,
        horas_laboratorio: c.hl,
        creditos: c.creditos,
        estado: "ACTIVO",
      })
    );

    dbCursos.push(curso);
  }

  console.log(`✅ Plan 2027: ${cursosReutilizados} cursos reutilizados, ${cursosCreados} creados, ${dbCursos.length} CursoPlanEstudios generados`);

  return { plan2027, cursos: dbCursos };
}
