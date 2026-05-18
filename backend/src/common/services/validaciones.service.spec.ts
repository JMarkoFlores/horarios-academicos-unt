import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ValidacionesService } from "./validaciones.service";
import { HorarioAsignado } from "../../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../entities/disponibilidad-docente.entity";
import { DiaNoLaborable } from "../../entities/dia-no-laborable.entity";
import { RestriccionInstitucional } from "../../entities/restriccion-institucional.entity";

describe("ValidacionesService", () => {
  let service: ValidacionesService;
  let horarioRepo: Repository<HorarioAsignado>;
  let disponibilidadRepo: Repository<DisponibilidadDocente>;
  let diaNoLaborableRepo: Repository<DiaNoLaborable>;
  let restriccionRepo: Repository<RestriccionInstitucional>;

  const mockHorarioRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockDisponibilidadRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockDiaNoLaborableRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockRestriccionRepo = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
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
        {
          provide: getRepositoryToken(DiaNoLaborable),
          useValue: mockDiaNoLaborableRepo,
        },
        {
          provide: getRepositoryToken(RestriccionInstitucional),
          useValue: mockRestriccionRepo,
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
    diaNoLaborableRepo = module.get<Repository<DiaNoLaborable>>(
      getRepositoryToken(DiaNoLaborable),
    );
    restriccionRepo = module.get<Repository<RestriccionInstitucional>>(
      getRepositoryToken(RestriccionInstitucional),
    );

    jest.clearAllMocks();
    mockHorarioRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDisponibilidadRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDiaNoLaborableRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
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
    it("debe verificar disponibilidad del docente (cobertura continua en bloques de 1 hora)", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { hora_inicio: "08:00:00", hora_fin: "09:00:00", disponible: true },
        { hora_inicio: "09:00:00", hora_fin: "10:00:00", disponible: true },
      ]);

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
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.verificarDisponibilidadDocente(
        1,
        1,
        "08:00",
        "10:00",
        "2026-I",
      );

      expect(result).toBe(false);
    });

    it("debe retornar false si la disponibilidad está fragmentada o incompleta", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        { hora_inicio: "09:00:00", hora_fin: "10:00:00", disponible: true },
        // Falta el bloque de 10:00 a 11:00
      ]);

      const result = await service.verificarDisponibilidadDocente(
        1,
        1,
        "09:00",
        "11:00",
        "2026-I",
      );

      expect(result).toBe(false);
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

  describe("verificarDiaNoLaborable", () => {
    it("debe retornar true si el día es no laborable", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);

      const result = await service.verificarDiaNoLaborable("2026-05-25", "2026-I");

      expect(result).toBe(true);
      expect(diaNoLaborableRepo.createQueryBuilder).toHaveBeenCalledWith("d");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("d.fecha = :fechaStr", {
        fechaStr: "2026-05-25",
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "d.periodo_academico = :periodo",
        { periodo: "2026-I" },
      );
    });

    it("debe retornar false si el día es laborable regular", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.verificarDiaNoLaborable("2026-05-26", "2026-I");

      expect(result).toBe(false);
    });

    it("debe aceptar un objeto Date directamente", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      const fecha = new Date(2026, 4, 25); // 2026-05-25 (month is 0-indexed)

      const result = await service.verificarDiaNoLaborable(fecha, "2026-I");

      expect(result).toBe(true);
    });
  });

  describe("verificarMaxHorasDocente", () => {
    it("debe retornar true si la asignación no supera el límite de horas diarias (con restricción personalizada)", async () => {
      mockRestriccionRepo.findOne.mockResolvedValue({
        tipo_restriccion: "MAX_HORAS_DIA",
        valor: { max_horas: 6 },
        activo: true,
      });

      mockHorarioRepo.find.mockResolvedValue([
        { hora_inicio: "08:00", hora_fin: "10:00" }, // 2 horas
        { hora_inicio: "14:00", hora_fin: "16:00" }, // 2 horas
      ]);

      const result = await service.verificarMaxHorasDocente(1, 1, 2, "2026-I"); // +2 horas = 6 total (dentro de limite 6)

      expect(result).toBe(true);
      expect(mockRestriccionRepo.findOne).toHaveBeenCalledWith({
        where: {
          tipo_restriccion: "MAX_HORAS_DIA",
          periodo_academico: "2026-I",
          activo: true,
        },
      });
      expect(mockHorarioRepo.find).toHaveBeenCalledWith({
        where: {
          docente: { id: 1 },
          dia_semana: 1,
          periodo_academico: "2026-I",
        },
      });
    });

    it("debe retornar false si la asignación supera el límite de horas diarias", async () => {
      mockRestriccionRepo.findOne.mockResolvedValue({
        tipo_restriccion: "MAX_HORAS_DIA",
        valor: { max_horas: 6 },
        activo: true,
      });

      mockHorarioRepo.find.mockResolvedValue([
        { hora_inicio: "08:00", hora_fin: "10:00" }, // 2 horas
        { hora_inicio: "14:00", hora_fin: "16:00" }, // 2 horas
      ]);

      const result = await service.verificarMaxHorasDocente(1, 1, 3, "2026-I"); // +3 horas = 7 total (excede limite 6)

      expect(result).toBe(false);
    });

    it("debe usar límite fallback de 8 horas si no hay restricción registrada", async () => {
      mockRestriccionRepo.findOne.mockResolvedValue(null);

      mockHorarioRepo.find.mockResolvedValue([
        { hora_inicio: "08:00", hora_fin: "12:00" }, // 4 horas
      ]);

      const resultPermitido = await service.verificarMaxHorasDocente(1, 1, 4, "2026-I"); // +4 horas = 8 total (limite 8)
      const resultExcedido = await service.verificarMaxHorasDocente(1, 1, 5, "2026-I"); // +5 horas = 9 total (excede limite 8)

      expect(resultPermitido).toBe(true);
      expect(resultExcedido).toBe(false);
    });
  });
});
