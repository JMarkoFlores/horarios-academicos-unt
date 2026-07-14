import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Usuario } from "../../entities/usuario.entity";
import { Docente } from "../../entities/docente.entity";
import { ContextoAcademicoService } from "../../common/services/contexto-academico.service";
import { UsuarioAutenticado } from "../../common/interfaces/contexto-academico.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ?? "fallback-secret-dev-only",
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    rol: string;
    docenteId?: number | null;
  }): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException("Token invÃ¡lido o usuario inactivo");
    }

    const docente = await this.docenteRepository.findOne({
      where: { usuario_id: usuario.id },
    });

    const docenteLegacy = docente
      ? null
      : await this.docenteRepository.findOne({
          where: { email: usuario.email },
        });

    const docenteId =
      docente?.id ?? docenteLegacy?.id ?? payload.docenteId ?? null;

    const usuarioConDocente = {
      ...usuario,
      docenteId,
    } as UsuarioAutenticado;

    usuarioConDocente.contextoAcademico =
      await this.contextoAcademicoService.resolverContexto(usuarioConDocente);

    return usuarioConDocente;
  }
}
