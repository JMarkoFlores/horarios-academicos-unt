import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { RolUsuario } from "../enums/rol-usuario.enum";
import { Usuario } from "../../entities/usuario.entity";
import { Docente } from "../../entities/docente.entity";
import { Departamento } from "../../entities/departamento.entity";
import { Escuela } from "../../entities/escuela.entity";
import { Facultad } from "../../entities/facultad.entity";
import {
  ContextoAcademico,
  UsuarioAutenticado,
} from "../interfaces/contexto-academico.interface";

@Injectable()
export class ContextoAcademicoService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
    @InjectRepository(Escuela)
    private readonly escuelaRepo: Repository<Escuela>,
    @InjectRepository(Facultad)
    private readonly facultadRepo: Repository<Facultad>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  async resolverContexto(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<ContextoAcademico> {
    switch (usuario.rol) {
      case RolUsuario.ADMINISTRADOR_SISTEMA:
      case RolUsuario.OPERADOR_HORARIOS:
        return this.contextoGlobal(usuario.docenteId ?? null);

      case RolUsuario.DOCENTE:
        return {
          verTodo: false,
          facultadId: null,
          escuelaId: null,
          departamentoIds: [],
          docenteId: usuario.docenteId ?? null,
        };

      case RolUsuario.DIRECTOR_DEPARTAMENTO:
        return this.resolverPorDepartamento(usuario);

      case RolUsuario.DECANO:
        return this.resolverPorFacultad(usuario);

      case RolUsuario.DIRECTOR_ESCUELA:
      case RolUsuario.COORDINADOR_ACADEMICO:
        return this.resolverPorEscuela(usuario);

      case RolUsuario.SECRETARIA:
        return this.resolverSecretaria(usuario);

      default:
        return {
          verTodo: false,
          facultadId: null,
          escuelaId: null,
          departamentoIds: [],
          docenteId: usuario.docenteId ?? null,
        };
    }
  }

  aplicarFiltroDocente(
    qb: SelectQueryBuilder<unknown>,
    contexto: ContextoAcademico,
    alias = "docente",
  ): void {
    if (contexto.verTodo) {
      return;
    }

    if (contexto.docenteId) {
      qb.andWhere(`${alias}.id = :docenteScopeId`, {
        docenteScopeId: contexto.docenteId,
      });
      return;
    }

    if (contexto.departamentoIds.length > 0) {
      qb.andWhere(`${alias}.departamento_id IN (:...departamentoIds)`, {
        departamentoIds: contexto.departamentoIds,
      });
      return;
    }

    qb.andWhere("1 = 0");
  }

  aplicarFiltroDeclaracion(
    qb: SelectQueryBuilder<unknown>,
    contexto: ContextoAcademico,
    alias = "declaracion",
  ): void {
    if (contexto.verTodo) {
      return;
    }

    if (contexto.docenteId) {
      qb.andWhere(`${alias}.docente_id = :docenteScopeId`, {
        docenteScopeId: contexto.docenteId,
      });
      return;
    }

    if (contexto.departamentoIds.length > 0) {
      qb.andWhere(`${alias}.departamento_id IN (:...departamentoIds)`, {
        departamentoIds: contexto.departamentoIds,
      });
      return;
    }

    qb.andWhere("1 = 0");
  }

  puedeAccederDocente(
    contexto: ContextoAcademico,
    docente: { id: number; departamento_id?: number | null },
  ): boolean {
    if (contexto.verTodo) {
      return true;
    }

    if (contexto.docenteId) {
      return docente.id === contexto.docenteId;
    }

    if (
      docente.departamento_id &&
      contexto.departamentoIds.includes(docente.departamento_id)
    ) {
      return true;
    }

    return false;
  }

  assertAccesoDocente(
    contexto: ContextoAcademico,
    docente: { id: number; departamento_id?: number | null },
    mensaje = "No tiene permiso para acceder a este docente",
  ): void {
    if (!this.puedeAccederDocente(contexto, docente)) {
      throw new ForbiddenException(mensaje);
    }
  }

  assertAlcanceAsignado(contexto: ContextoAcademico): void {
    if (contexto.verTodo || contexto.docenteId || contexto.departamentoIds.length) {
      return;
    }
    throw new ForbiddenException(
      "Su usuario no tiene una unidad académica asignada",
    );
  }

  obtenerUsuarioConContexto(
    usuario: UsuarioAutenticado,
  ): UsuarioAutenticado & { contextoAcademico: ContextoAcademico } {
    if (!usuario.contextoAcademico) {
      throw new ForbiddenException(
        "No se pudo resolver el contexto académico del usuario",
      );
    }
    return usuario as UsuarioAutenticado & {
      contextoAcademico: ContextoAcademico;
    };
  }

  private contextoGlobal(docenteId: number | null): ContextoAcademico {
    return {
      verTodo: true,
      facultadId: null,
      escuelaId: null,
      departamentoIds: [],
      docenteId,
    };
  }

  private async resolverPorDepartamento(
    usuario: Usuario,
  ): Promise<ContextoAcademico> {
    let departamento = await this.departamentoRepo.findOne({
      where: { coordinador_id: usuario.id },
      relations: ["escuela", "escuela.facultad"],
    });

    if (!departamento && usuario.departamento_id) {
      departamento = await this.departamentoRepo.findOne({
        where: { id: usuario.departamento_id },
        relations: ["escuela", "escuela.facultad"],
      });
    }

    if (!departamento) {
      throw new ForbiddenException(
        "No tiene un departamento asignado como director",
      );
    }

    return {
      verTodo: false,
      facultadId: departamento.escuela?.facultad_id ?? null,
      escuelaId: departamento.escuela_id,
      departamentoIds: [departamento.id],
      docenteId: null,
      departamentoNombre: departamento.nombre,
      escuelaNombre: departamento.escuela?.nombre ?? null,
      facultadNombre: departamento.escuela?.facultad?.nombre ?? null,
    };
  }

  private async resolverPorFacultad(
    usuario: Usuario,
  ): Promise<ContextoAcademico> {
    let facultad = await this.facultadRepo.findOne({
      where: { coordinador_id: usuario.id },
    });

    if (!facultad && usuario.facultad_id) {
      facultad = await this.facultadRepo.findOne({
        where: { id: usuario.facultad_id },
      });
    }

    if (!facultad) {
      throw new ForbiddenException("No tiene una facultad asignada como decano");
    }

    const departamentos = await this.departamentoRepo
      .createQueryBuilder("departamento")
      .innerJoin("departamento.escuela", "escuela")
      .where("escuela.facultad_id = :facultadId", { facultadId: facultad.id })
      .getMany();

    return {
      verTodo: false,
      facultadId: facultad.id,
      escuelaId: null,
      departamentoIds: departamentos.map((d) => d.id),
      docenteId: null,
      facultadNombre: facultad.nombre,
    };
  }

  private async resolverPorEscuela(
    usuario: Usuario,
  ): Promise<ContextoAcademico> {
    let escuela = await this.escuelaRepo.findOne({
      where: { coordinador_id: usuario.id },
      relations: ["facultad"],
    });

    if (!escuela && usuario.escuela_id) {
      escuela = await this.escuelaRepo.findOne({
        where: { id: usuario.escuela_id },
        relations: ["facultad"],
      });
    }

    if (!escuela) {
      throw new ForbiddenException(
        "No tiene una escuela asignada como coordinador o director",
      );
    }

    const departamentos = await this.departamentoRepo.find({
      where: { escuela_id: escuela.id },
    });

    return {
      verTodo: false,
      facultadId: escuela.facultad_id,
      escuelaId: escuela.id,
      departamentoIds: departamentos.map((d) => d.id),
      docenteId: null,
      escuelaNombre: escuela.nombre,
      facultadNombre: escuela.facultad?.nombre ?? null,
    };
  }

  private async resolverSecretaria(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<ContextoAcademico> {
    let departamentoId = usuario.departamento_id ?? null;

    if (!departamentoId) {
      const docentePorUsuario = await this.docenteRepo.findOne({
        where: { usuario_id: usuario.id },
      });
      departamentoId = docentePorUsuario?.departamento_id ?? null;
    }

    if (!departamentoId && usuario.docenteId) {
      const docente = await this.docenteRepo.findOne({
        where: { id: usuario.docenteId },
      });
      departamentoId = docente?.departamento_id ?? null;
    }

    if (!departamentoId) {
      throw new ForbiddenException(
        "La secretaría no tiene un departamento asignado",
      );
    }

    const departamento = await this.departamentoRepo.findOne({
      where: { id: departamentoId },
      relations: ["escuela", "escuela.facultad"],
    });

    return {
      verTodo: false,
      facultadId: departamento?.escuela?.facultad_id ?? null,
      escuelaId: departamento?.escuela_id ?? null,
      departamentoIds: [departamentoId],
      docenteId: null,
      departamentoNombre: departamento?.nombre ?? null,
      escuelaNombre: departamento?.escuela?.nombre ?? null,
      facultadNombre: departamento?.escuela?.facultad?.nombre ?? null,
    };
  }
}
