import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, Param, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DataImportService, ImportPreview, ImportResult } from './data-import.service';
import { EntityType } from './csv-mapper.service';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';

@Controller('data-import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post('upload')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSV(
    @UploadedFile() file: any,
    @Body('entityType') entityType: EntityType,
  ): Promise<{ sessionId: string; preview: ImportPreview }> {
    return this.dataImportService.uploadAndPreview(file, entityType);
  }

  @Get('preview/:sessionId')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  async getPreview(@Param('sessionId') sessionId: string): Promise<ImportPreview> {
    return this.dataImportService.getSessionPreview(sessionId);
  }

  @Post('confirm/:sessionId')
  @HttpCode(HttpStatus.OK)
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  async confirmImport(
    @Param('sessionId') sessionId: string,
    @Body('periodoId') periodoId?: number,
  ): Promise<ImportResult> {
    return this.dataImportService.confirmImport(sessionId, periodoId);
  }

  @Get('status/:sessionId')
  @Roles(RolUsuario.ADMINISTRADOR_SISTEMA, RolUsuario.COORDINADOR_ACADEMICO)
  async getStatus(@Param('sessionId') sessionId: string) {
    return this.dataImportService.getSessionStatus(sessionId);
  }
}
