import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GruposService } from "./grupos.service";
import { Grupo } from "../entities/grupo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { CreateGrupoDto } from "./dto/create-grupo.dto";
import { UpdateGrupoDto } from "./dto/update-grupo.dto";

describe("GruposService", () => {
  let service: GruposService;
  let grupoRepo: jest.Mocked<Repository<Grupo>>;
  let periodoRepo: jest.Mocked<Repository<PeriodoAcademico>>;
  let cursoRepo: jest.Mocked<Repository<Curso>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  const mockPeriodo = {
    id: 1,
    codigo: "2026-I",
    nombre: "Semestre 2026-I",
  } as PeriodoAcademico;

  const mockCurso = {
    id: 1,
    codigo: "SIS101",
    nombre: "Programación I",
  } as Curso;

  const mockGrupo = {
    id: 1,
    codigo: "A",
    nombre: "Grupo A",
    ciclo: 1,
    cupo_maximo: 35,
    periodo_academico: mockPeriodo,
    curso: mockCurso,
  } as Grupo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GruposService,
        {
          provide: getRepositoryToken(Grupo),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Curso),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GruposService>(GruposService);
    grupoRepo = module.get(getRepositoryToken(Grupo));
    periodoRepo = module.get(getRepositoryToken(PeriodoAcademico));
    cursoRepo = module.get(getRepositoryToken(Curso));

    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("debe retornar una lista de grupos paginados y filtrados", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockGrupo], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        periodo: "2026-I",
        curso_id: 1,
      });

      expect(result).toEqual({
        items: [mockGrupo],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "grupo.periodo_academico",
        "periodo",
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "grupo.curso",
        "curso",
      );
    });
  });

  describe("findOne", () => {
    it("debe retornar un grupo por ID", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo);

      const result = await service.findOne(1);

      expect(result).toBe(mockGrupo);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("grupo.id = :id", {
        id: 1,
      });
    });

    it("debe lanzar NotFoundException si el grupo no existe", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    const createDto: CreateGrupoDto = {
      codigo: "B",
      nombre: "Grupo B",
      ciclo: 1,
      cupo_maximo: 30,
      periodo_academico_id: 1,
      curso_id: 1,
    };

    it("debe crear un grupo exitosamente", async () => {
      periodoRepo.findOne.mockResolvedValue(mockPeriodo);
      cursoRepo.findOne.mockResolvedValue(mockCurso);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No duplicados

      const nuevoGrupo = { ...mockGrupo, codigo: "B", nombre: "Grupo B" };
      grupoRepo.create.mockReturnValue(nuevoGrupo);
      grupoRepo.save.mockResolvedValue(nuevoGrupo);

      const result = await service.create(createDto);

      expect(result).toEqual(nuevoGrupo);
      expect(periodoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(cursoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("debe lanzar NotFoundException si el periodo no existe", async () => {
      periodoRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe lanzar NotFoundException si el curso no existe", async () => {
      periodoRepo.findOne.mockResolvedValue(mockPeriodo);
      cursoRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe lanzar ConflictException si el código ya existe para el curso y periodo", async () => {
      periodoRepo.findOne.mockResolvedValue(mockPeriodo);
      cursoRepo.findOne.mockResolvedValue(mockCurso);
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo); // Conflicto detectado

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("update", () => {
    const updateDto: UpdateGrupoDto = {
      codigo: "A-NUEVO",
    };

    it("debe actualizar un grupo exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockGrupo); // findOne
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // No duplicados con el nuevo código

      const grupoActualizado = { ...mockGrupo, codigo: "A-NUEVO" };
      grupoRepo.merge.mockReturnValue(grupoActualizado);
      grupoRepo.save.mockResolvedValue(grupoActualizado);

      const result = await service.update(1, updateDto);

      expect(result.codigo).toBe("A-NUEVO");
      expect(grupoRepo.save).toHaveBeenCalledWith(grupoActualizado);
    });

    it("debe lanzar ConflictException si el nuevo código entra en conflicto con otro grupo", async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockGrupo); // findOne
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: 2 } as Grupo); // Conflicto con grupo ID 2

      await expect(service.update(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("debe lanzar NotFoundException si se intenta asociar a un periodo inexistente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo); // findOne
      periodoRepo.findOne.mockResolvedValue(null); // Periodo no encontrado

      await expect(
        service.update(1, { periodo_academico_id: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("debe eliminar el grupo exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo); // findOne
      grupoRepo.remove.mockResolvedValue(mockGrupo);

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(grupoRepo.remove).toHaveBeenCalledWith(mockGrupo);
    });

    it("debe lanzar ConflictException ante error de llave foránea de la base de datos (code 23503)", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo); // findOne
      const dbError = new Error("Foreign key violation");
      (dbError as any).code = "23503";
      grupoRepo.remove.mockRejectedValue(dbError);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });

    it("debe lanzar el error original si no es un error de llave foránea", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockGrupo); // findOne
      const dbError = new Error("Other database error");
      grupoRepo.remove.mockRejectedValue(dbError);

      await expect(service.remove(1)).rejects.toThrow("Other database error");
    });
  });
});
