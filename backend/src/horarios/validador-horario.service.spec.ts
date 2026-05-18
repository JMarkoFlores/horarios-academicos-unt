import { Cache } from "cache-manager";
import { TipoClase } from "../common/enums/tipo-clase.enum";
import { ValidacionesService } from "../common/services/validaciones.service";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ValidadorHorarioService } from "./validador-horario.service";
import { ValidarSlotDto } from "./dto/validar-slot.dto";

jest.mock("../common/services/validaciones.service");

describe("ValidadorHorarioService", () => {
  let service: ValidadorHorarioService;
  let cacheManager: jest.Mocked<Cache>;
  let validacionesService: jest.Mocked<ValidacionesService>;
  let horarioRepo: {
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    getRawMany: jest.Mock;
  };

  const baseDto: ValidarSlotDto = {
    docente_id: 10,
    grupo_id: 20,
    ambiente_id: 30,
    laboratorio_ambiente_id: 40,
    periodo: "2026-I",
    dia: 2,
    hora_inicio: "08:00",
    hora_fin: "10:00",
    tipo_clase: TipoClase.TEORIA,
    fecha: "2026-06-09",
  };

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    validacionesService = {
      verificarFranjaInstitucional: jest.fn().mockReturnValue(true),
      verificarDisponibilidadDocente: jest.fn().mockResolvedValue(true),
      verificarMaxHorasDocente: jest.fn().mockResolvedValue(true),
      verificarDiaNoLaborable: jest.fn().mockResolvedValue(false),
      verificarCruceAmbiente: jest.fn().mockResolvedValue(false),
      verificarCruceDocente: jest.fn().mockResolvedValue(false),
      verificarCruceGrupo: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<ValidacionesService>;

    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    horarioRepo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    service = new ValidadorHorarioService(
      cacheManager,
      validacionesService,
      horarioRepo as unknown as any,
    );
  });

  it("regla 1: retorna error si falla franja institucional", async () => {
    validacionesService.verificarFranjaInstitucional.mockReturnValue(false);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("La hora está fuera de la franja institucional permitida.");
  });

  it("regla 2: retorna error si docente no está disponible", async () => {
    validacionesService.verificarDisponibilidadDocente.mockResolvedValue(false);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El docente no está disponible para el horario solicitado.");
  });

  it("regla 3: retorna error si supera máximo de horas del docente", async () => {
    validacionesService.verificarMaxHorasDocente.mockResolvedValue(false);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El docente supera el máximo de horas permitidas en el día.");
  });

  it("regla 4: retorna error si la fecha es día no laborable", async () => {
    validacionesService.verificarDiaNoLaborable.mockResolvedValue(true);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("La fecha seleccionada corresponde a un día no laborable.");
  });

  it("regla 5: retorna error si hay cruce en ambiente principal (con cache miss)", async () => {
    cacheManager.get.mockResolvedValue(undefined);
    validacionesService.verificarCruceAmbiente.mockResolvedValue(true);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El ambiente seleccionado ya está ocupado en ese horario.");
    expect(cacheManager.set).toHaveBeenCalledWith(
      "slots_ambiente_30_2026-I",
      expect.any(Array),
      86400,
    );
  });

  it("regla 6: retorna error si hay cruce del docente", async () => {
    validacionesService.verificarCruceDocente.mockResolvedValue(true);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El docente tiene un cruce de horario.");
  });

  it("regla 7: retorna error si hay cruce del grupo", async () => {
    validacionesService.verificarCruceGrupo.mockResolvedValue(true);

    const result = await service.validarSlot(baseDto);

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El grupo tiene un cruce de horario.");
  });

  it("regla 8: retorna error si tipo LABORATORIO y hay cruce en laboratorio", async () => {
    cacheManager.get.mockImplementation(async (key) => {
      if (key === "slots_ambiente_40_2026-I") {
        return [{ dia: 2, hora_inicio: "09:00", hora_fin: "11:00" }];
      }
      return undefined;
    });

    const result = await service.validarSlot({
      ...baseDto,
      tipo_clase: TipoClase.LABORATORIO,
    });

    expect(result.valido).toBe(false);
    expect(result.errores).toContain("El laboratorio seleccionado ya está ocupado en ese horario.");
  });
});
