import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfiguracionService } from "./configuracion.service";
import { RestriccionInstitucional } from "../entities/restriccion-institucional.entity";
import { DiaNoLaborable } from "../entities/dia-no-laborable.entity";
import { UpsertRestriccionDto } from "./dto/upsert-restriccion.dto";
import { CreateDiaNoLaborableDto } from "./dto/create-dia-no-laborable.dto";

describe("ConfiguracionService", () => {
  let service: ConfiguracionService;
  let restriccionRepo: jest.Mocked<Repository<RestriccionInstitucional>>;
  let diaNoLaborableRepo: jest.Mocked<Repository<DiaNoLaborable>>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRestriccion = {
    id: 1,
    tipo_restriccion: "FRANJA_HORARIA",
    valor: { hora_inicio: "07:00", hora_fin: "22:00" },
    periodo_academico: "2026-I",
    activo: true,
  } as RestriccionInstitucional;

  const mockDiaNoLaborable = {
    id: 1,
    fecha: new Date("2026-04-09"),
    descripcion: "Feriado de prueba",
    tipo: "FERIADO",
    afecta_aulas: true,
    afecta_laboratorios: true,
    periodo_academico: "2026-I",
  } as unknown as DiaNoLaborable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionService,
        {
          provide: getRepositoryToken(RestriccionInstitucional),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DiaNoLaborable),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfiguracionService>(ConfiguracionService);
    restriccionRepo = module.get(getRepositoryToken(RestriccionInstitucional));
    diaNoLaborableRepo = module.get(getRepositoryToken(DiaNoLaborable));

    jest.clearAllMocks();
  });

  describe("findRestricciones", () => {
    it("debe retornar restricciones activas filtradas opcionalmente por período", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockRestriccion]);

      const result = await service.findRestricciones({ periodo: "2026-I" });

      expect(result).toEqual([mockRestriccion]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("r.activo = true");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.periodo_academico = :periodo",
        { periodo: "2026-I" },
      );
    });
  });

  describe("upsertRestriccion", () => {
    const dto: UpsertRestriccionDto = {
      tipo_restriccion: "FRANJA_HORARIA",
      valor: { hora_inicio: "08:00", hora_fin: "20:00" },
      periodo_academico: "2026-I",
    };

    it("debe crear una nueva restricción si no existe", async () => {
      restriccionRepo.findOne.mockResolvedValue(null);
      restriccionRepo.create.mockReturnValue(mockRestriccion);
      restriccionRepo.save.mockResolvedValue(mockRestriccion);

      const result = await service.upsertRestriccion(dto);

      expect(result).toEqual({ restriccion: mockRestriccion, created: true });
      expect(restriccionRepo.create).toHaveBeenCalled();
      expect(restriccionRepo.save).toHaveBeenCalledWith(mockRestriccion);
    });

    it("debe actualizar la restricción existente si ya existe", async () => {
      restriccionRepo.findOne.mockResolvedValue(mockRestriccion);
      restriccionRepo.merge.mockReturnValue(mockRestriccion);
      restriccionRepo.save.mockResolvedValue(mockRestriccion);

      const result = await service.upsertRestriccion(dto);

      expect(result).toEqual({ restriccion: mockRestriccion, created: false });
      expect(restriccionRepo.merge).toHaveBeenCalledWith(
        mockRestriccion,
        expect.objectContaining({ valor: dto.valor }),
      );
      expect(restriccionRepo.save).toHaveBeenCalledWith(mockRestriccion);
    });
  });

  describe("removeRestriccion", () => {
    it("debe eliminar una restricción exitosamente", async () => {
      restriccionRepo.findOne.mockResolvedValue(mockRestriccion);
      restriccionRepo.remove.mockResolvedValue(mockRestriccion);

      await expect(service.removeRestriccion(1)).resolves.not.toThrow();
      expect(restriccionRepo.remove).toHaveBeenCalledWith(mockRestriccion);
    });

    it("debe lanzar NotFoundException si la restricción no existe", async () => {
      restriccionRepo.findOne.mockResolvedValue(null);

      await expect(service.removeRestriccion(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findDiasNoLaborables", () => {
    it("debe retornar días no laborables del período", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockDiaNoLaborable]);

      const result = await service.findDiasNoLaborables({ periodo: "2026-I" });

      expect(result).toEqual([mockDiaNoLaborable]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "d.periodo_academico = :periodo",
        { periodo: "2026-I" },
      );
    });
  });

  describe("createDiaNoLaborable", () => {
    const dto: CreateDiaNoLaborableDto = {
      fecha: "2026-04-09",
      descripcion: "Feriado Santo",
      tipo: "FERIADO",
      periodo_academico: "2026-I",
    };

    it("debe registrar un día no laborable exitosamente", async () => {
      diaNoLaborableRepo.findOne.mockResolvedValue(null);
      diaNoLaborableRepo.create.mockReturnValue(mockDiaNoLaborable);
      diaNoLaborableRepo.save.mockResolvedValue(mockDiaNoLaborable);

      const result = await service.createDiaNoLaborable(dto);

      expect(result).toBe(mockDiaNoLaborable);
      expect(diaNoLaborableRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar ConflictException si la fecha ya está registrada para ese período", async () => {
      diaNoLaborableRepo.findOne.mockResolvedValue(mockDiaNoLaborable);

      await expect(service.createDiaNoLaborable(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("removeDiaNoLaborable", () => {
    it("debe eliminar un día no laborable exitosamente", async () => {
      diaNoLaborableRepo.findOne.mockResolvedValue(mockDiaNoLaborable);
      diaNoLaborableRepo.remove.mockResolvedValue(mockDiaNoLaborable);

      await expect(service.removeDiaNoLaborable(1)).resolves.not.toThrow();
      expect(diaNoLaborableRepo.remove).toHaveBeenCalledWith(
        mockDiaNoLaborable,
      );
    });

    it("debe lanzar NotFoundException si no existe el día", async () => {
      diaNoLaborableRepo.findOne.mockResolvedValue(null);

      await expect(service.removeDiaNoLaborable(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getRestriccionesMap", () => {
    it("debe mapear restricciones a formato clave-valor", async () => {
      restriccionRepo.find.mockResolvedValue([mockRestriccion]);

      const result = await service.getRestriccionesMap("2026-I");

      expect(result).toEqual({
        FRANJA_HORARIA: { hora_inicio: "07:00", hora_fin: "22:00" },
      });
    });
  });

  describe("esDiaNoLaborable", () => {
    it("debe retornar true si la fecha es feriado", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.esDiaNoLaborable(
        new Date("2026-04-09"),
        "2026-I",
      );

      expect(result).toBe(true);
    });

    it("debe retornar false si la fecha es laboral ordinaria", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.esDiaNoLaborable(
        new Date("2026-04-10"),
        "2026-I",
      );

      expect(result).toBe(false);
    });
  });
});
