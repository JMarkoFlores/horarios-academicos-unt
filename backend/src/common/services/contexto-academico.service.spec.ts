import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ContextoAcademicoService } from "./contexto-academico.service";
import { Departamento } from "../../entities/departamento.entity";
import { Escuela } from "../../entities/escuela.entity";
import { Facultad } from "../../entities/facultad.entity";
import { Docente } from "../../entities/docente.entity";
import { RolUsuario } from "../enums/rol-usuario.enum";

describe("ContextoAcademicoService", () => {
  let service: ContextoAcademicoService;

  const departamentoRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const escuelaRepo = { findOne: jest.fn() };
  const facultadRepo = { findOne: jest.fn() };
  const docenteRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextoAcademicoService,
        { provide: getRepositoryToken(Departamento), useValue: departamentoRepo },
        { provide: getRepositoryToken(Escuela), useValue: escuelaRepo },
        { provide: getRepositoryToken(Facultad), useValue: facultadRepo },
        { provide: getRepositoryToken(Docente), useValue: docenteRepo },
      ],
    }).compile();

    service = module.get(ContextoAcademicoService);
  });

  it("administrador ve todo", async () => {
    const contexto = await service.resolverContexto({
      id: 1,
      rol: RolUsuario.ADMINISTRADOR_SISTEMA,
    } as any);

    expect(contexto.verTodo).toBe(true);
    expect(contexto.departamentoIds).toEqual([]);
  });

  it("director de departamento solo ve su departamento", async () => {
    departamentoRepo.findOne.mockResolvedValue({
      id: 10,
      nombre: "Dpto. Sistemas",
      escuela_id: 2,
      escuela: { facultad_id: 1, nombre: "IS", facultad: { nombre: "FI" } },
    });

    const contexto = await service.resolverContexto({
      id: 5,
      rol: RolUsuario.DIRECTOR_DEPARTAMENTO,
    } as any);

    expect(contexto.verTodo).toBe(false);
    expect(contexto.departamentoIds).toEqual([10]);
    expect(contexto.departamentoNombre).toBe("Dpto. Sistemas");
  });

  it("decano ve departamentos de su facultad", async () => {
    facultadRepo.findOne.mockResolvedValue({ id: 1, nombre: "FI" });
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ id: 10 }, { id: 11 }, { id: 12 }]),
    };
    departamentoRepo.createQueryBuilder.mockReturnValue(qb);

    const contexto = await service.resolverContexto({
      id: 3,
      rol: RolUsuario.DECANO,
    } as any);

    expect(contexto.facultadId).toBe(1);
    expect(contexto.departamentoIds).toEqual([10, 11, 12]);
  });

  it("secretaria sin departamento lanza error", async () => {
    docenteRepo.findOne.mockResolvedValue(null);

    await expect(
      service.resolverContexto({
        id: 8,
        rol: RolUsuario.SECRETARIA,
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("filtra docentes por departamento", () => {
    const qb = { andWhere: jest.fn() };
    service.aplicarFiltroDocente(qb as any, {
      verTodo: false,
      facultadId: null,
      escuelaId: null,
      departamentoIds: [10],
      docenteId: null,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      "docente.departamento_id IN (:...departamentoIds)",
      { departamentoIds: [10] },
    );
  });
});
