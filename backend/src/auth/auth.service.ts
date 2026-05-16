import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { LoginDto } from "./dto/login.dto";

export interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
}

export interface LoginResult {
  access_token: string;
  usuario: Partial<Usuario>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
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

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
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

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
