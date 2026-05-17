import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import {
  ApiResponse,
  Docente,
  DisponibilidadDocente,
} from '../../core/interfaces/entities';

@Component({
  selector: 'app-disponibilidad',
  templateUrl: './disponibilidad.component.html',
  styleUrls: ['./disponibilidad.component.scss'],
})
export class DisponibilidadComponent implements OnInit {
  todosDocentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  resumen: any[] = [];
  loadingResumen = false;
  eliminando: number | null = null;

  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  grilla: boolean[][] = [];
  saving = false;
  loading = false;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.resetGrilla();
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosDocentes = r?.data?.items ?? [];
      },
    });
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loadingResumen = true;
    this.api
      .get<any>('/disponibilidad/resumen', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r: any) => {
          this.resumen = r?.data ?? [];
          this.loadingResumen = false;
        },
        error: () => {
          this.loadingResumen = false;
        },
      });
  }

  editarDesdeResumen(item: any): void {
    const docente =
      this.todosDocentes.find((d) => d.id === item.docente.id) ??
      (item.docente as Docente);
    this.docenteSeleccionado = docente;
    this.cargarDisponibilidad();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarDisponibilidad(item: any): void {
    if (
      !confirm(
        `¿Eliminar disponibilidad de ${item.docente.apellidos}, ${item.docente.nombres}?`,
      )
    )
      return;
    this.eliminando = item.docente.id;
    this.api
      .delete<any>(
        `/disponibilidad/docente/${item.docente.id}?periodo=${this.periodoService.periodo}`,
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Disponibilidad eliminada', 'OK', {
            duration: 2000,
          });
          this.eliminando = null;
          this.cargarResumen();
        },
        error: () => {
          this.eliminando = null;
        },
      });
  }

  resetGrilla(): void {
    this.grilla = Array.from({ length: 15 }, () => Array(5).fill(false));
  }

  formatHora(h: number): string {
    return `${h.toString().padStart(2, '0')}:00`;
  }

  seleccionarDocente(d: Docente): void {
    this.docenteSeleccionado = d;
    this.cargarDisponibilidad();
  }

  cargarDisponibilidad(): void {
    if (!this.docenteSeleccionado) return;
    this.loading = true;
    this.resetGrilla();

    this.api
      .get<any>(`/disponibilidad/docente/${this.docenteSeleccionado.id}`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (res: any) => {
          const slots: DisponibilidadDocente[] = res?.data?.slots ?? [];
          slots.forEach((s) => {
            const hi = parseInt(s.hora_inicio.split(':')[0], 10) - 7;
            const di = s.dia_semana - 1;
            if (hi >= 0 && hi < 15 && di >= 0 && di < 5) {
              this.grilla[hi][di] = s.disponible;
            }
          });
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  toggleCelda(hi: number, di: number): void {
    this.grilla[hi][di] = !this.grilla[hi][di];
  }

  marcarTodo(val: boolean): void {
    this.grilla = Array.from({ length: 15 }, () => Array(5).fill(val));
  }

  guardar(): void {
    if (!this.docenteSeleccionado) return;
    this.saving = true;

    const slots: any[] = [];
    this.horas.forEach((hora, hi) => {
      this.dias.forEach((_dia, di) => {
        slots.push({
          dia_semana: di + 1,
          hora_inicio: `${hora.toString().padStart(2, '0')}:00`,
          hora_fin: `${(hora + 1).toString().padStart(2, '0')}:00`,
          disponible: this.grilla[hi][di],
        });
      });
    });

    this.api
      .post<ApiResponse<any>>(
        `/disponibilidad/docente/${this.docenteSeleccionado!.id}`,
        {
          slots,
          periodo: this.periodoService.periodo,
        },
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Disponibilidad guardada correctamente', 'OK', {
            duration: 3000,
          });
          this.saving = false;
          this.docenteSeleccionado = null;
          this.resetGrilla();
          this.cargarResumen();
        },
        error: () => {
          this.saving = false;
        },
      });
  }
}
