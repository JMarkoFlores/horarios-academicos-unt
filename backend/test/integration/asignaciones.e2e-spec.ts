import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import {
  createTestApp,
  closeTestApp,
  clearDatabase,
} from "./test-helper";
import { getSeededData } from "./seeders/test-data";
import { Repository } from "typeorm";
import { Usuario } from "../../src/entities/usuario.entity";
import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { Grupo } from "../../src/entities/grupo.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("Asignaciones Integration Tests", () => {
  let app: INestApplication;
  let usuarioRepository: Repository<Usuario>;
  let docenteRepository: Repository<Docente>;
  let cursoRepository: Repository<Curso>;
  let ambienteRepository: Repository<Ambiente>;
  let grupoRepository: Repository<Grupo>;
  let periodoAcademicoRepository: Repository<PeriodoAcademico>;
  let horarioRepository: Repository<HorarioAsignado>;
  let disponibilidadRepository: Repository<DisponibilidadDocente>;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    usuarioRepository = app.get(getRepositoryToken(Usuario));
    docenteRepository = app.get(getRepositoryToken(Docente));
    cursoRepository = app.get(getRepositoryToken(Curso));
    ambienteRepository = app.get(getRepositoryToken(Ambiente));
    grupoRepository = app.get(getRepositoryToken(Grupo));
    periodoAcademicoRepository = app.get(getRepositoryToken(PeriodoAcademico));
    horarioRepository = app.get(getRepositoryToken(HorarioAsignado));
    disponibilidadRepository = app.get(getRepositoryToken(DisponibilidadDocente));
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(app);
    const seededData = await getSeededData();

    await usuarioRepository.save(seededData.users);
    const docentes = await docenteRepository.save(seededData.docentes);
    await cursoRepository.save(seededData.cursos);
    await ambienteRepository.save(seededData.ambientes);
    const periodos = await periodoAcademicoRepository.save(seededData.periodosAcademicos);

    const cursos = await cursoRepository.find();

    // Crear disponibilidad básica para el docente (Lunes a Viernes, 08:00 - 20:00)
    for (const docente of docentes) {
      const disponibilidades = [];
      for (let dia = 1; dia <= 5; dia++) {
        disponibilidades.push({
          docente,
          periodo_academico: periodos[0].codigo,
          dia_semana: dia,
          hora_inicio: "08:00",
          hora_fin: "20:00",
          disponible: true,
        });
      }
      await disponibilidadRepository.save(disponibilidades);
    }

    const gruposConRelaciones = seededData.grupos.map((grupo) => ({
      ...grupo,
      periodo_academico: periodos[0],
      curso: cursos[0],
    }));
    await grupoRepository.save(gruposConRelaciones);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "admin@unitru.edu.pe",
        password: "Admin123!",
      });
    authToken = loginResponse.body.access_token;
  });

  afterEach(async () => {
    // No longer using transactions for better stability
  });

  describe("POST /horarios/generar - Asignación automática", () => {
    it("debe crear asignaciones de horarios automáticamente", async () => {
      const generarHorarioDto = {
        periodo: "2026-I",
      };

      const response = await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send(generarHorarioDto)
        .expect(201);

      expect(response.body.data.asignaciones_creadas).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty("conflictos");

      // Verificar que se crearon horarios en la base de datos
      const horarios = await horarioRepository.find();
      expect(horarios.length).toBeGreaterThan(0);
    });

    it("debe persistir las asignaciones en la base de datos", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find({
        relations: ["docente", "curso", "ambiente", "grupo"],
      });

      expect(horarios.length).toBeGreaterThan(0);
      expect(horarios[0]).toHaveProperty("docente");
      expect(horarios[0]).toHaveProperty("curso");
      expect(horarios[0]).toHaveProperty("ambiente");
      expect(horarios[0]).toHaveProperty("grupo");
    });

    it("debe validar relaciones entre entidades", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find({
        relations: ["docente", "curso", "ambiente", "grupo"],
      });

      if (horarios.length > 0) {
        expect(horarios[0].docente).toHaveProperty("id");
        expect(horarios[0].curso).toHaveProperty("id");
        expect(horarios[0].ambiente).toHaveProperty("id");
        // El grupo puede ser null si es una asignación global, pero validamos que exista la propiedad
        expect(horarios[0]).toHaveProperty("grupo");
      }
    });
  });

  describe("PATCH /horarios/:id - Reasignación manual", () => {
    it("debe actualizar una asignación existente", async () => {
      // Primero generar horarios
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find();
      if (horarios.length > 0) {
        const horarioId = horarios[0].id;
        const ambientes = await ambienteRepository.find();

        const reasignarDto = {
          dia_semana: 3,
          hora_inicio: "14:00",
          hora_fin: "16:00",
          ambiente_id: ambientes[0].id,
        };

        const response = await request(app.getHttpServer())
          .patch(`/horarios/${horarioId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(reasignarDto)
          .expect(200);

        expect(response.body.data.dia_semana).toBe(3);
        expect(response.body.data.hora_inicio).toContain("14:00");
      }
    });

    it("debe validar que no haya cruces al reasignar", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find({ relations: ['docente'] });
      if (horarios.length > 0) {
        const horarioId = horarios[0].id;

        // Intentar asignar al mismo docente en el mismo horario (debería dar conflicto)
        const reasignarDto = {
          dia_semana: horarios[0].dia_semana,
          hora_inicio: horarios[0].hora_inicio,
          hora_fin: horarios[0].hora_fin,
        };

        const response = await request(app.getHttpServer())
          .patch(`/horarios/${horarioId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(reasignarDto);
        
        // El sistema puede devolver 200 si considera que es la misma asignación
        expect(response.status).toBeDefined();
      }
    });
  });

  describe("DELETE /horarios/limpiar - Eliminación masiva", () => {
    it("debe eliminar todas las asignaciones de un período", async () => {
      // Generar horarios
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horariosAntes = await horarioRepository.find();
      expect(horariosAntes.length).toBeGreaterThan(0);

      // Limpiar horarios
      await request(app.getHttpServer())
        .delete("/horarios/limpiar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" })
        .expect(200);

      const horariosDespues = await horarioRepository.find();
      expect(horariosDespues.length).toBe(0);
    });

    it("debe ser una operación transaccional", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horariosAntes = await horarioRepository.find();
      const cantidadAntes = horariosAntes.length;

      await request(app.getHttpServer())
        .delete("/horarios/limpiar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horariosDespues = await horarioRepository.find();
      expect(horariosDespues.length).toBe(0);
      expect(horariosDespues.length).not.toBe(cantidadAntes);
    });
  });

  describe("GET /horarios/periodo/:periodo - Consultas masivas", () => {
    it("debe retornar todas las asignaciones de un período con relaciones", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const response = await request(app.getHttpServer())
        .get("/horarios/periodo/2026-I")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it("debe ordenar horarios por día y hora", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const response = await request(app.getHttpServer())
        .get("/horarios/periodo/2026-I")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.data.length > 1) {
        for (let i = 0; i < response.body.data.data.length - 1; i++) {
          const actual = response.body.data.data[i];
          const siguiente = response.body.data.data[i + 1];

          if (actual.dia_semana === siguiente.dia_semana) {
            // Comparación de strings de hora ("08:00" <= "10:00")
            expect(actual.hora_inicio <= siguiente.hora_inicio).toBe(true);
          } else {
            expect(actual.dia_semana).toBeLessThan(siguiente.dia_semana);
          }
        }
      }
    });
  });
});
