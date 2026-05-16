import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HorariosService } from "./horarios.service";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { ValidacionesService } from "../common/services/validaciones.service";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ReasignarHorarioDto } from "./dto/reasignar-horario.dto";

describe("HorariosService", () => {
  let service: HorariosService;
  let horarioRepo: Repository<HorarioAsignado>;
  let conflictoRepo: Repository<ConflictoAsignacion>;
  let ambienteRepo: Repository<Ambiente>;
  let validacionesService: ValidacionesService;

  const mockHorarioRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockConflictoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAmbienteRepo = {
    findOne: jest.fn(),
  };

  const mockValidacionesService = {
    verificarFranjaInstitucional: jest.fn(),
    verificarCruceDocente: jest.fn(),
    verificarCruceAmbiente: jest.fn(),
    verificarCruceGrupo: jest.fn(),
  };

  const mockHorario: HorarioAsignado = {
    id: 1,
    dia_semana: 1,
    hora_inicio: "08:00",
    hora_fin: "10:00",
    periodo_academico: "2026-I",
    estado: EstadoHorario.PUBLICADO,
    tipo_clase: TipoClase.TEORIA,
    created_at: new Date(),
    updated_at: new Date(),
    docente: { id: 1, nombre: "Dr. Test", email: "test@example.com" } as any,
    curso: { id: 1, codigo: "CS101", nombre: "Intro to CS" } as any,
    ambiente: { id: 1, codigo: "A-101", capacidad: 30 } as any,
    grupo: { id: 1, codigo: "G-01" } as any,
  };

  const mockConflicto: ConflictoAsignacion = {
    id: 1,
    resuelto: false,
    periodo_academico: "2026-I",
    docente: { id: 1, nombre: "Dr. Test" } as any,
    ambiente: { id: 1, codigo: "A-101" } as any,
  } as any;

  const mockAmbiente: Ambiente = {
    id: 1,
    codigo: "A-101",
    capacidad: 30,
    tipo: "Aula",
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HorariosService,
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: mockHorarioRepo,
        },
        {
          provide: getRepositoryToken(ConflictoAsignacion),
          useValue: mockConflictoRepo,
        },
        {
          provide: getRepositoryToken(Ambiente),
          useValue: mockAmbienteRepo,
        },
        {
          provide: ValidacionesService,
          useValue: mockValidacionesService,
        },
      ],
    }).compile();

    service = module.get<HorariosService>(HorariosService);
    horarioRepo = module.get<Repository<HorarioAsignado>>(
      getRepositoryToken(HorarioAsignado),
    );
    conflictoRepo = module.get<Repository<ConflictoAsignacion>>(
      getRepositoryToken(ConflictoAsignacion),
    );
    ambienteRepo = module.get<Repository<Ambiente>>(
      getRepositoryToken(Ambiente),
    );
    validacionesService = module.get<ValidacionesService>(ValidacionesService);

    jest.clearAllMocks();
  });

  describe("findAllByPeriodo", () => {
    it("debe retornar horarios de un período específico", async () => {
      mockHorarioRepo.find.mockResolvedValue([mockHorario]);

      const result = await service.findAllByPeriodo("2026-I");

      expect(result).toEqual([mockHorario]);
      expect(horarioRepo.find).toHaveBeenCalledWith({
        where: { periodo_academico: "2026-I" },
        relations: ["docente", "curso", "ambiente", "grupo"],
        order: { dia_semana: "ASC", hora_inicio: "ASC" },
      });
    });

    it("debe retornar array vacío si no hay horarios", async () => {
      mockHorarioRepo.find.mockResolvedValue([]);

      const result = await service.findAllByPeriodo("2026-I");

      expect(result).toEqual([]);
      expect(horarioRepo.find).toHaveBeenCalled();
    });
  });

  describe("findByDocente", () => {
    it("debe retornar horarios de un docente específico", async () => {
      mockHorarioRepo.find.mockResolvedValue([mockHorario]);

      const result = await service.findByDocente(1, "2026-I");

      expect(result).toEqual([mockHorario]);
      expect(horarioRepo.find).toHaveBeenCalledWith({
        where: { docente: { id: 1 }, periodo_academico: "2026-I" },
        relations: ["docente", "curso", "ambiente", "grupo"],
        order: { dia_semana: "ASC", hora_inicio: "ASC" },
      });
    });

    it("debe retornar array vacío si el docente no tiene horarios", async () => {
      mockHorarioRepo.find.mockResolvedValue([]);

      const result = await service.findByDocente(999, "2026-I");

      expect(result).toEqual([]);
    });
  });

  describe("findByAmbiente", () => {
    it("debe retornar horarios de un ambiente específico", async () => {
      mockHorarioRepo.find.mockResolvedValue([mockHorario]);

      const result = await service.findByAmbiente(1, "2026-I");

      expect(result).toEqual([mockHorario]);
      expect(horarioRepo.find).toHaveBeenCalledWith({
        where: { ambiente: { id: 1 }, periodo_academico: "2026-I" },
        relations: ["docente", "curso", "ambiente", "grupo"],
        order: { dia_semana: "ASC", hora_inicio: "ASC" },
      });
    });
  });

  describe("findConflictos", () => {
    it("debe retornar conflictos de un período", async () => {
      mockConflictoRepo.find.mockResolvedValue([mockConflicto]);

      const result = await service.findConflictos("2026-I");

      expect(result).toEqual([mockConflicto]);
      expect(conflictoRepo.find).toHaveBeenCalledWith({
        where: { periodo_academico: "2026-I" },
        relations: ["docente", "ambiente"],
        order: { created_at: "DESC" },
      });
    });
  });

  describe("resolverConflicto", () => {
    it("debe marcar un conflicto como resuelto", async () => {
      mockConflictoRepo.findOne.mockResolvedValue(mockConflicto);
      mockConflictoRepo.save.mockResolvedValue({
        ...mockConflicto,
        resuelto: true,
      });

      const result = await service.resolverConflicto(1);

      expect(result.resuelto).toBe(true);
      expect(conflictoRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(conflictoRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si el conflicto no existe", async () => {
      mockConflictoRepo.findOne.mockResolvedValue(null);

      await expect(service.resolverConflicto(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resolverConflicto(999)).rejects.toThrow(
        "Conflicto 999 no encontrado",
      );
    });
  });

  describe("reasignarManual", () => {
    const reasignarDto: ReasignarHorarioDto = {
      dia_semana: 2,
      hora_inicio: "09:00",
      hora_fin: "11:00",
      ambiente_id: 2,
    };

    it("debe reasignar un horario exitosamente", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceGrupo.mockResolvedValue(false);
      mockAmbienteRepo.findOne.mockResolvedValue(mockAmbiente);
      mockHorarioRepo.save.mockResolvedValue({
        ...mockHorario,
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        estado: EstadoHorario.BORRADOR,
      });

      const result = await service.reasignarManual(1, reasignarDto);

      expect(result.dia_semana).toBe(2);
      expect(result.hora_inicio).toBe("09:00");
      expect(result.hora_fin).toBe("11:00");
      expect(result.estado).toBe(EstadoHorario.BORRADOR);
      expect(horarioRepo.save).toHaveBeenCalled();
    });

    it("debe lanzar NotFoundException si el horario no existe", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(null);

      await expect(service.reasignarManual(999, reasignarDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe lanzar BadRequestException si está fuera de franja institucional", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        false,
      );

      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        "El slot está fuera de la franja institucional (07:00-22:00)",
      );
    });

    it("debe lanzar BadRequestException si hay cruce de docente", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(true);

      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        "El docente tiene un cruce en ese horario",
      );
    });

    it("debe lanzar BadRequestException si hay cruce de ambiente", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(true);

      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        "El ambiente tiene un cruce en ese horario",
      );
    });

    it("debe lanzar BadRequestException si hay cruce de grupo", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceGrupo.mockResolvedValue(true);

      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        "El grupo tiene un cruce en ese horario",
      );
    });

    it("debe lanzar NotFoundException si el nuevo ambiente no existe", async () => {
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceGrupo.mockResolvedValue(false);
      mockAmbienteRepo.findOne.mockResolvedValue(null);

      await expect(service.reasignarManual(1, reasignarDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("debe reasignar sin cambiar ambiente si no se proporciona ambiente_id", async () => {
      const dtoSinAmbiente = { ...reasignarDto, ambiente_id: undefined };
      mockHorarioRepo.findOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceGrupo.mockResolvedValue(false);
      mockHorarioRepo.save.mockResolvedValue({
        ...mockHorario,
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        estado: EstadoHorario.BORRADOR,
      });

      const result = await service.reasignarManual(1, dtoSinAmbiente);

      expect(result.ambiente).toEqual(mockHorario.ambiente);
      expect(ambienteRepo.findOne).not.toHaveBeenCalled();
    });

    it("debe manejar horarios sin grupo", async () => {
      const horarioSinGrupo = { ...mockHorario, grupo: null };
      mockHorarioRepo.findOne.mockResolvedValue(horarioSinGrupo);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(
        true,
      );
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockAmbienteRepo.findOne.mockResolvedValue(mockAmbiente);
      mockHorarioRepo.save.mockResolvedValue({
        ...horarioSinGrupo,
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        estado: EstadoHorario.BORRADOR,
      });

      const result = await service.reasignarManual(1, reasignarDto);

      expect(result).toBeDefined();
      expect(
        mockValidacionesService.verificarCruceGrupo,
      ).not.toHaveBeenCalled();
    });
  });
});
