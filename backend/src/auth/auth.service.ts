import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { LoginDto } from "./dto/login.dto";
import { CambiarPasswordDto } from "./dto/cambiar-password.dto";
import { ActualizarPerfilDto } from "./dto/actualizar-perfil.dto";
import { RecuperarPasswordDto } from "./dto/recuperar-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { MailService } from "../mail/mail.service";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { ContextoAcademicoService } from "../common/services/contexto-academico.service";
import { ContextoAcademico } from "../common/interfaces/contexto-academico.interface";

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
  docenteId?: number | null;
}

export interface LoginResult {
  access_token: string;
  usuario: Partial<Usuario> & {
    docenteId?: number | null;
    contextoAcademico?: ContextoAcademico;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const { email, password } = loginDto;
    const usuario = await this.validateUser(email, password);

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    this.logger.log(`Login exitoso: ${usuario.email}`);

    const docente = await this.resolverDocentePorUsuario(
      usuario.id,
      usuario.email,
    );

    payload.docenteId = docente?.id ?? null;

    const contextoAcademico =
      await this.contextoAcademicoService.resolverContexto({
        ...usuario,
        docenteId: payload.docenteId,
      });

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        docenteId: docente?.id ?? null,
        debe_cambiar_password: usuario.debe_cambiar_password,
        contextoAcademico,
      },
    };
  }

  async obtenerPerfil(
    usuario: Usuario & { docenteId?: number | null },
  ): Promise<{
    id: number;
    nombre: string;
    email: string;
    rol: RolUsuario;
    docenteId: number | null;
    debe_cambiar_password: boolean;
    contextoAcademico: ContextoAcademico;
  }> {
    const docente =
      usuario.docenteId != null
        ? await this.docenteRepository.findOne({
            where: { id: usuario.docenteId },
          })
        : await this.resolverDocentePorUsuario(usuario.id, usuario.email);

    const docenteId = docente?.id ?? null;
    const contextoAcademico =
      await this.contextoAcademicoService.resolverContexto({
        ...usuario,
        docenteId,
      });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      docenteId,
      debe_cambiar_password: usuario.debe_cambiar_password,
      contextoAcademico,
    };
  }

  async refreshToken(usuario: Usuario): Promise<{ access_token: string }> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return { access_token: this.jwtService.sign(payload) };
  }

  async validateUser(email: string, password: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email },
    });

    if (!usuario) {
      throw new UnauthorizedException("Credenciales invÃ¡lidas");
    }

    if (!usuario.activo) {
      throw new UnauthorizedException("Usuario inactivo");
    }

    const passwordValido = await this.comparePassword(
      password,
      usuario.password_hash,
    );

    if (!passwordValido) {
      throw new UnauthorizedException("Credenciales invÃ¡lidas");
    }

    return usuario;
  }

  private async resolverDocentePorUsuario(
    usuarioId: number,
    email: string,
  ): Promise<Docente | null> {
    const docentePorUsuario = await this.docenteRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (docentePorUsuario) {
      return docentePorUsuario;
    }

    return this.docenteRepository.findOne({
      where: { email },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  }

  async cambiarPassword(
    usuario: Usuario,
    dto: CambiarPasswordDto,
  ): Promise<void> {
    if (dto.password_nueva !== dto.confirmar_password) {
      throw new BadRequestException("Las contraseÃ±as no coinciden");
    }
    const valida = await this.comparePassword(
      dto.password_actual,
      usuario.password_hash,
    );
    if (!valida) {
      throw new UnauthorizedException("ContraseÃ±a actual incorrecta");
    }
    usuario.password_hash = await this.hashPassword(dto.password_nueva);
    usuario.debe_cambiar_password = false;
    await this.usuarioRepository.save(usuario);
  }

  async actualizarPerfil(
    usuario: Usuario,
    dto: ActualizarPerfilDto,
  ): Promise<{
    id: number;
    nombre: string;
    email: string;
    debe_cambiar_password: boolean;
  }> {
    if (!dto.nombre && !dto.email) {
      throw new BadRequestException(
        "Debe proporcionar al menos un campo a actualizar",
      );
    }

    if (dto.nombre) {
      usuario.nombre = dto.nombre;
    }

    if (dto.email && dto.email !== usuario.email) {
      const existente = await this.usuarioRepository.findOne({
        where: { email: dto.email },
      });
      if (existente) {
        throw new ConflictException("El correo electrónico ya está registrado");
      }
      usuario.email = dto.email;
    }

    await this.usuarioRepository.save(usuario);

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      debe_cambiar_password: usuario.debe_cambiar_password,
    };
  }

  async recuperarPassword(dto: RecuperarPasswordDto): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email: dto.email },
    });
    if (usuario) {
      const token = crypto.randomUUID();
      const expira = new Date();
      expira.setHours(expira.getHours() + 1);
      usuario.reset_token = token;
      usuario.reset_token_expira = expira;
      await this.usuarioRepository.save(usuario);
      await this.mailService.sendPasswordReset(dto.email, token);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.password_nueva !== dto.confirmar_password) {
      throw new BadRequestException("Las contraseÃ±as no coinciden");
    }
    const usuario = await this.usuarioRepository.findOne({
      where: { reset_token: dto.token },
    });
    if (!usuario || !usuario.reset_token_expira) {
      throw new NotFoundException("Token invÃ¡lido o expirado");
    }
    if (usuario.reset_token_expira < new Date()) {
      throw new BadRequestException("El token ha expirado");
    }
    usuario.password_hash = await this.hashPassword(dto.password_nueva);
    usuario.debe_cambiar_password = false;
    usuario.reset_token = null;
    usuario.reset_token_expira = null;
    await this.usuarioRepository.save(usuario);
  }
}
