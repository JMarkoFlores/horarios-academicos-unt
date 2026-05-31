import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
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
import { RecuperarPasswordDto } from "./dto/recuperar-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { MailService } from "../mail/mail.service";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
  docenteId?: number | null;
}

export interface LoginResult {
  access_token: string;
  usuario: Partial<Usuario> & { docenteId?: number | null };
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

    const docente = await this.resolverDocentePorUsuario(usuario.id, usuario.email);

    payload.docenteId = docente?.id ?? null;

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        docenteId: docente?.id ?? null,
      },
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
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!usuario.activo) {
      throw new UnauthorizedException("Usuario inactivo");
    }

    const passwordValido = await this.comparePassword(
      password,
      usuario.password_hash,
    );

    if (!passwordValido) {
      throw new UnauthorizedException("Credenciales inválidas");
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
      throw new BadRequestException("Las contraseñas no coinciden");
    }
    const valida = await this.comparePassword(
      dto.password_actual,
      usuario.password_hash,
    );
    if (!valida) {
      throw new UnauthorizedException("Contraseña actual incorrecta");
    }
    usuario.password_hash = await this.hashPassword(dto.password_nueva);
    await this.usuarioRepository.save(usuario);
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
      this.mailService.sendPasswordReset(dto.email, token);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.password_nueva !== dto.confirmar_password) {
      throw new BadRequestException("Las contraseñas no coinciden");
    }
    const usuario = await this.usuarioRepository.findOne({
      where: { reset_token: dto.token },
    });
    if (!usuario || !usuario.reset_token_expira) {
      throw new NotFoundException("Token inválido o expirado");
    }
    if (usuario.reset_token_expira < new Date()) {
      throw new BadRequestException("El token ha expirado");
    }
    usuario.password_hash = await this.hashPassword(dto.password_nueva);
    usuario.reset_token = null;
    usuario.reset_token_expira = null;
    await this.usuarioRepository.save(usuario);
  }
}
