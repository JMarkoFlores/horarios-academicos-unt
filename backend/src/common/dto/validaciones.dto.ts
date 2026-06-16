import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  Matches,
  IsNumber,
} from "class-validator";

const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

export class VerificarCruceDocenteDto {
  @ApiProperty({ description: "ID del docente", example: 1 })
  @IsInt()
  docenteId: number;

  @ApiProperty({
    description: "Día de la semana (1-7)",
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @ApiProperty({
    description: "Hora de inicio (HH:MM o HH:MM:SS)",
    example: "08:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de inicio debe estar en formato HH:MM o HH:MM:SS",
  })
  horaInicio: string;

  @ApiProperty({
    description: "Hora de fin (HH:MM o HH:MM:SS)",
    example: "10:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de fin debe estar en formato HH:MM o HH:MM:SS",
  })
  horaFin: string;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiPropertyOptional({
    description: "ID de horario asignado a excluir",
    example: 5,
  })
  @IsOptional()
  @IsInt()
  excluirId?: number;
}

export class VerificarCruceAmbienteDto {
  @ApiProperty({ description: "ID del ambiente", example: 1 })
  @IsInt()
  ambienteId: number;

  @ApiProperty({
    description: "Día de la semana (1-7)",
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @ApiProperty({
    description: "Hora de inicio (HH:MM o HH:MM:SS)",
    example: "08:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de inicio debe estar en formato HH:MM o HH:MM:SS",
  })
  horaInicio: string;

  @ApiProperty({
    description: "Hora de fin (HH:MM o HH:MM:SS)",
    example: "10:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de fin debe estar en formato HH:MM o HH:MM:SS",
  })
  horaFin: string;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiPropertyOptional({
    description: "ID de horario asignado a excluir",
    example: 5,
  })
  @IsOptional()
  @IsInt()
  excluirId?: number;
}

export class VerificarCruceGrupoDto {
  @ApiProperty({ description: "ID del grupo", example: 1 })
  @IsInt()
  grupoId: number;

  @ApiProperty({
    description: "Día de la semana (1-7)",
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @ApiProperty({
    description: "Hora de inicio (HH:MM o HH:MM:SS)",
    example: "08:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de inicio debe estar en formato HH:MM o HH:MM:SS",
  })
  horaInicio: string;

  @ApiProperty({
    description: "Hora de fin (HH:MM o HH:MM:SS)",
    example: "10:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de fin debe estar en formato HH:MM o HH:MM:SS",
  })
  horaFin: string;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;

  @ApiPropertyOptional({
    description: "ID de horario asignado a excluir",
    example: 5,
  })
  @IsOptional()
  @IsInt()
  excluirId?: number;
}

export class VerificarDisponibilidadDocenteDto {
  @ApiProperty({ description: "ID del docente", example: 1 })
  @IsInt()
  docenteId: number;

  @ApiProperty({
    description: "Día de la semana (1-7)",
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @ApiProperty({
    description: "Hora de inicio (HH:MM o HH:MM:SS)",
    example: "08:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de inicio debe estar en formato HH:MM o HH:MM:SS",
  })
  horaInicio: string;

  @ApiProperty({
    description: "Hora de fin (HH:MM o HH:MM:SS)",
    example: "10:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de fin debe estar en formato HH:MM o HH:MM:SS",
  })
  horaFin: string;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;
}

export class VerificarFranjaInstitucionalDto {
  @ApiProperty({
    description: "Hora de inicio (HH:MM o HH:MM:SS)",
    example: "08:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de inicio debe estar en formato HH:MM o HH:MM:SS",
  })
  horaInicio: string;

  @ApiProperty({
    description: "Hora de fin (HH:MM o HH:MM:SS)",
    example: "10:00",
  })
  @IsString()
  @Matches(TIME_REGEX, {
    message: "La hora de fin debe estar en formato HH:MM o HH:MM:SS",
  })
  horaFin: string;
}

export class VerificarDiaNoLaborableDto {
  @ApiProperty({
    description: "Fecha a evaluar (string ISO o formato YYYY-MM-DD)",
    example: "2026-05-25",
  })
  @IsString()
  fecha: string;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;
}

export class VerificarMaxHorasDocenteDto {
  @ApiProperty({ description: "ID del docente", example: 1 })
  @IsInt()
  docenteId: number;

  @ApiProperty({
    description: "Día de la semana (1-7)",
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dia: number;

  @ApiProperty({
    description: "Duración en horas de la sesión propuesta",
    example: 2,
  })
  @IsNumber()
  @Min(0.5)
  duracion: number;

  @ApiProperty({ description: "Período académico", example: "2026-I" })
  @IsString()
  periodo: string;
}
