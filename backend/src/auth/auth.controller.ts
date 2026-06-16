import {
  Controller,
  Post,
  Get,
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
import { CambiarPasswordDto } from "./dto/cambiar-password.dto";
import { RecuperarPasswordDto } from "./dto/recuperar-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
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

  @Get("perfil")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Obtener perfil y contexto académico del usuario" })
  @ApiResponse({ status: 200, description: "Perfil del usuario autenticado" })
  async perfil(@CurrentUser() usuario: Usuario & { docenteId?: number | null }) {
    const data = await this.authService.obtenerPerfil(usuario);
    return { data, message: "Perfil obtenido correctamente" };
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

  @Post("cambiar-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Cambiar contraseña del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Contraseña cambiada exitosamente" })
  @ApiResponse({ status: 400, description: "Las contraseñas no coinciden" })
  @ApiResponse({ status: 401, description: "Contraseña actual incorrecta" })
  async cambiarPassword(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CambiarPasswordDto,
  ) {
    await this.authService.cambiarPassword(usuario, dto);
    return { message: "Contraseña cambiada exitosamente" };
  }

  @Post("recuperar-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicitar recuperación de contraseña por email" })
  @ApiResponse({ status: 200, description: "Solicitud procesada" })
  async recuperarPassword(@Body() dto: RecuperarPasswordDto) {
    await this.authService.recuperarPassword(dto);
    return {
      message: "Si el correo existe, recibirás un enlace de recuperación",
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restablecer contraseña con token de recuperación" })
  @ApiResponse({
    status: 200,
    description: "Contraseña restablecida exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Token inválido, expirado o contraseñas no coinciden",
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: "Contraseña restablecida exitosamente" };
  }
}
