import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import {
  Docente,
  HorarioAsignado,
  ApiResponse,
} from '../../../../core/interfaces/entities';

@Component({
  selector: 'app-ver-horario-docente-dialog',
  templateUrl: './ver-horario-docente-dialog.component.html',
  styleUrls: ['./ver-horario-docente-dialog.component.scss'],
})
export class VerHorarioDocenteDialogComponent implements OnInit {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  diasNum = [1, 2, 3, 4, 5];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  asignaciones: HorarioAsignado[] = [];
  loading = false;
  descargando = false;

  constructor(
    private dialogRef: MatDialogRef<VerHorarioDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public docente: Docente,
    private api: ApiService,
    public periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.cargarHorario();
  }

  cargarHorario(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<any>>(`/horarios/docente/${this.docente.id}`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          this.asignaciones = r.data?.items ?? r.data ?? [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private normalizeHora(hora: string | undefined): string {
    if (!hora) return '';
    return hora.length >= 5 ? hora.substring(0, 5) : hora;
  }

  getAsig(dia: number, hora: number): HorarioAsignado | null {
    const h = this.fmtH(hora);
    return (
      this.asignaciones.find(
        (a) => a.dia_semana === dia && this.normalizeHora(a.hora_inicio) === h,
      ) ?? null
    );
  }

  cls(dia: number, hora: number): string {
    const a = this.getAsig(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  get horasAsignadas(): number {
    return this.asignaciones.length;
  }

  descargarPdf(): void {
    this.descargando = true;
    this.api
      .getBlob(`/reportes/docente/${this.docente.id}/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargando = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.docente.apellidos}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargando = false;
        },
      });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
