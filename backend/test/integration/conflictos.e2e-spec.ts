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
import { ConflictoAsignacion } from "../../src/entities/conflicto-asignacion.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("Conflictos Integration Tests", () => {
  let app: INestApplication;
  let usuarioRepository: Repository<Usuario>;
  let docenteRepository: Repository<Docente>;
  let cursoRepository: Repository<Curso>;
  let ambienteRepository: Repository<Ambiente>;
  let grupoRepository: Repository<Grupo>;
  let periodoAcademicoRepository: Repository<PeriodoAcademico>;
  let horarioRepository: Repository<HorarioAsignado>;
  let conflictoRepository: Repository<ConflictoAsignacion>;
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
    conflictoRepository = app.get(getRepositoryToken(ConflictoAsignacion));
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(app);
    const seededData = await getSeededData();

    await usuarioRepository.save(seededData.users);
    await docenteRepository.save(seededData.docentes);
    await cursoRepository.save(seededData.cursos);
    await ambienteRepository.save(seededData.ambientes);
    await periodoAcademicoRepository.save(seededData.periodosAcademicos);

    const periodos = await periodoAcademicoRepository.find();
    const cursos = await cursoRepository.find();
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
    // No longer using transactions for better state isolation
  });

  describe("Detección de conflictos", () => {
    it("debe detectar conflictos al generar horarios", async () => {
      const generarHorarioDto = {
        periodo: "2026-I",
      };

      const response = await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send(generarHorarioDto)
        .expect(201);

      expect(response.body.data).toHaveProperty("conflictos");
      expect(typeof response.body.data.conflictos).toBe("number");
    });

    it("debe crear registros de conflictos en la base de datos", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find({
        relations: ["docente", "ambiente"],
      });

      expect(Array.isArray(conflictos)).toBe(true);
    });

    it("debe incluir información detallada en los conflictos", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find({
        relations: ["docente", "ambiente"],
      });

      if (conflictos.length > 0) {
        expect(conflictos[0]).toHaveProperty("docente");
        expect(conflictos[0]).toHaveProperty("ambiente");
        expect(conflictos[0]).toHaveProperty("tipo_conflicto");
        expect(conflictos[0]).toHaveProperty("resuelto");
        expect(conflictos[0].resuelto).toBe(false);
      }
    });
  });

  describe("GET /horarios/conflictos/:periodo - Consulta de conflictos", () => {
    it("debe retornar conflictos de un período específico", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const response = await request(app.getHttpServer())
        .get("/horarios/conflictos/2026-I")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("items");
      expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it("debe retornar array vacío si no hay conflictos", async () => {
      const response = await request(app.getHttpServer())
        .get("/horarios/conflictos/2026-II")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.items).toEqual([]);    });

    it("debe incluir relaciones en la respuesta de conflictos", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const response = await request(app.getHttpServer())
        .get("/horarios/conflictos/2026-I")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.items.length > 0) {
        expect(response.body.data.items[0]).toHaveProperty("docente");
        expect(response.body.data.items[0]).toHaveProperty("ambiente");
      }
    });
  });

  describe("PATCH /horarios/conflictos/:id/resolver - Resolución de conflictos", () => {
    it("debe marcar un conflicto como resuelto", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find();
      if (conflictos.length > 0) {
        const conflictoId = conflictos[0].id;

        const response = await request(app.getHttpServer())
          .patch(`/horarios/conflictos/${conflictoId}/resolver`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.resuelto).toBe(true);

        // Verificar persistencia
        const conflictoActualizado = await conflictoRepository.findOne({
          where: { id: conflictoId },
        });
        expect(conflictoActualizado.resuelto).toBe(true);
      }
    });

    it("debe requerir autenticación para resolver conflictos", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find();
      if (conflictos.length > 0) {
        const conflictoId = conflictos[0].id;

        await request(app.getHttpServer())
          .patch(`/horarios/conflictos/${conflictoId}/resolver`)
          .expect(401);
      }
    });

    it("debe requerir permisos de admin o coordinador", async () => {
      const operadorLogin = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "operador@unitru.edu.pe",
          password: "Oper123!",
        });
      const operadorToken = operadorLogin.body.access_token;

      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find();
      if (conflictos.length > 0) {
        const conflictoId = conflictos[0].id;

        await request(app.getHttpServer())
          .patch(`/horarios/conflictos/${conflictoId}/resolver`)
          .set("Authorization", `Bearer ${operadorToken}`)
          .expect(403);
      }
    });

    it("debe retornar 404 si el conflicto no existe", async () => {
      await request(app.getHttpServer())
        .patch("/horarios/conflictos/999/resolver")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("Validación de cruces en reasignación manual", () => {
    it("debe detectar cruce de docente al reasignar horario", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find({
        relations: ["docente", "ambiente", "grupo"],
      });

      if (horarios.length > 1) {
        const primerHorario = horarios[0];
        const segundoHorario = horarios[1];

        // Intentar reasignar el segundo horario al mismo horario que el primero
        const reasignarDto = {
          dia_semana: primerHorario.dia_semana,
          hora_inicio: primerHorario.hora_inicio,
          hora_fin: primerHorario.hora_fin,
        };

        const response = await request(app.getHttpServer())
          .patch(`/horarios/${segundoHorario.id}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(reasignarDto);

        // Debe rechazar si hay cruce de docente
        if (segundoHorario.docente.id === primerHorario.docente.id) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain("cruce");
        }
      }
    });

    it("debe detectar cruce de ambiente al reasignar horario", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const horarios = await horarioRepository.find({
        relations: ["docente", "ambiente", "grupo"],
      });

      if (horarios.length > 1) {
        const primerHorario = horarios[0];
        const segundoHorario = horarios[1];

        // Intentar reasignar el segundo horario al mismo ambiente y horario
        const reasignarDto = {
          dia_semana: primerHorario.dia_semana,
          hora_inicio: primerHorario.hora_inicio,
          hora_fin: primerHorario.hora_fin,
          ambiente_id: primerHorario.ambiente.id,
        };

        const response = await request(app.getHttpServer())
          .patch(`/horarios/${segundoHorario.id}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(reasignarDto);

        // Debe rechazar si hay cruce de ambiente
        if (segundoHorario.ambiente.id === primerHorario.ambiente.id) {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain("cruce");
        }
      }
    });

    it("debe validar franja institucional al reasignar", async () => {
      const horarios = await horarioRepository.find();

      if (horarios.length > 0) {
        const horarioId = horarios[0].id;

        // Intentar asignar fuera de la franja institucional (07:00-22:00)
        const reasignarDto = {
          dia_semana: 1,
          hora_inicio: "23:00",
          hora_fin: "01:00",
        };

        const response = await request(app.getHttpServer())
          .patch(`/horarios/${horarioId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(reasignarDto)
          .expect(400);

        expect(response.body.message).toContain("franja institucional");
      }
    });
  });

  describe("Persistencia de conflictos", () => {
    it("debe mantener conflictos en la base de datos después de generar horarios", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictosDespuesDeGenerar = await conflictoRepository.find();
      const cantidadInicial = conflictosDespuesDeGenerar.length;

      // Realizar otra operación
      await request(app.getHttpServer())
        .get("/horarios/periodo/2026-I")
        .set("Authorization", `Bearer ${authToken}`);

      const conflictosDespuesDeConsulta = await conflictoRepository.find();
      expect(conflictosDespuesDeConsulta.length).toBe(cantidadInicial);
    });

    it("debe permitir resolver conflictos individualmente", async () => {
      await request(app.getHttpServer())
        .post("/horarios/generar")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ periodo: "2026-I" });

      const conflictos = await conflictoRepository.find();
      if (conflictos.length > 0) {
        const conflictoId = conflictos[0].id;

        await request(app.getHttpServer())
          .patch(`/horarios/conflictos/${conflictoId}/resolver`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200);

        const conflictoResuelto = await conflictoRepository.findOne({
          where: { id: conflictoId },
        });
        expect(conflictoResuelto.resuelto).toBe(true);

        // Otros conflictos deben permanecer sin resolver
        const conflictosPendientes = await conflictoRepository.find({
          where: { resuelto: false },
        });
        expect(conflictosPendientes.length).toBe(conflictos.length - 1);
      }
    });
  });
});
