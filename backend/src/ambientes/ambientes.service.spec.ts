import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AmbientesService } from "./ambientes.service";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoAmbiente } from "../common/enums/estado-ambiente.enum";

describe("AmbientesService", () => {
  let service: AmbientesService;
  let ambienteRepo: jest.Mocked<Repository<Ambiente>>;
  let horarioRepo: jest.Mocked<Repository<HorarioAsignado>>;
  let periodoRepo: jest.Mocked<Repository<PeriodoAcademico>>;
  let configService: jest.Mocked<ConfigService>;

  const mockAmbienteRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockHorarioRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const mockPeriodoRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const crearAmbiente = (overrides: Partial<Ambiente> = {}): Ambiente =>
    ({
      id: 1,
      codigo: "A-101",
      nombre: "Aula 101",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      piso: 1,
      pabellon: "P1",
      edificio: "Edificio A",
      coordX: 0,
      coordY: 0,
      sede: "Central",
      equipamiento: null,
      estado: EstadoAmbiente.ACTIVO,
      activo: true,
      cursos: [],
      ...overrides,
    }) as Ambiente;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmbientesService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      ],
    }).compile();

    service = module.get<AmbientesService>(AmbientesService);
    ambienteRepo = module.get(getRepositoryToken(Ambiente));
    horarioRepo = module.get(getRepositoryToken(HorarioAsignado));
    periodoRepo = module.get(getRepositoryToken(PeriodoAcademico));
    configService = module.get(ConfigService);

    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) =>
      key === "ALERTA_DISTANCIA_MAX" ? "50" : undefined,
    );
  });

  it("Caso 1: retorna distancia 5, mismo edificio y sin alerta", async () => {
    ambienteRepo.findOne
      .mockResolvedValueOnce(crearAmbiente({ id: 1, coordX: 0, coordY: 0 }))
      .mockResolvedValueOnce(
        crearAmbiente({
          id: 2,
          codigo: "A-201",
          nombre: "Aula 201",
          coordX: 3,
          coordY: 4,
        }),
      );

    const result = await service.getDistanciaEntreAmbientes(1, 2);

    expect(result).toEqual({
      distanciaUnidades: 5,
      mismoEdificio: true,
      alertaTraslado: false,
    });
  });

  it("Caso 2: activa alerta cuando los edificios son distintos aunque la distancia sea 0", async () => {
    ambienteRepo.findOne
      .mockResolvedValueOnce(
        crearAmbiente({ id: 3, edificio: "A", coordX: 0, coordY: 0 }),
      )
      .mockResolvedValueOnce(
        crearAmbiente({
          id: 4,
          codigo: "B-001",
          nombre: "Ambiente B",
          edificio: "B",
          coordX: 0,
          coordY: 0,
        }),
      );

    const result = await service.getDistanciaEntreAmbientes(3, 4);

    expect(result).toEqual({
      distanciaUnidades: 0,
      mismoEdificio: false,
      alertaTraslado: true,
    });
  });

  it("Caso 3: activa alerta cuando la distancia supera el umbral por defecto", async () => {
    ambienteRepo.findOne
      .mockResolvedValueOnce(crearAmbiente({ id: 5, edificio: "A", coordX: 0, coordY: 0 }))
      .mockResolvedValueOnce(
        crearAmbiente({
          id: 6,
          codigo: "A-601",
          nombre: "Ambiente Lejano",
          edificio: "A",
          coordX: 0,
          coordY: 60,
        }),
      );

    const result = await service.getDistanciaEntreAmbientes(5, 6);

    expect(result).toEqual({
      distanciaUnidades: 60,
      mismoEdificio: true,
      alertaTraslado: true,
    });
  });

  it("Caso 4: retorna null en distancia cuando falta coordenada", async () => {
    ambienteRepo.findOne
      .mockResolvedValueOnce(
        crearAmbiente({ id: 1, edificio: "Edificio B", coordX: null, coordY: null }),
      )
      .mockResolvedValueOnce(
        crearAmbiente({ id: 2, codigo: "B-102", nombre: "Aula 102", edificio: "Edificio B" }),
      );

    const result = await service.getDistanciaEntreAmbientes(1, 2);

    expect(result).toEqual({
      distanciaUnidades: null,
      mismoEdificio: true,
      alertaTraslado: false,
    });
  });

  it("retorna alertas para horarios consecutivos y omite traslados sin coordenadas", async () => {
    periodoRepo.findOne.mockResolvedValue({
      id: 10,
      codigo: "2026-I",
    } as PeriodoAcademico);

    horarioRepo.find.mockResolvedValue([
      {
        id: 1,
        dia: 1,
        hora_inicio: "08:00:00",
        hora_fin: "10:00:00",
        ambiente: crearAmbiente({
          id: 1,
          nombre: "Aula Norte",
          edificio: "Edificio A",
          coordX: 0,
          coordY: 0,
        }),
      },
      {
        id: 2,
        dia: 1,
        hora_inicio: "10:20:00",
        hora_fin: "12:00:00",
        ambiente: crearAmbiente({
          id: 2,
          codigo: "B-201",
          nombre: "Laboratorio Sur",
          edificio: "Edificio B",
          coordX: 0,
          coordY: 60,
        }),
      },
      {
        id: 3,
        dia: 2,
        hora_inicio: "08:00:00",
        hora_fin: "09:00:00",
        ambiente: crearAmbiente({
          id: 3,
          codigo: "C-301",
          nombre: "Aula sin coordenadas",
          edificio: "Edificio C",
          coordX: null,
          coordY: null,
        }),
      },
      {
        id: 4,
        dia: 2,
        hora_inicio: "09:10:00",
        hora_fin: "10:00:00",
        ambiente: crearAmbiente({
          id: 4,
          codigo: "C-302",
          nombre: "Aula destino",
          edificio: "Edificio C",
          coordX: 10,
          coordY: 10,
        }),
      },
    ] as HorarioAsignado[]);

    const result = await service.getAlertasTrasladoDocente(25, 10);

    expect(periodoRepo.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(horarioRepo.find).toHaveBeenCalledWith({
      where: {
        docente_id: 25,
        periodo: "2026-I",
      },
      relations: ["ambiente"],
      order: {
        dia: "ASC",
        hora_inicio: "ASC",
      },
    });
    expect(result).toEqual([
      {
        dia: "Lunes",
        horaFin: "10:00",
        ambienteOrigen: "Aula Norte",
        ambienteDestino: "Laboratorio Sur",
        distancia: 60,
        alerta: true,
      },
    ]);
  });

  it("lanza error cuando el periodo no existe", async () => {
    periodoRepo.findOne.mockResolvedValue(null);

    await expect(service.getAlertasTrasladoDocente(25, 999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
