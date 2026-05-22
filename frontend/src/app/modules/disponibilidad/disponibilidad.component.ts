import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { DiasActivosService } from '../../core/services/dias-activos.service';
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
export class DisponibilidadComponent implements OnInit, OnDestroy {
  todosDocentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  resumen: any[] = [];
  loadingResumen = false;
  eliminando: number | null = null;
  docentesSinDisponibilidad: Docente[] = [];

  dias: string[] = [];
  diasNum: number[] = [];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  grilla: boolean[][] = [];
  saving = false;
  loading = false;
  loadingDias = true;
  private periodSub?: Subscription;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    public diasService: DiasActivosService,
  ) {}

  ngOnInit(): void {
    this.diasService.cargar().subscribe(() => {
      this.dias = this.diasService.nombres;
      this.diasNum = this.diasService.numeros;
      this.loadingDias = false;
      this.resetGrilla();
    });
    this.resetGrilla();
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosDocentes = r?.data?.items ?? [];
        this.calcularSinDisponibilidad();
      },
    });

    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarResumen();
      if (this.docenteSeleccionado) {
        this.cargarDisponibilidad();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.periodSub) {
      this.periodSub.unsubscribe();
    }
  }

  calcularSinDisponibilidad(): void {
    const conDispIds = new Set(this.resumen.map((item) => item.docente.id));
    this.docentesSinDisponibilidad = this.todosDocentes.filter(
      (d) => !conDispIds.has(d.id),
    );
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
          this.calcularSinDisponibilidad();
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

  onFilterChange(): void {
    this.cargarDisponibilidad();
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#4f46e5',
      '#7c3aed',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // onFilterChange(): void {
  //   this.cargarDisponibilidad();
  // }

  // getAvatarColor(name: string): string {
  //   const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  //   let hash = 0;
  //   for (let i = 0; i < name.length; i++) {
  //     hash = name.charCodeAt(i) + ((hash << 5) - hash);
  //   }
  //   return colors[Math.abs(hash) % colors.length];
  // }

  resetGrilla(): void {
    const cols = this.diasNum.length || 5;
    this.grilla = Array.from({ length: 15 }, () => Array(cols).fill(false));
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
            const di = this.diasNum.indexOf(s.dia_semana);
            if (hi >= 0 && hi < 15 && di >= 0) {
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
    const cols = this.diasNum.length || 5;
    this.grilla = Array.from({ length: 15 }, () => Array(cols).fill(val));
  }

  getHorasDeclaradas(): number {
    if (!this.grilla) return 0;
    let count = 0;
    this.grilla.forEach((row) => {
      row.forEach((cell) => {
        if (cell) count++;
      });
    });
    return count;
  }

  guardar(): void {
    if (!this.docenteSeleccionado) return;

    const horasDeclaradas = this.getHorasDeclaradas();

    if (horasDeclaradas === 0) {
      this.snackBar.open(
        '⚠️ Error: Debes marcar al menos 1 hora disponible para el docente.',
        'Cerrar',
        { duration: 4000 },
      );
      return;
    }

    if (horasDeclaradas < 20) {
      const confirmacion = confirm(
        `⚠️ ADVERTENCIA:\n\nHas seleccionado solo ${horasDeclaradas} horas disponibles para este docente.\n` +
          `Una disponibilidad menor a 20 horas podría dificultar o imposibilitar la programación de sus clases.\n\n` +
          `¿Estás seguro de que deseas guardar esta disponibilidad?`,
      );
      if (!confirmacion) return;
    }

    this.saving = true;

    const slots: any[] = [];
    this.horas.forEach((hora, hi) => {
      this.dias.forEach((_dia, di) => {
        slots.push({
          dia_semana: this.diasNum[di] ?? di + 1,
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
