import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Next,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UsuariosService } from "./usuarios.service";
import { CrearUsuarioDto } from "./dto/crear-usuario.dto";
import { ActualizarUsuarioDto } from "./dto/actualizar-usuario.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@ApiTags("usuarios")
@Controller("usuarios")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear nuevo usuario del sistema" })
  @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
  @ApiResponse({ status: 409, description: "El correo ya está registrado" })
  async crear(@Body() dto: CrearUsuarioDto) {
    const result = await this.usuariosService.crear(dto);
    return { data: result, message: "Usuario creado exitosamente" };
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Listar todos los usuarios del sistema" })
  @ApiResponse({ status: 200, description: "Lista de usuarios" })
  async listar() {
    const result = await this.usuariosService.listar();
    return { data: result, message: "Usuarios obtenidos" };
  }

  @Patch("mi-idioma")
  @ApiOperation({ summary: "Actualizar idioma preferido del usuario actual" })
  @ApiResponse({ status: 200, description: "Idioma actualizado correctamente" })
  async actualizarMiIdioma(@Body() dto: { idioma: string }, @Req() req: any) {
    const usuarioId = req.user?.id;
    const result = await this.usuariosService.actualizarMiIdioma(usuarioId, dto.idioma);
    return { data: result, message: "Idioma actualizado correctamente" };
  }

  @Patch(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @ApiOperation({ summary: "Actualizar usuario del sistema" })
  @ApiResponse({ status: 200, description: "Usuario actualizado" })
  async actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    const result = await this.usuariosService.actualizar(id, dto);
    return { data: result, message: "Usuario actualizado correctamente" };
  }

  @Delete(":id")
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar usuario del sistema" })
  async eliminar(@Param("id", ParseIntPipe) id: number) {
    await this.usuariosService.eliminar(id);
  }
}
