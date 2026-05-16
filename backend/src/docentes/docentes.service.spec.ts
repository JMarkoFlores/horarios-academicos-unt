import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocentesService } from "./docentes.service";
import { Docente } from "../entities/docente.entity";
import { CreateDocenteDto } from "./dto/create-docente.dto";
import { UpdateDocenteDto } from "./dto/update-docente.dto";
import { QueryDocenteDto } from "./dto/query-docente.dto";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";

describe("DocentesService", () => {
  let service: DocentesService;
  let docenteRepo: Repository<Docente>;

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
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockDocente: Docente = {
    id: 1,
    codigo: "D001",
    nombres: "Juan",
    apellidos: "Pérez",
    email: "juan.perez@unitru.edu.pe",
    categoria: CategoriaDocente.PRINCIPAL,
    tipo_contrato: TipoContrato.NOMBRADO,
    fecha_ingreso: new Date("2020-01-01"),
    activo: true,
  } as Docente;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocentesService,
        {
          provide: getRepositoryToken(Docente),
          useValue: mockDocenteRepo,
        },
      ],
    }).compile();

    service = module.get<DocentesService>(DocentesService);
    docenteRepo = module.get<Repository<Docente>>(getRepositoryToken(Docente));

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("debe retornar docentes paginados con antigüedad calculada", async () => {
      const query: QueryDocenteDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocente], 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [{ ...mockDocente, antiguedad: expect.any(Object) }],
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
      mockDocenteRepo.merge.mockReturnValue({ ...mockDocente, nombres: 'Updated' });
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente, nombres: 'Updated' });

      const result = await service.update(1, { nombres: 'Updated' });
      expect(result.nombres).toBe('Updated');
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
});
