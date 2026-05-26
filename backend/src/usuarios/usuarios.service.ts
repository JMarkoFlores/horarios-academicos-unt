import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { CrearUsuarioDto } from "./dto/crear-usuario.dto";
import { ActualizarUsuarioDto } from "./dto/actualizar-usuario.dto";

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async crear(dto: CrearUsuarioDto): Promise<Partial<Usuario>> {
    const existe = await this.usuarioRepository.findOne({
      where: { email: dto.email },
    });
    if (existe) {
      throw new ConflictException(
        "Ya existe un usuario con ese correo electrónico",
      );
    }
    const password_hash = await bcrypt.hash(dto.password, 10);
    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      email: dto.email,
      password_hash,
      rol: dto.rol,
      activo: true,
    });
    const saved = await this.usuarioRepository.save(usuario);
    const { password_hash: _, ...resultado } = saved;
    return resultado;
  }

  async actualizar(
    id: number,
    dto: ActualizarUsuarioDto,
  ): Promise<Partial<Usuario>> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException("Usuario no encontrado");
    if (dto.email && dto.email !== usuario.email) {
      const existe = await this.usuarioRepository.findOne({
        where: { email: dto.email },
      });
      if (existe)
        throw new ConflictException(
          "Ya existe un usuario con ese correo electrónico",
        );
    }
    Object.assign(usuario, dto);
    const saved = await this.usuarioRepository.save(usuario);
    const { password_hash: _, ...resultado } = saved;
    return resultado;
  }

  async eliminar(id: number): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException("Usuario no encontrado");
    await this.usuarioRepository.remove(usuario);
  }

  async listar(): Promise<Partial<Usuario>[]> {
    const usuarios = await this.usuarioRepository.find({
      select: ["id", "nombre", "email", "rol", "activo", "created_at"],
      order: { created_at: "DESC" },
    });
    return usuarios;
  }

  async actualizarMiIdioma(usuarioId: number, idioma: string): Promise<Partial<Usuario>> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException("Usuario no encontrado");
    
    const supportedLanguages = ['es', 'en', 'pt'];
    if (!supportedLanguages.includes(idioma)) {
      throw new NotFoundException("Idioma no soportado");
    }
    
    usuario.idioma = idioma;
    const saved = await this.usuarioRepository.save(usuario);
    const { password_hash: _, ...resultado } = saved;
    return resultado;
  }
}
