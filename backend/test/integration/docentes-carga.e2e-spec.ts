import { INestApplication } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as request from "supertest";
import { DocentesController } from "../../src/docentes/docentes.controller";
import { DocentesService } from "../../src/docentes/docentes.service";
import { JwtAuthGuard } from "../../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/auth/guards/roles.guard";
import { Docente } from "../../src/entities/docente.entity";
import { DocenteCurso } from "../../src/entities/docente-curso.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { ParametrosCarga } from "../../src/entities/parametros-carga.entity";

describe("GET /docentes/carga-desequilibrada (e2e)", () => {
  let app: INestApplication;

  const mockDocenteRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    merge: jest.fn(),
  };

  const mockDocenteCursoRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockCursoRepo = {
    findOne: jest.fn(),
  };

  const mockAmbienteRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockHorarioRepo = {
    find: jest.fn(),
  };

  const mockPeriodoRepo = {
    findOne: jest.fn(),
  };

  const mockParametrosCargaRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === "UMBRAL_DESEQUILIBRIO" ? "4" : undefined,
    ),
  };

  const mockCacheManager = {
    del: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DocentesController],
      providers: [
        DocentesService,
        {
          provide: getRepositoryToken(Docente),
          useValue: mockDocenteRepo,
        },
        {
          provide: getRepositoryToken(DocenteCurso),
          useValue: mockDocenteCursoRepo,
        },
        {
          provide: getRepositoryToken(Curso),
          useValue: mockCursoRepo,
        },
        {
          provide: getRepositoryToken(Ambiente),
          useValue: mockAmbienteRepo,
        },
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: mockHorarioRepo,
        },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: mockPeriodoRepo,
        },
        {
          provide: getRepositoryToken(ParametrosCarga),
          useValue: mockParametrosCargaRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPeriodoRepo.findOne.mockResolvedValue({
      id: 1,
      codigo: "PERIODO-TEST",
    } as PeriodoAcademico);
    mockDocenteRepo.find.mockResolvedValue([]);
    mockHorarioRepo.find.mockResolvedValue([]);
  });

  it("debe responder 200 y retornar un array", async () => {
    const response = await request(app.getHttpServer())
      .get("/docentes/carga-desequilibrada?periodo=1")
      .expect(200);

    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
