import { ApiProperty } from "@nestjs/swagger";

export class CargaLectivaRegistroDto {
  @ApiProperty({ example: 101 })
  horarioAsignadoId: number;

  @ApiProperty({ example: 12 })
  cursoId: number;

  @ApiProperty({ example: "EE-101" })
  codigoCurso: string;

  @ApiProperty({ example: "Introducción a la Ingeniería de Sistemas" })
  nombreCurso: string;

  @ApiProperty({ example: "OBLIGATORIO" })
  tipoCurso: string;

  @ApiProperty({ example: "Ingeniería de Sistemas" })
  escuela: string;

  @ApiProperty({ example: 4 })
  grupoId: number;

  @ApiProperty({ example: "EE-101-G1" })
  seccion: string;

  @ApiProperty({ example: 1 })
  ciclo: number;

  @ApiProperty({ example: 30 })
  nroAlumnos: number;

  @ApiProperty({ example: "TEORIA" })
  tipoClase: string;

  @ApiProperty({ example: 2 })
  horasTeoria: number;

  @ApiProperty({ example: 0 })
  horasPractica: number;

  @ApiProperty({ example: 0 })
  horasLaboratorio: number;

  @ApiProperty({ example: 2 })
  horasBloque: number;

  @ApiProperty({ example: "A-301" })
  ambiente: string;

  @ApiProperty({ example: 1 })
  dia: number;

  @ApiProperty({ example: "08:00:00" })
  horaInicio: string;

  @ApiProperty({ example: "10:00:00" })
  horaFin: string;
}

export class CargaLectivaAgrupadaCursoDto {
  @ApiProperty({ example: 12 })
  cursoId: number;

  @ApiProperty({ example: "EE-101" })
  codigoCurso: string;

  @ApiProperty({ example: "Introducción a la Ingeniería de Sistemas" })
  nombreCurso: string;

  @ApiProperty({ example: 8 })
  horas: number;
}

export class CargaLectivaAgrupadaSeccionDto {
  @ApiProperty({ example: 4 })
  grupoId: number;

  @ApiProperty({ example: "EE-101-G1" })
  seccion: string;

  @ApiProperty({ example: 8 })
  horas: number;
}

export class CargaLectivaAgrupadaTipoClaseDto {
  @ApiProperty({ example: "TEORIA" })
  tipoClase: string;

  @ApiProperty({ example: 8 })
  horas: number;
}

export class CargaLectivaResumenDto {
  @ApiProperty({ example: 16 })
  totalHoras: number;

  @ApiProperty({ example: 3 })
  totalCursos: number;

  @ApiProperty({ example: 2 })
  totalSecciones: number;

  @ApiProperty({ example: 8 })
  totalBloques: number;

  @ApiProperty({ type: [CargaLectivaAgrupadaCursoDto] })
  horasPorCurso: CargaLectivaAgrupadaCursoDto[];

  @ApiProperty({ type: [CargaLectivaAgrupadaSeccionDto] })
  horasPorSeccion: CargaLectivaAgrupadaSeccionDto[];

  @ApiProperty({ type: [CargaLectivaAgrupadaTipoClaseDto] })
  horasPorTipoClase: CargaLectivaAgrupadaTipoClaseDto[];
}

export class CargaLectivaGeneradaDto {
  @ApiProperty({ example: 12 })
  docenteId: number;

  @ApiProperty({ example: 3 })
  periodoId: number;

  @ApiProperty({ example: "2026-I" })
  periodoCodigo: string;

  @ApiProperty({ type: [CargaLectivaRegistroDto] })
  registros: CargaLectivaRegistroDto[];

  @ApiProperty({ type: CargaLectivaResumenDto })
  resumen: CargaLectivaResumenDto;

  @ApiProperty({ example: "2026-05-30T12:00:00.000Z" })
  generadoEn: string;
}

export class CargaLectivaDeclaracionDto {
  @ApiProperty({ example: 55 })
  declaracionId: number;

  @ApiProperty({ type: CargaLectivaGeneradaDto })
  cargaLectiva: CargaLectivaGeneradaDto;

  @ApiProperty({
    type: CargaLectivaGeneradaDto,
    required: false,
    nullable: true,
  })
  snapshotGuardado: CargaLectivaGeneradaDto | null;
}
