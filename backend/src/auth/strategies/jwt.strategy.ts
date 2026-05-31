import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Usuario } from "../../entities/usuario.entity";
import { Docente } from "../../entities/docente.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: { sub: number; email: string; rol: string; docenteId?: number | null }) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException("Token inválido o usuario inactivo");
    }

    const docente = await this.docenteRepository.findOne({
      where: { usuario_id: usuario.id },
    });

    if (docente) {
      return { ...usuario, docenteId: docente.id } as Usuario & { docenteId: number };
    }

    const docenteLegacy = await this.docenteRepository.findOne({
      where: { email: usuario.email },
    });

    return {
      ...usuario,
      docenteId: docenteLegacy?.id ?? payload.docenteId ?? null,
    } as Usuario & { docenteId: number | null };
  }
}
