import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Usuario } from "../entities/usuario.entity";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión con email y contraseña" })
  @ApiResponse({
    status: 200,
    description: "Login exitoso — retorna JWT y datos del usuario",
  })
  @ApiResponse({ status: 401, description: "Credenciales inválidas" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Renovar el token de acceso" })
  @ApiResponse({ status: 200, description: "Token renovado exitosamente" })
  @ApiResponse({ status: 401, description: "Token inválido o expirado" })
  async refresh(@CurrentUser() usuario: Usuario) {
    return this.authService.refreshToken(usuario);
  }
}
