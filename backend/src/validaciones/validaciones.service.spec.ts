import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ValidacionesService } from "./validaciones.service";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../entities/disponibilidad-docente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { DiaActivo } from "../entities/dia-activo.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";

type QueryCall = {
  query: string;
  params?: Record<string, unknown>;
};

type MockQueryBuilder = {
  innerJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  getCount: jest.Mock;
  getOne: jest.Mock;
  calls: QueryCall[];
};

describe("ValidacionesService", () => {
  let service: ValidacionesService;
  let horarioRepo: { createQueryBuilder: jest.Mock };
  let disponibilidadRepo: { createQueryBuilder: jest.Mock };
  let turnoHorarioRepo: { createQueryBuilder: jest.Mock };
  let diaActivoRepo: { createQueryBuilder: jest.Mock };
  let periodoRepo: { createQueryBuilder: jest.Mock };

  const createMockQueryBuilder = (options?: {
    getCount?: (calls: QueryCall[]) => number | Promise<number>;
    getOne?: (calls: QueryCall[]) => unknown | Promise<unknown>;
  }): MockQueryBuilder => {
    const calls: QueryCall[] = [];
    const qb = {
      calls,
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn((query: string, params?: Record<string, unknown>) => {
        calls.push({ query, params });
        return qb;
      }),
      andWhere: jest.fn((query: string, params?: Record<string, unknown>) => {
        calls.push({ query, params });
        return qb;
      }),
      getCount: jest
        .fn()
        .mockImplementation(async () => options?.getCount?.(calls) ?? 0),
      getOne: jest
        .fn()
        .mockImplementation(async () => options?.getOne?.(calls) ?? null),
    } as unknown as MockQueryBuilder;

    return qb;
  };

  const getParamValue = (calls: QueryCall[], key: string) => {
    const match = calls.find((call) => call.params && key in call.params);
    return match?.params?.[key];
  };

  const toMinutes = (hora: string): number => {
    const [horas, minutos] = hora.split(":").map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  };

  beforeEach(async () => {
    horarioRepo = { createQueryBuilder: jest.fn() };
    disponibilidadRepo = { createQueryBuilder: jest.fn() };
    turnoHorarioRepo = { createQueryBuilder: jest.fn() };
    diaActivoRepo = { createQueryBuilder: jest.fn() };
    periodoRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidacionesService,
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: horarioRepo,
        },
        {
          provide: getRepositoryToken(DisponibilidadDocente),
          useValue: disponibilidadRepo,
        },
        {
          provide: getRepositoryToken(TurnoHorario),
          useValue: turnoHorarioRepo,
        },
        {
          provide: getRepositoryToken(DiaActivo),
          useValue: diaActivoRepo,
        },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: periodoRepo,
        },
      ],
    }).compile();

    service = module.get<ValidacionesService>(ValidacionesService);

    jest.clearAllMocks();
  });

  describe("verificarCruceDocente", () => {
    it("retorna invalido cuando existe superposición con otro horario del docente", async () => {
      const periodoQb = createMockQueryBuilder({
        getOne: () => ({ codigo: "2026-I" }),
      });
      const horarioQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const periodoCodigo = getParamValue(calls, "periodoCodigo");
          const cruza =
            dia === 1 &&
            periodoCodigo === "2026-I" &&
            toMinutes("08:00") < toMinutes(horaFin) &&
            toMinutes("10:00") > toMinutes(horaInicio);

          return cruza ? 1 : 0;
        },
      });

      periodoRepo.createQueryBuilder.mockReturnValue(periodoQb);
      horarioRepo.createQueryBuilder.mockReturnValue(horarioQb);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "09:00",
        "11:00",
        1,
      );

      expect(result).toEqual({ valido: false, motivo: "Cruce de docente" });
    });

    it("retorna valido cuando el nuevo horario empieza exactamente al finalizar el existente", async () => {
      const periodoQb = createMockQueryBuilder({
        getOne: () => ({ codigo: "2026-I" }),
      });
      const horarioQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const periodoCodigo = getParamValue(calls, "periodoCodigo");
          const cruza =
            dia === 1 &&
            periodoCodigo === "2026-I" &&
            toMinutes("08:00") < toMinutes(horaFin) &&
            toMinutes("10:00") > toMinutes(horaInicio);

          return cruza ? 1 : 0;
        },
      });

      periodoRepo.createQueryBuilder.mockReturnValue(periodoQb);
      horarioRepo.createQueryBuilder.mockReturnValue(horarioQb);

      const result = await service.verificarCruceDocente(
        1,
        1,
        "10:00",
        "12:00",
        1,
      );

      expect(result).toEqual({ valido: true });
    });
  });

  describe("verificarDisponibilidadDocente", () => {
    it("retorna invalido si el docente tiene el martes bloqueado en el rango solicitado", async () => {
      const disponibilidadQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const cruza =
            dia === 2 &&
            toMinutes("00:00") < toMinutes(horaFin) &&
            toMinutes("23:59") > toMinutes(horaInicio);

          return cruza ? 1 : 0;
        },
      });

      disponibilidadRepo.createQueryBuilder.mockReturnValue(disponibilidadQb);

      const result = await service.verificarDisponibilidadDocente(
        1,
        2,
        "08:00",
        "10:00",
      );

      expect(result).toMatchObject({ valido: false });
    });

    it("retorna valido si el día consultado no está bloqueado", async () => {
      const disponibilidadQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const cruza =
            dia === 2 &&
            toMinutes("00:00") < toMinutes(horaFin) &&
            toMinutes("23:59") > toMinutes(horaInicio);

          return cruza ? 1 : 0;
        },
      });

      disponibilidadRepo.createQueryBuilder.mockReturnValue(disponibilidadQb);

      const result = await service.verificarDisponibilidadDocente(
        1,
        3,
        "08:00",
        "10:00",
      );

      expect(result).toEqual({ valido: true });
    });
  });

  describe("verificarFranjaInstitucional", () => {
    it("retorna invalido para sábado inactivo", async () => {
      const diaActivoQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          return dia === 6 ? 0 : 1;
        },
      });
      const turnoHorarioQb = createMockQueryBuilder({
        getCount: () => 1,
      });

      diaActivoRepo.createQueryBuilder.mockReturnValue(diaActivoQb);
      turnoHorarioRepo.createQueryBuilder.mockReturnValue(turnoHorarioQb);

      const result = await service.verificarFranjaInstitucional(
        6,
        "08:00",
        "10:00",
      );

      expect(result).toMatchObject({ valido: false });
    });

    it("retorna invalido cuando el rango cae fuera de los turnos activos", async () => {
      const diaActivoQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          return dia === 6 ? 0 : 1;
        },
      });
      const turnoHorarioQb = createMockQueryBuilder({
        getCount: (calls) => {
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const turnos = [
            { inicio: "07:00", fin: "13:00" },
            { inicio: "13:00", fin: "19:00" },
          ];

          const cubre = turnos.some(
            (turno) =>
              toMinutes(turno.inicio) <= toMinutes(horaInicio) &&
              toMinutes(turno.fin) >= toMinutes(horaFin),
          );

          return cubre ? 1 : 0;
        },
      });

      diaActivoRepo.createQueryBuilder.mockReturnValue(diaActivoQb);
      turnoHorarioRepo.createQueryBuilder.mockReturnValue(turnoHorarioQb);

      const result = await service.verificarFranjaInstitucional(
        1,
        "06:00",
        "08:00",
      );

      expect(result).toMatchObject({ valido: false });
    });

    it("retorna valido cuando el bloque cae en un día activo y dentro de un turno", async () => {
      const diaActivoQb = createMockQueryBuilder({
        getCount: (calls) => {
          const dia = getParamValue(calls, "dia");
          return dia === 6 ? 0 : 1;
        },
      });
      const turnoHorarioQb = createMockQueryBuilder({
        getCount: (calls) => {
          const horaInicio = String(getParamValue(calls, "horaInicio"));
          const horaFin = String(getParamValue(calls, "horaFin"));
          const turnos = [
            { inicio: "07:00", fin: "13:00" },
            { inicio: "13:00", fin: "19:00" },
          ];

          const cubre = turnos.some(
            (turno) =>
              toMinutes(turno.inicio) <= toMinutes(horaInicio) &&
              toMinutes(turno.fin) >= toMinutes(horaFin),
          );

          return cubre ? 1 : 0;
        },
      });

      diaActivoRepo.createQueryBuilder.mockReturnValue(diaActivoQb);
      turnoHorarioRepo.createQueryBuilder.mockReturnValue(turnoHorarioQb);

      const result = await service.verificarFranjaInstitucional(
        1,
        "08:00",
        "10:00",
      );

      expect(result).toEqual({ valido: true });
    });
  });
});
