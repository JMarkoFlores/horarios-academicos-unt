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

  const mockDocenteRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
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
    mockDocenteRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
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
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "docente.activo = :activo",
        { activo: true },
      );
    });

    it("debe filtrar por categoría", async () => {
      const query: QueryDocenteDto = {
        page: 1,
        limit: 10,
        categoria: CategoriaDocente.PRINCIPAL,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocente], 1]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "docente.categoria = :categoria",
        {
          categoria: CategoriaDocente.PRINCIPAL,
        },
      );
    });

    it("debe filtrar por tipo de contrato", async () => {
      const query: QueryDocenteDto = {
        page: 1,
        limit: 10,
        tipo_contrato: TipoContrato.NOMBRADO,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocente], 1]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "docente.tipo_contrato = :tipo_contrato",
        {
          tipo_contrato: TipoContrato.NOMBRADO,
        },
      );
    });

    it("debe filtrar por búsqueda de texto", async () => {
      const query: QueryDocenteDto = { page: 1, limit: 10, busqueda: "Juan" };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDocente], 1]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(docente.nombres ILIKE :busqueda OR docente.apellidos ILIKE :busqueda OR docente.codigo ILIKE :busqueda)",
        { busqueda: "%Juan%" },
      );
    });

    it("debe calcular correctamente totalPages", async () => {
      const query: QueryDocenteDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockDocente, mockDocente],
        25,
      ]);

      const result = await service.findAll(query);

      expect(result.totalPages).toBe(3);
    });
  });

  describe("findOne", () => {
    it("debe retornar un docente por ID con relaciones", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);

      const result = await service.findOne(1);

      expect(result).toEqual(mockDocente);
      expect(docenteRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["disponibilidades", "horarios", "colas"],
      });
    });

    it("debe lanzar NotFoundException si el docente no existe", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        "Docente con ID 999 no encontrado",
      );
    });
  });

  describe("findOrdenadosPorJerarquia", () => {
    it("debe retornar docentes ordenados por jerarquía", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockDocente]);

      const result = await service.findOrdenadosPorJerarquia("2026-I");

      expect(result).toEqual([
        {
          posicion: 1,
          ...mockDocente,
          antiguedad: expect.any(Object),
          periodo: "2026-I",
        },
      ]);
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "orden_jerarquia",
        "ASC",
      );
    });
  });

  describe("create", () => {
    const createDto: CreateDocenteDto = {
      codigo: "D002",
      nombres: "María",
      apellidos: "García",
      email: "maria.garcia@unitru.edu.pe",
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.CONTRATADO,
      fecha_ingreso: "2021-01-01",
    };

    it("debe crear un docente exitosamente", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(null);
      mockDocenteRepo.create.mockReturnValue({
        ...createDto,
        fecha_ingreso: new Date(createDto.fecha_ingreso),
        activo: true,
      });
      mockDocenteRepo.save.mockResolvedValue({
        id: 2,
        ...createDto,
        fecha_ingreso: new Date(createDto.fecha_ingreso),
        activo: true,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(docenteRepo.create).toHaveBeenCalledWith({
        ...createDto,
        fecha_ingreso: new Date(createDto.fecha_ingreso),
        activo: true,
      });
      expect(docenteRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar ConflictException si el email ya existe", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `El email '${createDto.email}' ya está registrado`,
      );
    });

    it("debe lanzar ConflictException si el código ya existe", async () => {
      const createDtoWithDifferentEmail = {
        ...createDto,
        email: "different@example.com",
      };

      const docenteWithSameCode = {
        ...mockDocente,
        email: "existing@example.com",
      };

      mockDocenteRepo.findOne.mockImplementation((options: any) => {
        if (options.where.email === createDtoWithDifferentEmail.email) {
          return Promise.resolve(null);
        }
        if (options.where.codigo === createDtoWithDifferentEmail.codigo) {
          return Promise.resolve(docenteWithSameCode);
        }
        return Promise.resolve(null);
      });

      await expect(service.create(createDtoWithDifferentEmail)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDtoWithDifferentEmail)).rejects.toThrow(
        `El código '${createDto.codigo}' ya está registrado`,
      );
    });
  });

  describe("update", () => {
    const updateDto: UpdateDocenteDto = {
      nombres: "María Updated",
      categoria: CategoriaDocente.PRINCIPAL,
    };

    it("debe actualizar un docente exitosamente", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);
      mockDocenteRepo.merge.mockReturnValue({ ...mockDocente, ...updateDto });
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(docenteRepo.merge).toHaveBeenCalled();
      expect(docenteRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar ConflictException si el nuevo email ya existe", async () => {
      const dtoWithEmail = { ...updateDto, email: "otro@unitru.edu.pe" };
      mockDocenteRepo.findOne
        .mockResolvedValueOnce(mockDocente)
        .mockResolvedValueOnce({ id: 999 } as Docente);

      await expect(service.update(1, dtoWithEmail)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, dtoWithEmail)).rejects.toThrow(
        `El email '${dtoWithEmail.email}' ya está en uso`,
      );
    });

    it("debe lanzar ConflictException si el nuevo código ya existe", async () => {
      const dtoWithCode = { ...updateDto, codigo: "D999" };
      mockDocenteRepo.findOne
        .mockResolvedValueOnce(mockDocente)
        .mockResolvedValueOnce({ id: 999 } as Docente);

      await expect(service.update(1, dtoWithCode)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, dtoWithCode)).rejects.toThrow(
        `El código '${dtoWithCode.codigo}' ya está en uso`,
      );
    });
  });

  describe("remove", () => {
    it("debe desactivar un docente (soft delete)", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(mockDocente);
      mockDocenteRepo.save.mockResolvedValue({ ...mockDocente, activo: false });

      await service.remove(1);

      expect(docenteRepo.save).toHaveBeenCalledWith({
        ...mockDocente,
        activo: false,
      });
    });

    it("debe lanzar NotFoundException si el docente no existe al eliminar", async () => {
      mockDocenteRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("calcularAntiguedad", () => {
    it("debe calcular antigüedad correctamente para un docente con varios años", () => {
      const fechaIngreso = new Date("2020-01-01");
      const resultado = service.calcularAntiguedad(fechaIngreso);

      expect(resultado.anios).toBeGreaterThan(0);
      expect(resultado.meses).toBeGreaterThanOrEqual(0);
      expect(resultado.anios).toBeLessThan(10);
    });

    it("debe calcular antigüedad para un docente reciente", () => {
      const fechaIngreso = new Date();
      fechaIngreso.setMonth(fechaIngreso.getMonth() - 6);
      const resultado = service.calcularAntiguedad(fechaIngreso);

      expect(resultado.anios).toBe(0);
      expect(resultado.meses).toBeGreaterThan(0);
    });

    it("debe retornar antigüedad cero para un docente nuevo", () => {
      const fechaIngreso = new Date();
      const resultado = service.calcularAntiguedad(fechaIngreso);

      expect(resultado.anios).toBe(0);
      expect(resultado.meses).toBe(0);
    });
  });
});
