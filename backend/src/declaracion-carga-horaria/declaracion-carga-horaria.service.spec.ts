import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeclaracionCargaHorariaService } from "./declaracion-carga-horaria.service";
import { DeclaracionCargaHoraria } from "../entities/declaracion-carga-horaria.entity";
import { Docente } from "../entities/docente.entity";
import { Departamento } from "../entities/departamento.entity";
import { Facultad } from "../entities/facultad.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { HorarioAsignado } from "../entities/horario-asignado.entity";
import { EstadoDeclaracionCarga } from "../common/enums/estado-declaracion-carga.enum";
import { EstadoHorario } from "../common/enums/estado-horario.enum";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { TipoClase } from "../common/enums/tipo-clase.enum";

describe("DeclaracionCargaHorariaService", () => {
  let service: DeclaracionCargaHorariaService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockDeclaracionRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDocenteRepo = {
    findOne: jest.fn(),
  };

  const mockDepartamentoRepo = {
    findOne: jest.fn(),
  };

  const mockFacultadRepo = {
    findOne: jest.fn(),
  };

  const mockPeriodoRepo = {
    findOne: jest.fn(),
  };

  const mockHorarioRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockDocente = {
    id: 7,
    departamento_id: 11,
    facultad_id: 21,
    departamento: { id: 11, escuela: { facultad: { id: 21 } } },
    facultad: { id: 21 },
  } as Docente;

  const mockPeriodo = {
    id: 15,
    codigo: "2026-I",
  } as PeriodoAcademico;

  const mockUsuario = {
    id: 99,
    email: "admin@unt.edu.pe",
    rol: RolUsuario.ADMINISTRADOR_SISTEMA,
    docenteId: null,
  };

  const mockDeclaracionBase = {
    id: 44,
    docente_id: 7,
    periodo_academico_id: 15,
    estado: EstadoDeclaracionCarga.BORRADOR,
    carga_no_lectiva: null,
  } as DeclaracionCargaHoraria;

  const crearHorario = (
    id: number,
    estado: EstadoHorario,
    horaInicio: string,
    horaFin: string,
    cursoId: number,
    grupoId: number,
    tipoClase: TipoClase,
  ): HorarioAsignado =>
    ({
      id,
      docente_id: 7,
      curso_id: cursoId,
      grupo_id: grupoId,
      ambiente_id: 31,
      periodo: "2026-I",
      dia: 1,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      tipo_clase: tipoClase,
      estado,
      curso: {
        id: cursoId,
        codigo: `CUR-${cursoId}`,
        nombre: `Curso ${cursoId}`,
        horas_teoria: 2,
        horas_practica: 1,
        horas_laboratorio: 0,
        ciclo: 3,
      },
      grupo: {
        id: grupoId,
        codigo: `GR-${grupoId}`,
        nombre: `Grupo ${grupoId}`,
      },
      ambiente: {
        id: 31,
        codigo: `A-${grupoId}`,
        nombre: `Ambiente ${grupoId}`,
      },
    }) as HorarioAsignado;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeclaracionCargaHorariaService,
        {
          provide: getRepositoryToken(DeclaracionCargaHoraria),
          useValue: mockDeclaracionRepo,
        },
        { provide: getRepositoryToken(Docente), useValue: mockDocenteRepo },
        {
          provide: getRepositoryToken(Departamento),
          useValue: mockDepartamentoRepo,
        },
        { provide: getRepositoryToken(Facultad), useValue: mockFacultadRepo },
        {
          provide: getRepositoryToken(PeriodoAcademico),
          useValue: mockPeriodoRepo,
        },
        {
          provide: getRepositoryToken(HorarioAsignado),
          useValue: mockHorarioRepo,
        },
      ],
    }).compile();

    service = module.get(DeclaracionCargaHorariaService);
    jest.clearAllMocks();

    mockPeriodoRepo.findOne.mockResolvedValue(mockPeriodo);
    mockDocenteRepo.findOne.mockResolvedValue(mockDocente);
    mockDeclaracionRepo.findOne.mockResolvedValue(mockDeclaracionBase);
  });

  describe("regeneración de carga lectiva", () => {
    it.each([
      EstadoDeclaracionCarga.BORRADOR,
      EstadoDeclaracionCarga.PENDIENTE_ENVIO,
      EstadoDeclaracionCarga.OBSERVADO_DPTO,
      EstadoDeclaracionCarga.SUBSANADO,
    ])("permite regenerar cuando la declaración está en %s", async (estado) => {
      mockDeclaracionRepo.findOne.mockResolvedValue({
        ...mockDeclaracionBase,
        estado,
      });
      mockQueryBuilder.getMany.mockResolvedValue([
        crearHorario(
          1,
          EstadoHorario.CONFIRMADO,
          "08:00",
          "10:00",
          10,
          20,
          TipoClase.TEORIA,
        ),
      ]);
      mockDeclaracionRepo.save.mockResolvedValue({
        ...mockDeclaracionBase,
        estado: EstadoDeclaracionCarga.BORRADOR,
        carga_no_lectiva: { generado: true },
      });

      const result = await service.actualizarCargaLectivaDeclaracion(
        44,
        mockUsuario as any,
      );

      expect(result.declaracionId).toBe(44);
      expect(mockDeclaracionRepo.save).toHaveBeenCalledTimes(1);
      expect(result.cargaLectiva.resumen.totalHoras).toBe(2);
    });

    it.each([
      EstadoDeclaracionCarga.VALIDADO_DPTO,
      EstadoDeclaracionCarga.APROBADO_FACULTAD,
      EstadoDeclaracionCarga.CERRADO,
      EstadoDeclaracionCarga.ANULADO,
    ])("rechaza regenerar cuando la declaración está en %s", async (estado) => {
      mockDeclaracionRepo.findOne.mockResolvedValue({
        ...mockDeclaracionBase,
        estado,
      });

      await expect(
        service.actualizarCargaLectivaDeclaracion(44, mockUsuario as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockHorarioRepo.createQueryBuilder).not.toHaveBeenCalledWith(
        "horario",
      );
      expect(mockDeclaracionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("máquina de estados", () => {
    it.each([
      [EstadoDeclaracionCarga.BORRADOR, EstadoDeclaracionCarga.PENDIENTE_ENVIO],
      [
        EstadoDeclaracionCarga.PENDIENTE_ENVIO,
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
      ],
      [
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.VALIDADO_DPTO,
      ],
      [
        EstadoDeclaracionCarga.ENVIADO_DOCENTE,
        EstadoDeclaracionCarga.OBSERVADO_DPTO,
      ],
      [
        EstadoDeclaracionCarga.VALIDADO_DPTO,
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
      ],
    ])("permite la transición %s -> %s", (actual, siguiente) => {
      expect(() =>
        service.validarTransicionEstado(
          actual as EstadoDeclaracionCarga,
          siguiente as EstadoDeclaracionCarga,
        ),
      ).not.toThrow();
    });

    it.each([
      [EstadoDeclaracionCarga.BORRADOR, EstadoDeclaracionCarga.VALIDADO_DPTO],
      [
        EstadoDeclaracionCarga.PENDIENTE_ENVIO,
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
      ],
      [
        EstadoDeclaracionCarga.APROBADO_FACULTAD,
        EstadoDeclaracionCarga.BORRADOR,
      ],
      [EstadoDeclaracionCarga.CERRADO, EstadoDeclaracionCarga.BORRADOR],
    ])("rechaza la transición ilegal %s -> %s", (actual, siguiente) => {
      expect(() =>
        service.validarTransicionEstado(
          actual as EstadoDeclaracionCarga,
          siguiente as EstadoDeclaracionCarga,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe("carga lectiva desde horarios", () => {
    it("usa solo horarios CONFIRMADO e ignora BORRADOR y CONFLICTO", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        crearHorario(
          1,
          EstadoHorario.CONFIRMADO,
          "08:00",
          "10:00",
          10,
          20,
          TipoClase.TEORIA,
        ),
        crearHorario(
          2,
          EstadoHorario.BORRADOR,
          "10:00",
          "12:00",
          11,
          21,
          TipoClase.PRACTICA,
        ),
        crearHorario(
          3,
          EstadoHorario.CONFLICTO,
          "12:00",
          "13:00",
          12,
          22,
          TipoClase.LABORATORIO,
        ),
        crearHorario(
          4,
          EstadoHorario.CONFIRMADO,
          "14:00",
          "16:00",
          13,
          23,
          TipoClase.LABORATORIO,
        ),
      ]);

      const result = await service.generarCargaLectivaDesdeHorarios(7, 15);

      expect(mockHorarioRepo.createQueryBuilder).toHaveBeenCalledWith(
        "horario",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "horario.estado = :estado",
        {
          estado: EstadoHorario.CONFIRMADO,
        },
      );
      expect(result.registros).toHaveLength(2);
      expect(result.resumen.totalHoras).toBe(4);
      expect(result.resumen.totalBloques).toBe(2);
      expect(result.resumen.totalCursos).toBe(2);
    });

    it("calcula correctamente las horas totales", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        crearHorario(
          1,
          EstadoHorario.CONFIRMADO,
          "07:00",
          "09:30",
          10,
          20,
          TipoClase.TEORIA,
        ),
        crearHorario(
          2,
          EstadoHorario.CONFIRMADO,
          "10:00",
          "11:30",
          11,
          21,
          TipoClase.PRACTICA,
        ),
      ]);

      const result = await service.generarCargaLectivaDesdeHorarios(7, 15);

      expect(result.resumen.totalHoras).toBe(4);
      expect(result.resumen.horasPorCurso).toHaveLength(2);
      expect(result.resumen.horasPorTipoClase).toHaveLength(2);
    });
  });
});
