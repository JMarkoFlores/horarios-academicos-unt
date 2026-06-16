import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { Usuario } from "../entities/usuario.entity";
import { CreateFacultadDto } from "./dto/create-facultad.dto";
import { UpdateFacultadDto } from "./dto/update-facultad.dto";
import { CreateEscuelaDto } from "./dto/create-escuela.dto";
import { UpdateEscuelaDto } from "./dto/update-escuela.dto";
import { CreateDepartamentoDto } from "./dto/create-departamento.dto";
import { UpdateDepartamentoDto } from "./dto/update-departamento.dto";

@Injectable()
export class FacultadesService {
  constructor(
    @InjectRepository(Facultad)
    private readonly facultadRepo: Repository<Facultad>,
    @InjectRepository(Escuela)
    private readonly escuelaRepo: Repository<Escuela>,
    @InjectRepository(Departamento)
    private readonly departamentoRepo: Repository<Departamento>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  // ── FACULTADES ────────────────────────────────────────────────────────────

  async findAllFacultades() {
    return this.facultadRepo.find({
      relations: ["coordinador", "escuelas"],
      order: { nombre: "ASC" },
    });
  }

  async findOneFacultad(id: number) {
    const f = await this.facultadRepo.findOne({
      where: { id },
      relations: ["coordinador", "escuelas", "escuelas.departamentos"],
    });
    if (!f) throw new NotFoundException(`Facultad ${id} no encontrada`);
    return f;
  }

  async createFacultad(dto: CreateFacultadDto) {
    const existe = await this.facultadRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe)
      throw new ConflictException(
        `Ya existe una facultad con el código ${dto.codigo}`,
      );

    const nombreExiste = await this.facultadRepo.findOne({
      where: { nombre: dto.nombre },
    });
    if (nombreExiste)
      throw new ConflictException(
        `Ya existe una facultad con el nombre "${dto.nombre}"`,
      );

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    const facultad = this.facultadRepo.create(dto);
    return this.facultadRepo.save(facultad);
  }

  async updateFacultad(id: number, dto: UpdateFacultadDto) {
    const facultad = await this.facultadRepo.findOne({ where: { id } });
    if (!facultad) throw new NotFoundException(`Facultad ${id} no encontrada`);

    if (dto.codigo && dto.codigo !== facultad.codigo) {
      const existe = await this.facultadRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe)
        throw new ConflictException(
          `Ya existe una facultad con el código ${dto.codigo}`,
        );
    }

