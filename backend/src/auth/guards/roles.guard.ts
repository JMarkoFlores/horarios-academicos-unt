import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { REQUIERE_ALCANCE_KEY } from "../decorators/requiere-alcance.decorator";
import { ContextoAcademicoService } from "../../common/services/contexto-academico.service";
import { UsuarioAutenticado } from "../../common/interfaces/contexto-academico.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly contextoAcademicoService: ContextoAcademicoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UsuarioAutenticado | undefined;

    if (!user || !requiredRoles.includes(user.rol)) {
      return false;
    }

    if (!user.contextoAcademico) {
      user.contextoAcademico =
        await this.contextoAcademicoService.resolverContexto(user);
      request.user = user;
    }

    const requiereAlcance = this.reflector.getAllAndOverride<boolean>(
      REQUIERE_ALCANCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiereAlcance) {
      this.contextoAcademicoService.assertAlcanceAsignado(
        user.contextoAcademico,
      );
    }

    return true;
  }
}
