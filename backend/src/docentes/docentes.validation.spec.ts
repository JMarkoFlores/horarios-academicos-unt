import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { DocentesService } from "./docentes.service";
import { Docente } from "../entities/docente.entity";
import { DocenteCurso } from "../entities/docente-curso.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { ParametrosCarga } from "../entities/parametros-carga.entity";
import { CreateDocenteDto } from "./dto/create-docente.dto";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";

const HORAS_MIN = 4;
const HORAS_MAX = 20;

const mockParametros: Partial<ParametrosCarga> = {
  id: 1,
  modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
  tipo_docente: "",
  categoria: "",
  horas_min_semanal: HORAS_MIN,
  horas_max_semanal: HORAS_MAX,
  cursos_min_docente: 1,
  cursos_max_docente: 5,
};

const mockDocente: Partial<Docente> = {
  id: 99,
  codigo: "D099",
  nombres: "Ana",
  apellidos: "Torres",
  email: "ana.torres@unitru.edu.pe",
  categoria: CategoriaDocente.PRINCIPAL,
  tipo_docente: TipoDocente.ORDINARIO,
  tipo_contrato: TipoContrato.NOMBRADO,
  modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
  fecha_ingreso: new Date("2018-03-01"),
  activo: true,
  horas_asignadas: 0,
};

const baseDto: CreateDocenteDto = {
  codigo: "D099",
  nombres: "Ana",
  apellidos: "Torres",
  email: "ana.torres@unitru.edu.pe",
  tipo_docente: TipoDocente.ORDINARIO,
  categoria: CategoriaDocente.PRINCIPAL,
  modalidad: ModalidadDocente.TIEMPO_COMPLETO_40,
  fecha_ingreso: "2018-03-01",
};

describe("DocentesService — validación de carga horaria por modalidad", () => {
  let service: DocentesService;

  const mockParametrosQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockDocenteQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockDocenteRepo = {
    createQueryBuilder: jest.fn(() => mockDocenteQb),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 99, ...entity })),
    merge: jest.fn(),
  };

  const mockParametrosCargaRepo = {
    createQueryBuilder: jest.fn(() => mockParametrosQb),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocentesService,
        { provide: getRepositoryToken(Docente), useValue: mockDocenteRepo },
        {
          provide: getRepositoryToken(DocenteCurso),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Curso),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Ambiente),
          useValue: { createQueryBuilder: jest.fn(() => mockDocenteQb) },
        },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ParametrosCarga),
          useValue: mockParametrosCargaRepo,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<DocentesService>(DocentesService);
    jest.clearAllMocks();
  });

  describe("create — validación de horas contra ParametrosCarga", () => {
    beforeEach(() => {
      mockDocenteRepo.findOne.mockResolvedValue(null);
      mockParametrosCargaRepo.createQueryBuilder.mockReturnValue(
        mockParametrosQb,
      );
      mockParametrosQb.where.mockReturnThis();
      mockParametrosQb.andWhere.mockReturnThis();
      mockParametrosQb.orderBy.mockReturnThis();
      mockParametrosQb.addOrderBy.mockReturnThis();
    });

    it("debe lanzar BadRequestException cuando horasSolicitadas supera horasMaximas", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      const dto: CreateDocenteDto = {
        ...baseDto,
        horas_asignadas: HORAS_MAX + 1,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        /fuera del rango permitido/,
      );
    });

    it("debe lanzar BadRequestException cuando horasSolicitadas es menor a horasMinimas", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      const dto: CreateDocenteDto = {
        ...baseDto,
        horas_asignadas: HORAS_MIN - 1,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        /fuera del rango permitido/,
      );
    });

    it("debe retornar el docente creado cuando horasSolicitadas está dentro del rango", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);
      mockDocenteRepo.create.mockReturnValue({ ...mockDocente });
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente });

      const dto: CreateDocenteDto = {
        ...baseDto,
        horas_asignadas: 12,
      };

      const result = await service.create(dto);

      expect(result).toMatchObject({ email: baseDto.email });
      expect(mockDocenteRepo.save).toHaveBeenCalledTimes(1);
    });

    it("debe crear el docente sin validar horas cuando no se envía horas_asignadas", async () => {
      mockDocenteRepo.create.mockReturnValue({ ...mockDocente });
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente });

      const dto: CreateDocenteDto = { ...baseDto };

      const result = await service.create(dto);

      expect(result).toMatchObject({ email: baseDto.email });
      expect(mockParametrosCargaRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe("validarCargaModalidad — método público", () => {
    beforeEach(() => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente as Docente);
      mockParametrosCargaRepo.createQueryBuilder.mockReturnValue(
        mockParametrosQb,
      );
      mockParametrosQb.where.mockReturnThis();
      mockParametrosQb.andWhere.mockReturnThis();
      mockParametrosQb.orderBy.mockReturnThis();
      mockParametrosQb.addOrderBy.mockReturnThis();
    });

    it("debe lanzar BadRequestException si horas supera el máximo", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      await expect(
        service.validarCargaModalidad(
          99,
          HORAS_MAX + 5,
          ModalidadDocente.TIEMPO_COMPLETO_40,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe lanzar BadRequestException si horas es menor al mínimo", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      await expect(
        service.validarCargaModalidad(
          99,
          HORAS_MIN - 1,
          ModalidadDocente.TIEMPO_COMPLETO_40,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe resolver sin error cuando horas está en el límite inferior exacto", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      await expect(
        service.validarCargaModalidad(
          99,
          HORAS_MIN,
          ModalidadDocente.TIEMPO_COMPLETO_40,
        ),
      ).resolves.toBeUndefined();
    });

    it("debe resolver sin error cuando horas está en el límite superior exacto", async () => {
      mockParametrosQb.getOne.mockResolvedValue(mockParametros);

      await expect(
        service.validarCargaModalidad(
          99,
          HORAS_MAX,
          ModalidadDocente.TIEMPO_COMPLETO_40,
        ),
      ).resolves.toBeUndefined();
    });

    it("debe resolver sin error si no existen parámetros configurados para la modalidad", async () => {
      mockParametrosQb.getOne.mockResolvedValue(null);

      await expect(
        service.validarCargaModalidad(
          99,
          999,
          ModalidadDocente.DEDICACION_EXCLUSIVA,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
