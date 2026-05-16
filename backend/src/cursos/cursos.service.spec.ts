import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CursosService } from "./cursos.service";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { CreateCursoDto } from "./dto/create-curso.dto";
import { UpdateCursoDto } from "./dto/update-curso.dto";
import { QueryCursoDto } from "./dto/query-curso.dto";

describe("CursosService", () => {
  let service: CursosService;
  let cursoRepo: Repository<Curso>;
  let ambienteRepo: Repository<Ambiente>;

  const mockCursoRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockAmbienteRepo = {
    find: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockCurso: Curso = {
    id: 1,
    codigo: "CS101",
    nombre: "Introduction to Computer Science",
    ciclo: 1,
    creditos: 4,
    horas_teoria: 2,
    horas_laboratorio: 2,
    tiene_laboratorio: true,
    activo: true,
    prerequisitos: null,
    ambientes: [],
  } as Curso;

  const mockAmbiente: Ambiente = {
    id: 1,
    codigo: "LAB-101",
    capacidad: 30,
    tipo: TipoAmbiente.LABORATORIO,
    activo: true,
  } as Ambiente;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CursosService,
        {
          provide: getRepositoryToken(Curso),
          useValue: mockCursoRepo,
        },
        {
          provide: getRepositoryToken(Ambiente),
          useValue: mockAmbienteRepo,
        },
      ],
    }).compile();

    service = module.get<CursosService>(CursosService);
    cursoRepo = module.get<Repository<Curso>>(getRepositoryToken(Curso));
    ambienteRepo = module.get<Repository<Ambiente>>(
      getRepositoryToken(Ambiente),
    );

    jest.clearAllMocks();
    mockCursoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe("findAll", () => {
    it("debe retornar cursos paginados", async () => {
      const query: QueryCursoDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCurso], 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        items: [mockCurso],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "curso.activo = :activo",
        { activo: true },
      );
    });

    it("debe filtrar por ciclo", async () => {
      const query: QueryCursoDto = { page: 1, limit: 10, ciclo: 2 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCurso], 1]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "curso.ciclo = :ciclo",
        { ciclo: 2 },
      );
    });

    it("debe filtrar por tiene_laboratorio", async () => {
      const query: QueryCursoDto = {
        page: 1,
        limit: 10,
        tiene_laboratorio: true,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCurso], 1]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "curso.tiene_laboratorio = :tiene_laboratorio",
        {
          tiene_laboratorio: true,
        },
      );
    });

    it("debe calcular correctamente totalPages", async () => {
      const query: QueryCursoDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockCurso, mockCurso],
        25,
      ]);

      const result = await service.findAll(query);

      expect(result.totalPages).toBe(3);
    });
  });

  describe("findOne", () => {
    it("debe retornar un curso por ID", async () => {
      mockCursoRepo.findOne.mockResolvedValue(mockCurso);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCurso);
      expect(cursoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["ambientes"],
      });
    });

    it("debe lanzar NotFoundException si el curso no existe", async () => {
      mockCursoRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        "Curso con ID 999 no encontrado",
      );
    });
  });

  describe("create", () => {
    const createDto: CreateCursoDto = {
      codigo: "CS102",
      nombre: "Data Structures",
      ciclo: 2,
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      tiene_laboratorio: true,
    };

    it("debe crear un curso exitosamente", async () => {
      mockCursoRepo.findOne.mockResolvedValue(null);
      mockCursoRepo.create.mockReturnValue({ ...createDto, activo: true });
      mockCursoRepo.save.mockResolvedValue({
        id: 2,
        ...createDto,
        activo: true,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(cursoRepo.create).toHaveBeenCalledWith({
        ...createDto,
        activo: true,
      });
      expect(cursoRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar ConflictException si el código ya existe", async () => {
      mockCursoRepo.findOne.mockResolvedValue(mockCurso);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `El código de curso '${createDto.codigo}' ya existe`,
      );
    });
  });

  describe("update", () => {
    const updateDto: UpdateCursoDto = {
      nombre: "Data Structures Updated",
      creditos: 5,
    };

    it("debe actualizar un curso exitosamente", async () => {
      mockCursoRepo.findOne.mockResolvedValue(mockCurso);
      mockCursoRepo.merge.mockReturnValue({ ...mockCurso, ...updateDto });
      mockCursoRepo.save.mockResolvedValue({ ...mockCurso, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(cursoRepo.merge).toHaveBeenCalled();
      expect(cursoRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar ConflictException si el nuevo código ya existe", async () => {
      const dtoWithCode = { ...updateDto, codigo: "CS999" };
      mockCursoRepo.findOne
        .mockResolvedValueOnce(mockCurso)
        .mockResolvedValueOnce({ id: 999 } as Curso);

      await expect(service.update(1, dtoWithCode)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, dtoWithCode)).rejects.toThrow(
        "El código 'CS999' ya está en uso",
      );
    });
  });

  describe("remove", () => {
    it("debe desactivar un curso (soft delete)", async () => {
      mockCursoRepo.findOne.mockResolvedValue(mockCurso);
      mockCursoRepo.save.mockResolvedValue({ ...mockCurso, activo: false });

      await service.remove(1);

      expect(cursoRepo.save).toHaveBeenCalledWith({
        ...mockCurso,
        activo: false,
      });
    });

    it("debe lanzar NotFoundException si el curso no existe al eliminar", async () => {
      mockCursoRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("asignarAmbientes", () => {
    it("debe asignar ambientes de tipo correcto para TEORIA", async () => {
      const mockAula = { ...mockAmbiente, tipo: TipoAmbiente.AULA };
      mockAmbienteRepo.find.mockResolvedValue([mockAula]);
      mockCursoRepo.findOne.mockResolvedValue({ ...mockCurso, ambientes: [] });
      mockCursoRepo.save.mockResolvedValue(mockCurso);

      const result = await service.asignarAmbientes(1, [1], TipoClase.TEORIA);

      expect(result).toBeDefined();
      expect(ambienteRepo.find).toHaveBeenCalledWith({
        where: { id: In([1]), activo: true },
      });
    });

    it("debe asignar ambientes de tipo correcto para LABORATORIO", async () => {
      mockAmbienteRepo.find.mockResolvedValue([mockAmbiente]);
      mockCursoRepo.findOne.mockResolvedValue({ ...mockCurso, ambientes: [] });
      mockCursoRepo.save.mockResolvedValue(mockCurso);

      const result = await service.asignarAmbientes(
        1,
        [1],
        TipoClase.LABORATORIO,
      );

      expect(result).toBeDefined();
    });

    it("debe lanzar BadRequestException si un ambiente no existe", async () => {
      mockAmbienteRepo.find.mockResolvedValue([]);

      await expect(
        service.asignarAmbientes(1, [1], TipoClase.TEORIA),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.asignarAmbientes(1, [1], TipoClase.TEORIA),
      ).rejects.toThrow("Uno o más ambientes no existen o están inactivos");
    });

    it("debe lanzar BadRequestException si el tipo de ambiente es incorrecto", async () => {
      const mockAula = { ...mockAmbiente, tipo: TipoAmbiente.AULA };
      mockAmbienteRepo.find.mockResolvedValue([mockAula]);

      await expect(
        service.asignarAmbientes(1, [1], TipoClase.LABORATORIO),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe lanzar NotFoundException si el curso no existe", async () => {
      mockAmbienteRepo.find.mockResolvedValue([mockAmbiente]);
      mockCursoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.asignarAmbientes(1, [1], TipoClase.LABORATORIO),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAmbientesCompatibles", () => {
    it("debe retornar ambientes compatibles para TEORIA", async () => {
      const mockAula = { ...mockAmbiente, tipo: TipoAmbiente.AULA };
      const mockCursoWithAmbientes = { ...mockCurso, ambientes: [mockAula] };
      mockCursoRepo.findOne.mockResolvedValue(mockCursoWithAmbientes);

      const result = await service.getAmbientesCompatibles(1, TipoClase.TEORIA);

      expect(result).toEqual([mockAula]);
    });

    it("debe retornar ambientes compatibles para LABORATORIO", async () => {
      const mockCursoWithAmbientes = {
        ...mockCurso,
        ambientes: [mockAmbiente],
      };
      mockCursoRepo.findOne.mockResolvedValue(mockCursoWithAmbientes);

      const result = await service.getAmbientesCompatibles(
        1,
        TipoClase.LABORATORIO,
      );

      expect(result).toEqual([mockAmbiente]);
    });

    it("debe lanzar NotFoundException si el curso no existe", async () => {
      mockCursoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getAmbientesCompatibles(1, TipoClase.TEORIA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
