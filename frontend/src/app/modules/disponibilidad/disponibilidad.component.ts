import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, map } from 'rxjs';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, DisponibilidadDocente, ApiResponse } from '../../core/interfaces/entities';
import {
  DiaActivo,
  DisponibilidadService,
  ParametroCarga,
  TurnoHorario,
} from './disponibilidad.service';

import { ROLES } from '../../core/constants/roles';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-disponibilidad',
  templateUrl: './disponibilidad.component.html',
  styleUrls: ['./disponibilidad.component.scss'],
})
export class DisponibilidadComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  public readonly authService = inject(AuthService);

  readonly todosDocentes = signal<Docente[]>([]);
  readonly docenteSeleccionado = signal<Docente | null>(null);
  readonly turnos = signal<TurnoHorario[]>([]);
  readonly diasActivos = signal<DiaActivo[]>([]);
  readonly parametrosCarga = signal<ParametroCarga[]>([]);
  readonly grilla = signal<number[][]>([]);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly loadingCatalogos = signal(true);
  readonly horasIndividuales = signal<string[]>([]);

  constructor(
    private readonly disponibilidadService: DisponibilidadService,
    public periodoService: PeriodoService,
    private readonly snackBar: MatSnackBar,
  ) {}

  readonly horasDisponibles = computed(() => {
    const grilla = this.grilla();
    const horas = this.horasIndividuales();
    const dias = this.diasActivos();
    let total = 0;

    for (let horaIndex = 0; horaIndex < grilla.length; horaIndex++) {
      for (let diaIndex = 0; diaIndex < grilla[horaIndex].length; diaIndex++) {
        if (grilla[horaIndex][diaIndex] > 0) {
          total += 1; // Cada celda representa 1 hora
        }
      }
    }

    return total;
  });

  readonly minimoNormativo = computed(() => {
    const docente = this.docenteSeleccionado();
    if (!docente?.modalidad) {
      return 0;
    }

    const parametros = this.parametrosCarga();
    const coincidenciaExacta = parametros.find(
      (parametro) =>
        parametro.modalidad === docente.modalidad &&
        parametro.tipo_docente === docente.tipo_docente &&
        parametro.categoria === docente.categoria,
    );
    const coincidenciaModalidad = parametros.find(
      (parametro) => parametro.modalidad === docente.modalidad,
    );

    return (
      coincidenciaExacta?.horas_min_semanal ??
      coincidenciaModalidad?.horas_min_semanal ??
      0
    );
  });

  readonly maximoNormativo = computed(() => {
    const docente = this.docenteSeleccionado();
    if (!docente?.modalidad) {
      return 0;
    }

    const parametros = this.parametrosCarga();
    const coincidenciaExacta = parametros.find(
      (parametro) =>
        parametro.modalidad === docente.modalidad &&
        parametro.tipo_docente === docente.tipo_docente &&
        parametro.categoria === docente.categoria,
    );
    const coincidenciaModalidad = parametros.find(
      (parametro) => parametro.modalidad === docente.modalidad,
    );

    return (
      coincidenciaExacta?.horas_max_semanal ??
      coincidenciaModalidad?.horas_max_semanal ??
      0
    );
  });

  readonly limiteAlcanzado = computed(() => {
    const maximo = this.maximoNormativo();
    return maximo > 0 && this.horasDisponibles() >= maximo;
  });

  ngOnInit(): void {
    this.generarHorasIndividuales();
    this.cargarDatosIniciales();

    this.periodoService.periodo$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cargarParametrosCarga();
        if (this.docenteSeleccionado()) {
        this.cargarDisponibilidad();
        }
      });
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

  private generarHorasIndividuales(): void {
    const horas: string[] = [];
    for (let hora = 7; hora <= 22; hora++) {
      horas.push(`${hora.toString().padStart(2, '0')}:00`);
    }
    this.horasIndividuales.set(horas);
  }

  resetGrilla(): void {
    this.grilla.set(
      Array.from({ length: this.horasIndividuales().length }, () =>
        Array(this.diasActivos().length).fill(0),
      ),
    );
  }

  seleccionarDocente(docente: Docente): void {
    this.docenteSeleccionado.set(docente);
    this.cargarDisponibilidad();
  }

  toggleCelda(horaIndex: number, diaIndex: number): void {
    const estaActiva = (this.grilla()[horaIndex]?.[diaIndex] ?? 0) > 0;

    if (!estaActiva && this.limiteAlcanzado()) {
      const maximo = this.maximoNormativo();
      this.snackBar.open(
        `Límite alcanzado: no puedes superar las ${maximo} horas máximas semanales para este docente.`,
        'Cerrar',
        { duration: 4000 },
      );
      return;
    }

    this.grilla.update((actual) =>
      actual.map((fila, filaIndex) =>
        filaIndex === horaIndex
          ? fila.map((valor, columnaIndex) =>
              columnaIndex === diaIndex ? (valor === 0 ? 1 : 0) : valor,
            )
          : [...fila],
      ),
    );
  }

  marcarRangoHoras(horaInicio: number, horaFin: number): void {
    const horas = this.horasIndividuales();
    const startIndex = horas.findIndex(h => parseInt(h.split(':')[0]) === horaInicio);
    const endIndex = horas.findIndex(h => parseInt(h.split(':')[0]) === horaFin);

    if (startIndex === -1 || endIndex === -1) {
      return;
    }

    this.grilla.update((actual) =>
      actual.map((fila, horaIndex) =>
        horaIndex >= startIndex && horaIndex < endIndex
          ? fila.map(() => 1)
          : [...fila],
      ),
    );
  }

  desmarcarRangoHoras(horaInicio: number, horaFin: number): void {
    const horas = this.horasIndividuales();
    const startIndex = horas.findIndex(h => parseInt(h.split(':')[0]) === horaInicio);
    const endIndex = horas.findIndex(h => parseInt(h.split(':')[0]) === horaFin);

    if (startIndex === -1 || endIndex === -1) {
      return;
    }

    this.grilla.update((actual) =>
      actual.map((fila, horaIndex) =>
        horaIndex >= startIndex && horaIndex < endIndex
          ? fila.map(() => 0)
          : [...fila],
      ),
    );
  }

  marcarTurnoManana(): void {
    this.marcarRangoHoras(7, 13);
  }

  limpiarTurnoManana(): void {
    this.desmarcarRangoHoras(7, 13);
  }

  marcarTurnoTarde(): void {
    this.marcarRangoHoras(13, 18);
  }

  limpiarTurnoTarde(): void {
    this.desmarcarRangoHoras(13, 18);
  }

  marcarTurnoNoche(): void {
    this.marcarRangoHoras(18, 22);
  }

  limpiarTurnoNoche(): void {
    this.desmarcarRangoHoras(18, 22);
  }

  limpiarSeleccion(): void {
    this.resetGrilla();
  }

  getHoraFin(horaInicio: string): string {
    const [hora] = horaInicio.split(':').map(Number);
    const horaFin = hora + 1;
    return `${horaFin.toString().padStart(2, '0')}:00`;
  }

  guardar(): void {
    const docente = this.docenteSeleccionado();
    if (!docente) {
      return;
    }

    this.saving.set(true);

    const slots = this.horasIndividuales().flatMap((hora, horaIndex) =>
      this.diasActivos().map((dia, diaIndex) => {
        const disponible = (this.grilla()[horaIndex]?.[diaIndex] ?? 0) > 0;
        const [horaNum] = hora.split(':').map(Number);
        const horaFin = `${(horaNum + 1).toString().padStart(2, '0')}:00`;
        return {
          dia_semana: dia.dia_semana,
          hora_inicio: hora,
          hora_fin: horaFin,
          disponible,
        };
      }),
    );

    this.disponibilidadService
      .guardarDisponibilidadDocente(docente.id, {
        slots,
        periodo: this.periodoService.periodo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Disponibilidad guardada correctamente', 'OK', {
            duration: 3000,
          });
          this.saving.set(false);
        },
        error: (error) => {
          const mensaje =
            error?.error?.message ?? 'Error al guardar la disponibilidad';
          this.snackBar.open(mensaje, 'Cerrar', {
            duration: 4000,
          });
          this.saving.set(false);
        },
      });
  }

  private cargarDatosIniciales(): void {
    this.loadingCatalogos.set(true);

    const calls: any = {
      turnos: this.disponibilidadService.obtenerTurnos(),
      diasActivos: this.disponibilidadService.obtenerDiasActivos(),
      parametros: this.disponibilidadService.obtenerParametrosCarga(
        this.periodoService.periodo,
      ),
    };

    const isDocente = this.authService.hasRole(ROLES.DOCENTE);
    if (!isDocente) {
      calls.docentes = this.disponibilidadService.obtenerDocentes();
    } else {
      const user = this.authService.getUsuarioActual();
      if (user?.docenteId) {
        calls.docenteActual = this.disponibilidadService.obtenerDocenteById(
          user.docenteId,
        );
      }
    }

    forkJoin(calls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.turnos.set(res.turnos);
          this.diasActivos.set(res.diasActivos);
          this.parametrosCarga.set(res.parametros);

          if (!isDocente) {
            this.todosDocentes.set(res.docentes);
          } else if (res.docenteActual) {
            this.docenteSeleccionado.set(res.docenteActual);
            this.cargarDisponibilidad();
          }

          this.resetGrilla();
          this.loadingCatalogos.set(false);
        },
        error: () => {
          this.snackBar.open(
            'Error al cargar la configuración inicial.',
            'Cerrar',
            { duration: 4000 },
          );
          this.loadingCatalogos.set(false);
        },
      });
  }

  private cargarParametrosCarga(): void {
    this.disponibilidadService
      .obtenerParametrosCarga(this.periodoService.periodo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (parametros) => {
          this.parametrosCarga.set(parametros);
        },
      });
  }

  private cargarDisponibilidad(): void {
    const docente = this.docenteSeleccionado();
    if (!docente) {
      return;
    }

    if (this.diasActivos().length === 0 || this.horasIndividuales().length === 0) {
      this.resetGrilla();
      return;
    }

    this.loading.set(true);
    this.resetGrilla();

    this.disponibilidadService
      .obtenerDisponibilidadDocente(docente.id, this.periodoService.periodo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.aplicarDisponibilidad(response.slots);
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Error al cargar la disponibilidad.', 'Cerrar', {
            duration: 3000,
          });
          this.loading.set(false);
        },
      });
  }

  private aplicarDisponibilidad(slots: DisponibilidadDocente[]): void {
    const bloquesDisponibles = new Set<string>();

    slots
      .filter((slot) => slot.disponible)
      .forEach((slot) => {
        const inicio = this.horaAMinutos(slot.hora_inicio);
        const fin = this.horaAMinutos(slot.hora_fin);
        for (let minuto = inicio; minuto < fin; minuto += 60) {
          bloquesDisponibles.add(`${slot.dia_semana}-${minuto}`);
        }
      });

    const siguienteMatriz = this.horasIndividuales().map((hora) =>
      this.diasActivos().map((dia) => {
        const [horaNum] = hora.split(':').map(Number);
        const minutos = horaNum * 60;
        return bloquesDisponibles.has(`${dia.dia_semana}-${minutos}`) ? 1 : 0;
      }),
    );

    this.grilla.set(siguienteMatriz);
  }

  private horaAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private redondearHoras(valor: number): number {
    return Number(valor.toFixed(2));
  }
}
