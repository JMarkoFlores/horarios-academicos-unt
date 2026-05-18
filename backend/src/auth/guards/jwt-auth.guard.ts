import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (info?.name === "TokenExpiredError") {
      throw new UnauthorizedException("El token ha expirado");
    }
    if (err || !user) {
      throw (
        err || new UnauthorizedException("Token inválido o no proporcionado")
      );
    }
    return user;
  }
}
