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
import { forkJoin } from 'rxjs';
import { PeriodoService } from '../../core/services/periodo.service';
import { Docente, DisponibilidadDocente } from '../../core/interfaces/entities';
import {
  DiaActivo,
  DisponibilidadService,
  ParametroCarga,
  TurnoHorario,
} from './disponibilidad.service';

@Component({
  selector: 'app-disponibilidad',
  templateUrl: './disponibilidad.component.html',
  styleUrls: ['./disponibilidad.component.scss'],
})
export class DisponibilidadComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly todosDocentes = signal<Docente[]>([]);
  readonly docenteSeleccionado = signal<Docente | null>(null);
  readonly turnos = signal<TurnoHorario[]>([]);
  readonly diasActivos = signal<DiaActivo[]>([]);
  readonly parametrosCarga = signal<ParametroCarga[]>([]);
  readonly grilla = signal<number[][]>([]);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly loadingCatalogos = signal(true);

  constructor(
    private readonly disponibilidadService: DisponibilidadService,
    public periodoService: PeriodoService,
    private readonly snackBar: MatSnackBar,
  ) {}

  readonly horasDisponibles = computed(() => {
    const turnos = this.turnos();
    return this.redondearHoras(
      this.grilla().reduce(
        (total, fila) =>
          total +
          fila.reduce(
            (subtotal, activa, turnoIndex) =>
              subtotal +
              (activa ? this.getDuracionTurnoHoras(turnos[turnoIndex]) : 0),
            0,
          ),
        0,
      ),
    );
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

  readonly hayTurnoManana = computed(() =>
    this.turnos().some((turno) => this.esTurnoManana(turno)),
  );

  ngOnInit(): void {
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

  resetGrilla(): void {
    this.grilla.set(
      Array.from({ length: this.diasActivos().length }, () =>
        Array(this.turnos().length).fill(0),
      ),
    );
  }

  seleccionarDocente(docente: Docente): void {
    this.docenteSeleccionado.set(docente);
    this.cargarDisponibilidad();
  }

  toggleCelda(diaIndex: number, turnoIndex: number): void {
    this.grilla.update((actual) =>
      actual.map((fila, filaIndex) =>
        filaIndex === diaIndex
          ? fila.map((valor, columnaIndex) =>
              columnaIndex === turnoIndex ? (valor === 0 ? 1 : 0) : valor,
            )
          : [...fila],
      ),
    );
  }

  marcarTurnoManana(): void {
    const indices = this.turnos()
      .map((turno, index) => (this.esTurnoManana(turno) ? index : -1))
      .filter((index) => index >= 0);

    if (indices.length === 0) {
      this.snackBar.open(
        'No existe un turno con nombre "mañana" en la configuración actual.',
        'Cerrar',
        { duration: 3000 },
      );
      return;
    }

    this.grilla.update((actual) =>
      actual.map((fila) =>
        fila.map((valor, turnoIndex) =>
          indices.includes(turnoIndex) ? Math.min(valor + 1, 3) : valor,
        ),
      ),
    );
  }

  limpiarSeleccion(): void {
    this.resetGrilla();
  }

  getRangoTurno(turno: TurnoHorario): string {
    return `${turno.hora_inicio.slice(0, 5)} - ${turno.hora_fin.slice(0, 5)}`;
  }

  guardar(): void {
    const docente = this.docenteSeleccionado();
    if (!docente) {
      return;
    }

    this.saving.set(true);

    const slots = this.diasActivos().flatMap((dia, diaIndex) =>
      this.turnos().map((turno, turnoIndex) => ({
        dia_semana: dia.dia_semana,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        disponible: (this.grilla()[diaIndex]?.[turnoIndex] ?? 0) > 0,
      })),
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

    forkJoin({
      turnos: this.disponibilidadService.obtenerTurnos(),
      diasActivos: this.disponibilidadService.obtenerDiasActivos(),
      docentes: this.disponibilidadService.obtenerDocentes(),
      parametros: this.disponibilidadService.obtenerParametrosCarga(
        this.periodoService.periodo,
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ turnos, diasActivos, docentes, parametros }) => {
          this.turnos.set(turnos);
          this.diasActivos.set(diasActivos);
          this.todosDocentes.set(docentes);
          this.parametrosCarga.set(parametros);
          this.resetGrilla();
          this.loadingCatalogos.set(false);
        },
        error: () => {
          this.snackBar.open(
            'Error al cargar turnos, días activos o docentes.',
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

    if (this.diasActivos().length === 0 || this.turnos().length === 0) {
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

    const siguienteMatriz = this.diasActivos().map((dia) =>
      this.turnos().map((turno) => {
        const bloquesTurno = this.obtenerBloquesTurno(turno);
        return (
          bloquesTurno.length > 0 &&
          bloquesTurno.every((minuto) =>
            bloquesDisponibles.has(`${dia.dia_semana}-${minuto}`),
          )
        ) ? 1 : 0;
      }),
    );

    this.grilla.set(siguienteMatriz);
  }

  private obtenerBloquesTurno(turno: TurnoHorario): number[] {
    const inicio = this.horaAMinutos(turno.hora_inicio);
    const fin = this.horaAMinutos(turno.hora_fin);
    const bloques: number[] = [];

    for (let minuto = inicio; minuto < fin; minuto += 60) {
      bloques.push(minuto);
    }

    return bloques;
  }

  private getDuracionTurnoHoras(turno?: TurnoHorario): number {
    if (!turno) {
      return 0;
    }

    return this.redondearHoras(
      (this.horaAMinutos(turno.hora_fin) -
        this.horaAMinutos(turno.hora_inicio)) /
        60,
    );
  }

  private horaAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return (horas || 0) * 60 + (minutos || 0);
  }

  private redondearHoras(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private esTurnoManana(turno: TurnoHorario): boolean {
    return this.normalizarTexto(turno.nombre).includes('manana');
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