    if (dto.nombre && dto.nombre !== facultad.nombre) {
      const existe = await this.facultadRepo.findOne({
        where: { nombre: dto.nombre },
      });
      if (existe)
        throw new ConflictException(
          `Ya existe una facultad con el nombre "${dto.nombre}"`,
        );
    }

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    Object.assign(facultad, dto);
    return this.facultadRepo.save(facultad);
  }

  async removeFacultad(id: number) {
    const facultad = await this.facultadRepo.findOne({
      where: { id },
      relations: ["escuelas"],
    });
    if (!facultad) throw new NotFoundException(`Facultad ${id} no encontrada`);
    if (facultad.escuelas?.length > 0) {
      throw new BadRequestException(
        "No se puede eliminar una facultad que tiene escuelas asociadas",
      );
    }
    return this.facultadRepo.remove(facultad);
  }

  // ── ESCUELAS ──────────────────────────────────────────────────────────────

  async findAllEscuelas(facultadId?: number) {
    const where: any = {};
    if (facultadId) where.facultad_id = facultadId;
    return this.escuelaRepo.find({
      where,
      relations: ["facultad", "coordinador", "departamentos"],
      order: { nombre: "ASC" },
    });
  }

  async findOneEscuela(id: number) {
    const e = await this.escuelaRepo.findOne({
      where: { id },
      relations: ["facultad", "coordinador", "departamentos"],
    });
    if (!e) throw new NotFoundException(`Escuela ${id} no encontrada`);
    return e;
  }

  async createEscuela(dto: CreateEscuelaDto) {
    await this.validarFacultad(dto.facultad_id);

    const existe = await this.escuelaRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe)
      throw new ConflictException(
        `Ya existe una escuela con el código ${dto.codigo}`,
      );

    const nombreExiste = await this.escuelaRepo.findOne({
      where: { nombre: dto.nombre, facultad_id: dto.facultad_id },
    });
    if (nombreExiste)
      throw new ConflictException(
        `Ya existe una escuela con el nombre "${dto.nombre}" en esta facultad`,
      );

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    const escuela = this.escuelaRepo.create(dto);
    return this.escuelaRepo.save(escuela);
  }

  async updateEscuela(id: number, dto: UpdateEscuelaDto) {
    const escuela = await this.escuelaRepo.findOne({ where: { id } });
    if (!escuela) throw new NotFoundException(`Escuela ${id} no encontrada`);

    if (dto.facultad_id) await this.validarFacultad(dto.facultad_id);

    if (dto.codigo && dto.codigo !== escuela.codigo) {
      const existe = await this.escuelaRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe)
        throw new ConflictException(
          `Ya existe una escuela con el código ${dto.codigo}`,
        );
    }

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    Object.assign(escuela, dto);
    return this.escuelaRepo.save(escuela);
  }

  async removeEscuela(id: number) {
    const escuela = await this.escuelaRepo.findOne({
      where: { id },
      relations: ["departamentos"],
    });
    if (!escuela) throw new NotFoundException(`Escuela ${id} no encontrada`);
    if (escuela.departamentos?.length > 0) {
      throw new BadRequestException(
        "No se puede eliminar una escuela que tiene departamentos asociados",
      );
    }
    return this.escuelaRepo.remove(escuela);
  }

  // ── DEPARTAMENTOS ─────────────────────────────────────────────────────────

  async findAllDepartamentos(escuelaId?: number) {
    const where: any = {};
    if (escuelaId) where.escuela_id = escuelaId;
    return this.departamentoRepo.find({
      where,
      relations: ["escuela", "escuela.facultad", "coordinador"],
      order: { nombre: "ASC" },
    });
  }

  async findOneDepartamento(id: number) {
    const d = await this.departamentoRepo.findOne({
      where: { id },
      relations: ["escuela", "escuela.facultad", "coordinador"],
    });
    if (!d) throw new NotFoundException(`Departamento ${id} no encontrado`);
    return d;
  }

  async createDepartamento(dto: CreateDepartamentoDto) {
    await this.validarEscuela(dto.escuela_id);

    const existe = await this.departamentoRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existe)
      throw new ConflictException(
        `Ya existe un departamento con el código ${dto.codigo}`,
      );

    const nombreExiste = await this.departamentoRepo.findOne({
      where: { nombre: dto.nombre, escuela_id: dto.escuela_id },
    });
    if (nombreExiste)
      throw new ConflictException(
        `Ya existe un departamento con el nombre "${dto.nombre}" en esta escuela`,
      );

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    const dep = this.departamentoRepo.create(dto);
    return this.departamentoRepo.save(dep);
  }

  async updateDepartamento(id: number, dto: UpdateDepartamentoDto) {
    const dep = await this.departamentoRepo.findOne({ where: { id } });
    if (!dep) throw new NotFoundException(`Departamento ${id} no encontrado`);

    if (dto.escuela_id) await this.validarEscuela(dto.escuela_id);

    if (dto.codigo && dto.codigo !== dep.codigo) {
      const existe = await this.departamentoRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (existe)
        throw new ConflictException(
          `Ya existe un departamento con el código ${dto.codigo}`,
        );
    }

    if (dto.coordinador_id) await this.validarUsuario(dto.coordinador_id);

    Object.assign(dep, dto);
    return this.departamentoRepo.save(dep);
  }

  async removeDepartamento(id: number) {
    const dep = await this.departamentoRepo.findOne({ where: { id } });
    if (!dep) throw new NotFoundException(`Departamento ${id} no encontrado`);
    return this.departamentoRepo.remove(dep);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private async validarFacultad(id: number) {
    const f = await this.facultadRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException(`Facultad ${id} no encontrada`);
  }

  private async validarEscuela(id: number) {
    const e = await this.escuelaRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException(`Escuela ${id} no encontrada`);
  }

  private async validarUsuario(id: number) {
    const u = await this.usuarioRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
  }
}
