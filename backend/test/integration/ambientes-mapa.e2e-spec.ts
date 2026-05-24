import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository, getMetadataArgsStorage } from "typeorm";
import * as request from "supertest";
import { AmbientesController } from "../../src/ambientes/ambientes.controller";
import { AmbientesService } from "../../src/ambientes/ambientes.service";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { JwtAuthGuard } from "../../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/auth/guards/roles.guard";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../../src/common/enums/estado-ambiente.enum";

function patchAmbienteEnumsForSqlite(): void {
  const metadata = getMetadataArgsStorage();
  const columns = metadata.columns.filter(
    (column) =>
      column.target === Ambiente &&
      ["tipo", "estado"].includes(String(column.propertyName)),
  );

  for (const column of columns) {
    if (column.options.type === "enum") {
      column.options.type = "simple-enum";
    }
  }
}

describe("GET /ambientes/mapa (e2e)", () => {
  let app: INestApplication;
  let ambienteRepository: Repository<Ambiente>;
  const mockHorarioRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };
  const mockPeriodoRepo = {
    findOne: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === "ALERTA_DISTANCIA_MAX" ? "50" : undefined,
    ),
  };

  beforeAll(async () => {
    patchAmbienteEnumsForSqlite();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          dropSchema: true,
          synchronize: true,
          entities: [Ambiente, Curso],
        }),
        TypeOrmModule.forFeature([Ambiente]),
      ],
      controllers: [AmbientesController],
      providers: [
        AmbientesService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: mockHorarioRepo,
        },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: mockPeriodoRepo,
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

    ambienteRepository = moduleFixture.get<Repository<Ambiente>>(
      getRepositoryToken(Ambiente),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await ambienteRepository.clear();

    await ambienteRepository.save([
      {
        codigo: "A-101",
        nombre: "Aula Norte",
        tipo: TipoAmbiente.AULA,
        capacidad: 40,
        edificio: "A",
        coordX: 0,
        coordY: 0,
        estado: EstadoAmbiente.ACTIVO,
        activo: true,
      },
      {
        codigo: "LAB-201",
        nombre: "Laboratorio Sur",
        tipo: TipoAmbiente.LABORATORIO,
        capacidad: 25,
        edificio: "A",
        coordX: 3,
        coordY: 4,
        estado: EstadoAmbiente.ACTIVO,
        activo: true,
      },
      {
        codigo: "AUD-001",
        nombre: "Auditorio Central",
        tipo: TipoAmbiente.AUDITORIO,
        capacidad: 120,
        edificio: "Edificio Central",
        coordX: null,
        coordY: null,
        estado: EstadoAmbiente.ACTIVO,
        activo: true,
      },
    ]);
  });

  it("debe retornar un array de ambientes con campos de mapa y null explícito cuando no hay coordenadas", async () => {
    const response = await request(app.getHttpServer())
      .get("/ambientes/mapa")
      .expect(200);

    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(3);

    for (const item of response.body.data) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("nombre");
      expect(item).toHaveProperty("coordX");
      expect(item).toHaveProperty("coordY");
      expect(item).toHaveProperty("edificio");
      expect(item).toHaveProperty("capacidad");
    }

    const ambienteSinCoordenadas = response.body.data.find(
      (item: { nombre: string }) => item.nombre === "Auditorio Central",
    );

    expect(ambienteSinCoordenadas).toBeDefined();
    expect(ambienteSinCoordenadas).toMatchObject({
      nombre: "Auditorio Central",
      coordX: null,
      coordY: null,
      edificio: "Edificio Central",
      capacidad: 120,
    });
  });

  it("debe responder 200 con los datos correctos en GET /ambientes/distancia", async () => {
    const ambientes = await ambienteRepository.find({
      order: { id: "ASC" },
    });

    const response = await request(app.getHttpServer())
      .get(
        `/ambientes/distancia?origenId=${ambientes[0].id}&destinoId=${ambientes[1].id}`,
      )
      .expect(200);

    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toEqual({
      distanciaUnidades: 5,
      mismoEdificio: true,
      alertaTraslado: false,
    });
  });

  it("debe responder 404 si algun ID no existe en GET /ambientes/distancia", async () => {
    const ambientes = await ambienteRepository.find({
      order: { id: "ASC" },
    });

    await request(app.getHttpServer())
      .get(`/ambientes/distancia?origenId=${ambientes[0].id}&destinoId=999999`)
      .expect(404);
  });
});
