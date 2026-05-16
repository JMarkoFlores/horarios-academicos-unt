import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ValidacionesService } from "./validaciones.service";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";

describe("ValidacionesService", () => {
  let service: ValidacionesService;
  let horarioRepo: Repository<HorarioAsignado>;
  let disponibilidadRepo: Repository<DisponibilidadDocente>;

  const mockHorarioRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockDisponibilidadRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidacionesService,
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: mockHorarioRepo,
        },
        {
          provide: getRepositoryToken(DisponibilidadDocente),
          useValue: mockDisponibilidadRepo,
        },
      ],
    }).compile();

    service = module.get<ValidacionesService>(ValidacionesService);
    horarioRepo = module.get<Repository<HorarioAsignado>>(
      getRepositoryToken(HorarioAsignado),
    );
    disponibilidadRepo = module.get<Repository<DisponibilidadDocente>>(
      getRepositoryToken(DisponibilidadDocente),
    );

    jest.clearAllMocks();
    mockHorarioRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDisponibilidadRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe("verificarCruceDocente", () => {
    it("debe detectar cruce de horario del docente", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(horarioRepo.createQueryBuilder).toHaveBeenCalledWith("h");
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith("h.docente", "d");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("d.id = :docenteId", {
        docenteId: 1,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.dia_semana = :diaSemana",
        { diaSemana: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.periodo_academico = :periodo",
        { periodo: "2026-I" },
      );
    });

    it("debe no detectar cruce si no hay horarios", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(false);
    });

    it("debe excluir horario específico al verificar cruce", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
        5,
      );

      expect(result).toBe(false);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.id != :excluirId",
        { excluirId: 5 },
      );
    });

    it("debe manejar correctamente la lógica de superposición de tiempo", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "09:00",
        "11:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.hora_inicio < CAST(:horaFin AS TIME)",
        { horaFin: "11:00" },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.hora_fin > CAST(:horaInicio AS TIME)",
        { horaInicio: "09:00" },
      );
    });
  });

  describe("verificarCruceAmbiente", () => {
    it("debe detectar cruce de horario del ambiente", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarCruceAmbiente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(horarioRepo.createQueryBuilder).toHaveBeenCalledWith("h");
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        "h.ambiente",
        "a",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "a.id = :ambienteId",
        { ambienteId: 1 },
      );
    });

    it("debe no detectar cruce si el ambiente está libre", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceAmbiente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(false);
    });

    it("debe excluir horario específico al verificar cruce de ambiente", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceAmbiente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
        5,
      );

      expect(result).toBe(false);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.id != :excluirId",
        { excluirId: 5 },
      );
    });
  });

  describe("verificarCruceGrupo", () => {
    it("debe detectar cruce de horario del grupo", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarCruceGrupo(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(horarioRepo.createQueryBuilder).toHaveBeenCalledWith("h");
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith("h.grupo", "g");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("g.id = :grupoId", {
        grupoId: 1,
      });
    });

    it("debe no detectar cruce si el grupo está libre", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceGrupo(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(false);
    });

    it("debe excluir horario específico al verificar cruce de grupo", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarCruceGrupo(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
        5,
      );

      expect(result).toBe(false);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "h.id != :excluirId",
        { excluirId: 5 },
      );
    });
  });

  describe("verificarDisponibilidadDocente", () => {
    it("debe verificar disponibilidad del docente", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarDisponibilidadDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(disponibilidadRepo.createQueryBuilder).toHaveBeenCalledWith("d");
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        "d.docente",
        "doc",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "doc.id = :docenteId",
        { docenteId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "d.disponible = true",
      );
    });

    it("debe retornar false si no hay disponibilidad", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarDisponibilidadDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(false);
    });

    it("debe verificar que el horario esté dentro de la disponibilidad", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarDisponibilidadDocente(
        1,
        1,
        "09:00",
        "11:00",
        "2026-I",
      );

      expect(result).toBe(true);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "CAST(:horaInicio AS TIME) >= d.hora_inicio",
        { horaInicio: "09:00" },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "CAST(:horaFin AS TIME) <= d.hora_fin",
        { horaFin: "11:00" },
      );
    });
  });

  describe("verificarFranjaInstitucional", () => {
    it("debe validar horario dentro de franja institucional (07:00-22:00)", () => {
      const result = service.verificarFranjaInstitucional("08:00", "10:00");

      expect(result).toBe(true);
    });

    it("debe rechazar horario antes de las 07:00", () => {
      const result = service.verificarFranjaInstitucional("06:00", "08:00");

      expect(result).toBe(false);
    });

    it("debe rechazar horario después de las 22:00", () => {
      const result = service.verificarFranjaInstitucional("21:00", "23:00");

      expect(result).toBe(false);
    });

    it("debe aceptar horario exacto en límite inferior (07:00)", () => {
      const result = service.verificarFranjaInstitucional("07:00", "09:00");

      expect(result).toBe(true);
    });

    it("debe aceptar horario exacto en límite superior (22:00)", () => {
      const result = service.verificarFranjaInstitucional("20:00", "22:00");

      expect(result).toBe(true);
    });

    it("debe rechazar horario con hora inicio mayor a hora fin", () => {
      const result = service.verificarFranjaInstitucional("10:00", "08:00");

      expect(result).toBe(false);
    });

    it("debe manejar horarios con minutos", () => {
      const result = service.verificarFranjaInstitucional("08:30", "10:45");

      expect(result).toBe(true);
    });

    it("debe rechazar horario que termina después de 22:00", () => {
      const result = service.verificarFranjaInstitucional("21:30", "22:30");

      expect(result).toBe(false);
    });

    it("debe rechazar horario que empieza antes de 07:00", () => {
      const result = service.verificarFranjaInstitucional("06:45", "08:00");

      expect(result).toBe(false);
    });

    it("debe convertir correctamente horas a minutos", () => {
      const result1 = service.verificarFranjaInstitucional("07:00", "22:00");
      const result2 = service.verificarFranjaInstitucional("06:59", "22:00");
      const result3 = service.verificarFranjaInstitucional("07:00", "22:01");

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });
});
