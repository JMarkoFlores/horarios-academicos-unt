import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { HorariosService } from "./horarios.service";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../entities/conflicto-asignacion.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { ValidacionesService } from "../common/services/validaciones.service";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

describe("HorariosService", () => {
  let service: HorariosService;
  let horarioRepo: Repository<HorarioAsignado>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    store: { keys: jest.fn() }
  };

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

  const mockHorarioRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockConflictoRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
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

  const mockHorario = { 
    id: 1, 
    periodo_academico: '2026-I',
    docente: { id: 1 },
    ambiente: { id: 1 },
    grupo: { id: 1 }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HorariosService,
        { provide: getRepositoryToken(HorarioAsignado), useValue: mockHorarioRepo },
        { provide: getRepositoryToken(ConflictoAsignacion), useValue: mockConflictoRepo },
        { provide: getRepositoryToken(Ambiente), useValue: mockAmbienteRepo },
        { provide: ValidacionesService, useValue: mockValidacionesService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager }
      ],
    }).compile();

    service = module.get<HorariosService>(HorariosService);
    horarioRepo = module.get<Repository<HorarioAsignado>>(getRepositoryToken(HorarioAsignado));
    jest.clearAllMocks();
  });

  describe("findAllByPeriodo", () => {
    it("debe retornar horarios paginados", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockHorario], 1]);
      const result = await service.findAllByPeriodo("2026-I");
      expect(result.items).toEqual([mockHorario]);
    });
  });

  describe("reasignarManual", () => {
    it("debe reasignar exitosamente", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockHorario);
      mockValidacionesService.verificarFranjaInstitucional.mockReturnValue(true);
      mockValidacionesService.verificarCruceDocente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceAmbiente.mockResolvedValue(false);
      mockValidacionesService.verificarCruceGrupo.mockResolvedValue(false);
      mockHorarioRepo.save.mockResolvedValue({ ...mockHorario, dia_semana: 1 });

      const result = await service.reasignarManual(1, { dia_semana: 1, hora_inicio: '08:00', hora_fin: '10:00' });
      expect(result.dia_semana).toBe(1);
    });
  });
});
