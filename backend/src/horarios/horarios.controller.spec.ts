import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { HorariosController } from "./horarios.controller";
import { HorariosService } from "./horarios.service";
import { AsignacionService } from "./asignacion.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

describe("HorariosController (e2e)", () => {
  let app: INestApplication;
  let horariosService: HorariosService;
  let asignacionService: AsignacionService;

  const mockHorariosService = {
    findAllByPeriodo: jest.fn(),
    findByDocente: jest.fn(),
    findByAmbiente: jest.fn(),
    findConflictos: jest.fn(),
    resolverConflicto: jest.fn(),
    reasignarManual: jest.fn(),
  };

  const mockAsignacionService = {
    generarHorario: jest.fn(),
    limpiarHorario: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HorariosController],
      providers: [
        {
          provide: HorariosService,
          useValue: mockHorariosService,
        },
        {
          provide: AsignacionService,
          useValue: mockAsignacionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    horariosService = module.get<HorariosService>(HorariosService);
    asignacionService = module.get<AsignacionService>(AsignacionService);

    await app.init();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /horarios/periodo/:periodo", () => {
    it("debe retornar horarios de un período", async () => {
      const mockHorarios = [
        {
          id: 1,
          dia_semana: 1,
          hora_inicio: "08:00",
          hora_fin: "10:00",
          periodo_academico: "2026-I",
        },
      ];
      mockHorariosService.findAllByPeriodo.mockResolvedValue(mockHorarios);

      const response = await request(app.getHttpServer())
        .get("/horarios/periodo/2026-I")
        .expect(200);

      expect(response.body).toEqual({
        data: mockHorarios,
        message: "Horario del período obtenido",
      });
      expect(horariosService.findAllByPeriodo).toHaveBeenCalledWith("2026-I");
    });
  });

  describe("GET /horarios/docente/:id", () => {
    it("debe retornar horarios de un docente", async () => {
      const mockHorarios = [
        {
          id: 1,
          dia_semana: 1,
          hora_inicio: "08:00",
          hora_fin: "10:00",
          docente: { id: 1, nombre: "Dr. Test" },
        },
      ];
      mockHorariosService.findByDocente.mockResolvedValue(mockHorarios);

      const response = await request(app.getHttpServer())
        .get("/horarios/docente/1?periodo=2026-I")
        .expect(200);

      expect(response.body).toEqual({
        data: mockHorarios,
        message: "Horario del docente obtenido",
      });
      expect(horariosService.findByDocente).toHaveBeenCalledWith(1, "2026-I");
    });
  });

  describe("GET /horarios/ambiente/:id", () => {
    it("debe retornar horarios de un ambiente", async () => {
      const mockHorarios = [
        {
          id: 1,
          dia_semana: 1,
          hora_inicio: "08:00",
          hora_fin: "10:00",
          ambiente: { id: 1, codigo: "A-101" },
        },
      ];
      mockHorariosService.findByAmbiente.mockResolvedValue(mockHorarios);

      const response = await request(app.getHttpServer())
        .get("/horarios/ambiente/1?periodo=2026-I")
        .expect(200);

      expect(response.body).toEqual({
        data: mockHorarios,
        message: "Horario del ambiente obtenido",
      });
      expect(horariosService.findByAmbiente).toHaveBeenCalledWith(1, "2026-I");
    });
  });

  describe("GET /horarios/conflictos/:periodo", () => {
    it("debe retornar conflictos de un período", async () => {
      const mockConflictos = [
        {
          id: 1,
          resuelto: false,
          docente: { id: 1, nombre: "Dr. Test" },
        },
      ];
      mockHorariosService.findConflictos.mockResolvedValue(mockConflictos);

      const response = await request(app.getHttpServer())
        .get("/horarios/conflictos/2026-I")
        .expect(200);

      expect(response.body).toEqual({
        data: mockConflictos,
        message: "Conflictos obtenidos",
      });
      expect(horariosService.findConflictos).toHaveBeenCalledWith("2026-I");
    });
  });

  describe("PATCH /horarios/conflictos/:id/resolver", () => {
    it("debe marcar un conflicto como resuelto", async () => {
      const mockConflictoResuelto = {
        id: 1,
        resuelto: true,
      };
      mockHorariosService.resolverConflicto.mockResolvedValue(
        mockConflictoResuelto,
      );

      const response = await request(app.getHttpServer())
        .patch("/horarios/conflictos/1/resolver")
        .expect(200);

      expect(response.body).toEqual({
        data: mockConflictoResuelto,
        message: "Conflicto marcado como resuelto",
      });
      expect(horariosService.resolverConflicto).toHaveBeenCalledWith(1);
    });
  });

  describe("PATCH /horarios/:id", () => {
    it("debe reasignar un horario manualmente", async () => {
      const mockHorarioReasignado = {
        id: 1,
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
      };
      const reasignarDto = {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        ambiente_id: 2,
      };
      mockHorariosService.reasignarManual.mockResolvedValue(
        mockHorarioReasignado,
      );

      const response = await request(app.getHttpServer())
        .patch("/horarios/1")
        .send(reasignarDto)
        .expect(200);

      expect(response.body).toEqual({
        data: mockHorarioReasignado,
        message: "Horario reasignado correctamente",
      });
      expect(horariosService.reasignarManual).toHaveBeenCalledWith(
        1,
        reasignarDto,
      );
    });
  });

  describe("POST /horarios/generar", () => {
    it("debe generar horario para un período", async () => {
      const mockResult = {
        asignaciones_creadas: 100,
        conflictos: 5,
      };
      const generarDto = { periodo: "2026-I" };
      mockAsignacionService.generarHorario.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post("/horarios/generar")
        .send(generarDto)
        .expect(201);

      expect(response.body).toEqual({
        data: mockResult,
        message: "Horario generado: 100 asignaciones, 5 conflictos",
      });
      expect(asignacionService.generarHorario).toHaveBeenCalledWith("2026-I");
    });
  });

  describe("DELETE /horarios/limpiar", () => {
    it("debe limpiar horario de un período", async () => {
      const mockResult = { eliminados: 100 };
      const limpiarDto = { periodo: "2026-I" };
      mockAsignacionService.limpiarHorario.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .delete("/horarios/limpiar")
        .send(limpiarDto)
        .expect(200);

      expect(response.body).toEqual({
        data: mockResult,
        message: "Período 2026-I limpiado",
      });
      expect(asignacionService.limpiarHorario).toHaveBeenCalledWith("2026-I");
    });
  });
});
