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

describe("CursosService", () => {
  let service: CursosService;
  let cursoRepo: Repository<Curso>;
  let ambienteRepo: Repository<Ambiente>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockCursoRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
  };

  const mockAmbienteRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
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
    ambientes: [],
  } as Curso;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CursosService,
        { provide: getRepositoryToken(Curso), useValue: mockCursoRepo },
        { provide: getRepositoryToken(Ambiente), useValue: mockAmbienteRepo },
      ],
    }).compile();

    service = module.get<CursosService>(CursosService);
    cursoRepo = module.get<Repository<Curso>>(getRepositoryToken(Curso));
    ambienteRepo = module.get<Repository<Ambiente>>(getRepositoryToken(Ambiente));

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("debe retornar cursos paginados", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockCurso], 1]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toEqual([mockCurso]);
    });
  });

  describe("findOne", () => {
    it("debe retornar un curso por ID", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockCurso);
      const result = await service.findOne(1);
      expect(result).toEqual(mockCurso);
    });
  });

  describe("update", () => {
    it("debe actualizar exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockCurso);
      mockCursoRepo.merge.mockReturnValue({ ...mockCurso, nombre: 'Updated' });
      mockCursoRepo.save.mockResolvedValue({ ...mockCurso, nombre: 'Updated' });
      const result = await service.update(1, { nombre: 'Updated' });
      expect(result.nombre).toBe('Updated');
    });
  });

  describe("asignarAmbientes", () => {
    it("debe asignar ambientes", async () => {
      const mockAmbiente = { id: 1, tipo: TipoAmbiente.AULA, activo: true };
      mockAmbienteRepo.find.mockResolvedValue([mockAmbiente]);
      mockQueryBuilder.getOne.mockResolvedValue({ ...mockCurso, ambientes: [] });
      mockCursoRepo.save.mockResolvedValue(mockCurso);

      const result = await service.asignarAmbientes(1, [1], TipoClase.TEORIA);
      expect(result).toBeDefined();
    });
  });
});
