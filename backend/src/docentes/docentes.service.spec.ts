import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocentesService } from "./docentes.service";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { QueryDocenteDto } from "./dto/query-docente.dto";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

describe("DocentesService", () => {
  let service: DocentesService;
  let docenteRepo: Repository<Docente>;
  let docenteCursoRepo: Repository<DocenteCurso>;
  let cursoRepo: Repository<Curso>;
  let ambienteRepo: Repository<Ambiente>;
  let horarioRepo: Repository<HorarioAsignado>;
  let periodoRepo: Repository<PeriodoAcademico>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockDocenteRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockDocenteCursoRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
  };

  const mockHorarioRepo = {
    find: jest.fn(),
  };

  const mockPeriodoRepo = {
    findOne: jest.fn(),
  };

  const mockParametrosCargaRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCacheManager = {
    del: jest.fn(),
  };

  const mockDocente: Docente = {
    id: 1,
    codigo: "D001",
    nombres: "Juan",
    apellidos: "Pérez",
    email: "juan.perez@unitru.edu.pe",
    categoria: CategoriaDocente.PRINCIPAL,
    tipo_docente: TipoDocente.ORDINARIO,
    tipo_contrato: TipoContrato.NOMBRADO,
    fecha_ingreso: new Date("2020-01-01"),
    activo: true,
  } as Docente;

  const mockCurso: Curso = {
    id: 10,
    codigo: "C001",
    nombre: "Cálculo I",
    creditos: 4,
    horas_teoria: 3,
    horas_laboratorio: 2,
    ciclo: 1,
    tiene_laboratorio: true,
    activo: true,
  } as Curso;

  const mockDocenteCurso: DocenteCurso = {
    id: 100,
    docenteId: 1,
    cursoId: 10,
    tipo_clase: TipoClase.TEORIA,
    periodoId: null,
    periodo: null,
    docente: mockDocente,
    curso: mockCurso,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
    }).compile();

    service = module.get<DocentesService>(DocentesService);
    docenteRepo = module.get<Repository<Docente>>(getRepositoryToken(Docente));
    docenteCursoRepo = module.get<Repository<DocenteCurso>>(
      getRepositoryToken(DocenteCurso),
    );
    cursoRepo = module.get<Repository<Curso>>(getRepositoryToken(Curso));
    ambienteRepo = module.get<Repository<Ambiente>>(
      getRepositoryToken(Ambiente),
    );
    horarioRepo = module.get<Repository<HorarioAsignado>>(
      getRepositoryToken(HorarioAsignado),
    );
    periodoRepo = module.get<Repository<PeriodoAcademico>>(
      getRepositoryToken(PeriodoAcademico),
    );

    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) =>
      key === "UMBRAL_DESEQUILIBRIO" ? "4" : undefined,
    );
  });

  describe("findAll", () => {
    it("debe retornar docentes paginados con antigüedad calculada", async () => {
      const query: QueryDocenteDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocente], 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [{ ...mockDocente, antiguedad: expect.any(Object) }],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe("findOne", () => {
    it("debe retornar un docente por ID con relaciones", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);

      const result = await service.findOne(1);

      expect(result).toEqual(mockDocente);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si el docente no existe", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("debe actualizar un docente exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockDocenteRepo.merge.mockReturnValue({
        ...mockDocente,
        nombres: "Updated",
      });
      mockDocenteRepo.save.mockResolvedValue({
        ...mockDocente,
        nombres: "Updated",
      });

      const result = await service.update(1, { nombres: "Updated" });
      expect(result.nombres).toBe("Updated");
    });
  });

  describe("remove", () => {
    it("debe desactivar un docente (soft delete)", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente, activo: false });

      await service.remove(1);
      expect(mockDocenteRepo.save).toHaveBeenCalled();
    });
  });

  describe("asignarCursos", () => {
    it("debe asignar cursos exitosamente a un docente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockCursoRepo.findOne.mockResolvedValue(mockCurso);
      mockDocenteCursoRepo.find.mockResolvedValue([]);
      mockDocenteCursoRepo.findOne.mockResolvedValue(null);
      mockDocenteCursoRepo.create.mockReturnValue(mockDocenteCurso);
      mockDocenteCursoRepo.save.mockResolvedValue(mockDocenteCurso);

      const payload = {
        cursos: [{ cursoId: 10, tipo_clase: TipoClase.TEORIA }],
      };

      const result = await service.asignarCursos(1, payload);

      expect(result).toEqual([mockDocenteCurso]);
      expect(mockCursoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10, activo: true },
      });
      expect(mockDocenteCursoRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si el curso no existe", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockCursoRepo.findOne.mockResolvedValue(null);
      mockDocenteCursoRepo.find.mockResolvedValue([]);

      const payload = {
        cursos: [{ cursoId: 999, tipo_clase: TipoClase.TEORIA }],
      };

      await expect(service.asignarCursos(1, payload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findCursosHabilitados", () => {
    it("debe retornar cursos habilitados para un docente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockQueryBuilder.getMany.mockResolvedValue([mockDocenteCurso]);

      const result = await service.findCursosHabilitados(1, TipoClase.TEORIA);

      expect(result).toEqual([
        {
          id: 100,
          cursoId: 10,
          tipo_clase: TipoClase.TEORIA,
          curso: mockCurso,
        },
      ]);
    });
  });

  describe("removeAsignacion", () => {
    it("debe eliminar una asignación exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockDocenteCursoRepo.findOne.mockResolvedValue(mockDocenteCurso);
      mockDocenteCursoRepo.remove.mockResolvedValue(mockDocenteCurso);

      await service.removeAsignacion(1, 10, TipoClase.TEORIA);

      expect(mockDocenteCursoRepo.remove).toHaveBeenCalledWith(
        mockDocenteCurso,
      );
    });

    it("debe lanzar NotFoundException si la asignación no existe", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockDocente);
      mockDocenteCursoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeAsignacion(1, 999, TipoClase.TEORIA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("analisis de carga horaria", () => {
    const horariosCarga = [
      { dia: 1, hora_inicio: "08:00:00", hora_fin: "10:00:00" },
      { dia: 1, hora_inicio: "10:00:00", hora_fin: "12:00:00" },
      { dia: 2, hora_inicio: "08:00:00", hora_fin: "10:00:00" },
      { dia: 2, hora_inicio: "10:00:00", hora_fin: "12:00:00" },
      { dia: 2, hora_inicio: "14:00:00", hora_fin: "16:00:00" },
      { dia: 3, hora_inicio: "09:00:00", hora_fin: "10:00:00" },
    ] as HorarioAsignado[];

    it("Caso 1: retorna la carga por día agrupada correctamente", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);
      mockPeriodoRepo.findOne.mockResolvedValue({
        id: 1,
        codigo: "PERIODO-TEST",
      } as PeriodoAcademico);
      mockHorarioRepo.find.mockResolvedValue(horariosCarga);

      const result = await service.getCargaPorDia(1, "PERIODO-TEST");

      expect(result).toMatchObject({
        lunes: 4,
        martes: 6,
        miercoles: 1,
        jueves: 0,
        viernes: 0,
        sabado: 0,
        totalHoras: 11,
      });
    });

    it("Caso 2: detecta docente con carga desequilibrada", async () => {
      mockPeriodoRepo.findOne.mockResolvedValue({
        id: 1,
        codigo: "PERIODO-TEST",
      } as PeriodoAcademico);
      mockDocenteRepo.find.mockResolvedValue([mockDocente]);
      mockHorarioRepo.find.mockResolvedValue(
        horariosCarga.map((horario) => ({
          ...horario,
          docente_id: 1,
        })) as HorarioAsignado[],
      );

      const result = await service.getCargaDesequilibrada("PERIODO-TEST");

      expect(result).toEqual([
        {
          docenteId: 1,
          nombre: "Juan Pérez",
          distribucion: expect.objectContaining({
            lunes: 4,
            martes: 6,
            miercoles: 1,
            jueves: 0,
            viernes: 0,
            sabado: 0,
            totalHoras: 11,
          }),
          desequilibrio: 6,
        },
      ]);
    });

    it("Caso 3: no incluye docente equilibrado en la lista de desequilibrio", async () => {
      mockPeriodoRepo.findOne.mockResolvedValue({
        id: 1,
        codigo: "PERIODO-TEST",
      } as PeriodoAcademico);
      mockDocenteRepo.find.mockResolvedValue([mockDocente]);
      mockHorarioRepo.find.mockResolvedValue(
        [
          { docente_id: 1, dia: 1, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
          { docente_id: 1, dia: 2, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
          { docente_id: 1, dia: 3, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
          { docente_id: 1, dia: 4, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
          { docente_id: 1, dia: 5, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
          { docente_id: 1, dia: 6, hora_inicio: "08:00:00", hora_fin: "11:00:00" },
        ] as HorarioAsignado[],
      );

      const result = await service.getCargaDesequilibrada("PERIODO-TEST");

      expect(result).toEqual([]);
    });

    it("Caso 4: retorna todos los días en 0 cuando el período no tiene horarios", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);
      mockPeriodoRepo.findOne.mockResolvedValue({
        id: 1,
        codigo: "PERIODO-TEST",
      } as PeriodoAcademico);
      mockHorarioRepo.find.mockResolvedValue([]);

      const result = await service.getCargaPorDia(1, "PERIODO-TEST");

      expect(result).toEqual({
        lunes: 0,
        martes: 0,
        miercoles: 0,
        jueves: 0,
        viernes: 0,
        sabado: 0,
        totalHoras: 0,
        promedioHorasPorDia: 0,
      });
    });
  });
});
