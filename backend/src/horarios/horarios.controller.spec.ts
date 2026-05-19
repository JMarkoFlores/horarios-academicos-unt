import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuditoriaHorario } from "../entities/auditoria-horario.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { AsignacionService } from "./asignacion.service";
import { HorariosController } from "./horarios.controller";

describe("HorariosController (e2e)", () => {
  let app: INestApplication;

  const mockAsignacionService = {
    generarHorario: jest.fn(),
    limpiarHorario: jest.fn(),
    reasignarManual: jest.fn(),
  };

  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockHorarioRepo = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditoriaRepo = {
    create: jest.fn((x) => x),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HorariosController],
      providers: [
        { provide: AsignacionService, useValue: mockAsignacionService },
        { provide: getRepositoryToken(HorarioAsignado), useValue: mockHorarioRepo },
        { provide: getRepositoryToken(AuditoriaHorario), useValue: mockAuditoriaRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /horarios/generar", async () => {
    mockAsignacionService.generarHorario.mockResolvedValue({
      asignaciones_creadas: 2,
      conflictos: 0,
      detalle_conflictos: [],
    });

    const response = await request(app.getHttpServer())
      .post("/horarios/generar")
      .send({ periodo: "2026-I" })
      .expect(201);

    expect(response.body.message).toBe("Horario generado");
    expect(response.body.statusCode).toBe(201);
  });

  it("DELETE /horarios/limpiar", async () => {
    mockAsignacionService.limpiarHorario.mockResolvedValue({ eliminados: 3 });

    const response = await request(app.getHttpServer())
      .delete("/horarios/limpiar?periodo=2026-I")
      .expect(200);

    expect(response.body.data).toEqual({ eliminados: 3 });
  });

  it("GET /horarios/periodo/:periodo", async () => {
    qb.getMany.mockResolvedValue([{ id: 1 }]);

    const response = await request(app.getHttpServer())
      .get("/horarios/periodo/2026-I?estado=CONFIRMADO&tipo_clase=TEORIA")
      .expect(200);

    expect(response.body.data).toEqual([{ id: 1 }]);
    expect(mockHorarioRepo.createQueryBuilder).toHaveBeenCalledWith("horario");
  });

  it("PATCH /horarios/conflictos/:id/resolver", async () => {
    mockHorarioRepo.findOne.mockResolvedValue({
      id: 7,
      estado: "CONFLICTO",
      dia: 2,
      hora_inicio: "08:00",
      hora_fin: "09:00",
      ambiente_id: 1,
    });
    mockHorarioRepo.save.mockResolvedValue({
      id: 7,
      estado: "BORRADOR",
      dia: 2,
      hora_inicio: "08:00",
      hora_fin: "09:00",
      ambiente_id: 1,
    });

    const response = await request(app.getHttpServer())
      .patch("/horarios/conflictos/7/resolver")
      .send({ motivo: "ajuste" })
      .expect(200);

    expect(response.body.data.estado).toBe("BORRADOR");
    expect(mockAuditoriaRepo.save).toHaveBeenCalled();
  });
});
