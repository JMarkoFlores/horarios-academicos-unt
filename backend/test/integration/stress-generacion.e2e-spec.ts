import { INestApplication } from "@nestjs/common";
import { createTestApp, closeTestApp, clearDatabase } from "./test-helper";
import { AsignacionService } from "../../src/horarios/asignacion.service";
import { DatasetGenerador } from "../fixtures/dataset-generador";
import { AlgoritmoValidador } from "../validation/algoritmo-validador";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";

describe("Exhaustive Scheduling Algorithm Testing (Stress & Validation)", () => {
  let app: INestApplication;
  let asignacionService: AsignacionService;
  let validador: AlgoritmoValidador;

  let docenteRepo: Repository<Docente>;
  let cursoRepo: Repository<Curso>;
  let ambienteRepo: Repository<Ambiente>;
  let disponibilidadRepo: Repository<DisponibilidadDocente>;
  let periodoRepo: Repository<PeriodoAcademico>;
  let horarioRepo: Repository<HorarioAsignado>;

  const PERIODO = "2026-I";
  let periodoCounter = 0;
  let currentPeriodo: string;

  beforeAll(async () => {
    app = await createTestApp();
    asignacionService = app.get(AsignacionService);
    validador = new AlgoritmoValidador();

    docenteRepo = app.get(getRepositoryToken(Docente));
    cursoRepo = app.get(getRepositoryToken(Curso));
    ambienteRepo = app.get(getRepositoryToken(Ambiente));
    disponibilidadRepo = app.get(getRepositoryToken(DisponibilidadDocente));
    periodoRepo = app.get(getRepositoryToken(PeriodoAcademico));
    horarioRepo = app.get(getRepositoryToken(HorarioAsignado));
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(app);
    // Setup base period
    periodoCounter++;
    currentPeriodo = `P-${Math.random().toString(36).substring(2, 7)}`;
    const periodo = DatasetGenerador.generarPeriodo(currentPeriodo);
    await periodoRepo.save(periodo);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Delay for stability
  });

  async function ejecutarEscenario(
    numCursos: number,
    numDocentes: number,
    numAmbientes: number,
  ) {
    console.log(
      `--- Iniciando Escenario: ${numCursos} Cursos, ${numDocentes} Docentes, ${numAmbientes} Ambientes ---`,
    );

    // 1. Generar y guardar data
    const docentes = DatasetGenerador.generarDocentes(numDocentes);
    const cursos = DatasetGenerador.generarCursos(numCursos);
    const ambientes = DatasetGenerador.generarAmbientes(numAmbientes);
    const disponibilidades = DatasetGenerador.generarDisponibilidades(
      docentes,
      currentPeriodo,
    );

    await docenteRepo.save(docentes);
    await cursoRepo.save(cursos);
    await ambienteRepo.save(ambientes);
    await disponibilidadRepo.save(disponibilidades);

    // 2. Ejecutar algoritmo y medir tiempo
    const start = Date.now();
    const resultado = await asignacionService.generarHorario(currentPeriodo);
    const end = Date.now();

    const duration = end - start;
    console.log(`Tiempo de generación: ${duration}ms`);
    console.log(`Asignaciones creadas: ${resultado.asignaciones_creadas}`);
    console.log(`Conflictos (sin asignar): ${resultado.conflictos}`);

    // 3. Validar exhaustivamente los resultados
    const asignacionesGeneradas = await horarioRepo.find({
      relations: ["docente", "curso", "ambiente"],
      where: { periodo_academico: currentPeriodo },
    });

    const reporte = validador.validar(asignacionesGeneradas, disponibilidades);
    const explicacion = validador.explicarConflictos(reporte);

    console.log(`Resultado de Validación:\n${explicacion}`);

    return { duration, resultado, reporte };
  }

  it("Escenario 1: Dataset Pequeño (Control)", async () => {
    const { reporte } = await ejecutarEscenario(20, 10, 5);
    expect(reporte.valido).toBe(true);
  });

  it("Escenario 2: Dataset Mediano (Saturación moderada)", async () => {
    const { reporte, resultado } = await ejecutarEscenario(100, 30, 10);
    expect(reporte.valido).toBe(true);
    console.log(
      `Ratio de éxito: ${((resultado.asignaciones_creadas / 100) * 100).toFixed(2)}%`,
    );
  });

  it("Escenario 3: Dataset Grande (Stress)", async () => {
    const { reporte, duration } = await ejecutarEscenario(300, 100, 30);
    expect(reporte.valido).toBe(true);
    expect(duration).toBeLessThan(10000);
  });

  it("Escenario 4: Caso Límite (Muy pocos ambientes)", async () => {
    const { reporte, resultado } = await ejecutarEscenario(50, 20, 2);
    expect(reporte.valido).toBe(true);
    console.log(
      `Conflictos esperados en saturación extrema: ${resultado.conflictos}`,
    );
  });
});
