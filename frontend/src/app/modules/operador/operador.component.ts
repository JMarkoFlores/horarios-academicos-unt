import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { SocketService } from '../../core/services/socket.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import {
  ApiResponse,
  Docente,
  HorarioAsignado,
  Ambiente,
} from '../../core/interfaces/entities';
import { CeldaDialogComponent } from './celda-dialog/celda-dialog.component';

@Component({
  selector: 'app-operador',
  templateUrl: './operador.component.html',
  styleUrls: ['./operador.component.scss'],
})
export class OperadorComponent implements OnInit, OnDestroy {
  horas = Array.from({ length: 15 }, (_, i) => i + 7);
  diasNum = [1, 2, 3, 4, 5];
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  ventanaActiva: any = null;
  cola: any[] = [];
  docenteActual: Docente | null = null;
  loadingVentana = false;
  llamandoSiguiente = false;
  confirmando = false;
  cancelando = false;

  disponibilidadMap = new Map<string, boolean>();
  asignacionesMap = new Map<string, HorarioAsignado>();
  seleccionesMap = new Map<string, { docenteId: number }>();

  ambientesDisp: Ambiente[] = [];

  ventanaForm!: FormGroup;
  creandoVentana = false;

  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    public periodoService: PeriodoService,
    private socket: SocketService,
    private notif: NotifToastService,
  ) {}

  ngOnInit(): void {
    this.ventanaForm = this.fb.group({
      periodo: [this.periodoService.periodo, Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      hora_inicio: ['08:00', Validators.required],
      hora_fin: ['12:00', Validators.required],
    });

    this.loadVentanaActiva();
    this.loadAmbientes();
    this.socket.connect();

    this.subs.push(
      this.socket.cola$.subscribe((cola) => {
        this.cola = cola;
        this.syncDocenteActual();
      }),
      this.socket.celdaSeleccionada$.subscribe((d) =>
        this.seleccionesMap.set(`${d.dia_semana}-${d.hora_inicio}`, {
          docenteId: d.docenteId,
        }),
      ),
      this.socket.celdaLiberada$.subscribe((d) =>
        this.seleccionesMap.delete(`${d.dia_semana}-${d.hora_inicio}`),
      ),
      this.socket.horarioConfirmado$.subscribe(() => {
        this.notif.success('Horario confirmado');
        this.reloadEstado();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.socket.disconnect();
  }

  loadVentanaActiva(): void {
    this.loadingVentana = true;
    this.api.get<ApiResponse<any>>('/ventanas/activa').subscribe({
      next: (r) => {
        this.ventanaActiva = r.data;
        if (this.ventanaActiva) {
          this.socket.joinVentana(this.ventanaActiva.id);
          this.loadCola();
        }
        this.loadingVentana = false;
      },
      error: () => {
        this.loadingVentana = false;
      },
    });
  }

  loadCola(): void {
    if (!this.ventanaActiva) return;
    this.api
      .get<ApiResponse<any[]>>(`/ventanas/${this.ventanaActiva.id}/cola`)
      .subscribe({
        next: (r) => {
          this.cola = r.data ?? [];
          this.syncDocenteActual();
        },
      });
  }

  syncDocenteActual(): void {
    const enAtencion = this.cola.find((c: any) => c.estado === 'EN_ATENCION');
    if (enAtencion && enAtencion.docente?.id !== this.docenteActual?.id) {
      this.docenteActual = enAtencion.docente;
      this.loadGridData();
    } else if (!enAtencion) {
      this.docenteActual = null;
    }
  }

  loadGridData(): void {
    if (!this.docenteActual) return;
    const id = this.docenteActual.id;
    const periodo = this.periodoService.periodo;

    this.api
      .get<ApiResponse<any[]>>(`/disponibilidad/docente/${id}`, { periodo })
      .subscribe({
        next: (r) => {
          this.disponibilidadMap.clear();
          (r.data ?? []).forEach((d: any) =>
            this.disponibilidadMap.set(
              `${d.dia_semana}-${d.hora_inicio}`,
              d.disponible,
            ),
          );
        },
      });

    this.api
      .get<
        ApiResponse<HorarioAsignado[]>
      >(`/horarios/docente/${id}`, { periodo })
      .subscribe({
        next: (r) => {
          this.asignacionesMap.clear();
          (r.data ?? []).forEach((a: HorarioAsignado) =>
            this.asignacionesMap.set(`${a.dia_semana}-${a.hora_inicio}`, a),
          );
        },
      });

    if (this.ventanaActiva) {
      this.api
        .get<
          ApiResponse<any[]>
        >(`/ventanas/${this.ventanaActiva.id}/selecciones`)
        .subscribe({
          next: (r) => {
            this.seleccionesMap.clear();
            (r.data ?? []).forEach((s: any) =>
              this.seleccionesMap.set(`${s.dia_semana}-${s.hora_inicio}`, {
                docenteId: s.docenteId,
              }),
            );
          },
        });
    }
  }

  loadAmbientes(): void {
    this.api.get<any>('/ambientes', { limit: 100, activo: 'true' }).subscribe({
      next: (r: any) => {
        this.ambientesDisp = r?.data?.items ?? r?.data ?? [];
      },
    });
  }

  getCeldaEstado(dia: number, hora: number): string {
    const horaStr = this.fmtH(hora);
    const key = `${dia}-${horaStr}`;
    if (this.asignacionesMap.has(key)) return 'ocupado';
    const sel = this.seleccionesMap.get(key);
    if (sel)
      return sel.docenteId === this.docenteActual?.id
        ? 'seleccion-propia'
        : 'seleccion-otro';
    if (this.docenteActual && this.disponibilidadMap.get(key) === false)
      return 'no-disponible';
    if (!this.docenteActual) return 'sin-docente';
    return 'libre';
  }

  clickCelda(dia: number, hora: number): void {
    if (!this.ventanaActiva || !this.docenteActual) return;
    const estado = this.getCeldaEstado(dia, hora);
    const horaStr = this.fmtH(hora);
    const horaFinStr = this.fmtH(hora + 1);
    const key = `${dia}-${horaStr}`;

    if (estado === 'seleccion-propia') {
      this.api
        .delete<any>(
          `/ventanas/${this.ventanaActiva.id}/celda?dia_semana=${dia}&hora_inicio=${horaStr}`,
        )
        .subscribe({
          next: () => {
            this.seleccionesMap.delete(key);
          },
          error: () => this.notif.error('Error al liberar celda'),
        });
      return;
    }

    if (estado !== 'libre') return;

    this.api.get<any>('/cursos', { limit: 100 }).subscribe({
      next: (r: any) => {
        const cursos = r?.data?.items ?? r?.data ?? [];
        const ref = this.dialog.open(CeldaDialogComponent, {
          width: '420px',
          data: {
            dia,
            hora: horaStr,
            docente: this.docenteActual,
            cursos,
            ambientes: this.ambientesDisp,
          },
        });
        ref.afterClosed().subscribe((result: any) => {
          if (!result) return;
          this.api
            .post<any>(`/ventanas/${this.ventanaActiva!.id}/celda`, {
              dia_semana: dia,
              hora_inicio: horaStr,
              hora_fin: horaFinStr,
              cursoId: result.cursoId,
              ambienteId: result.ambienteId,
              docenteId: this.docenteActual!.id,
            })
            .subscribe({
              next: () => {
                this.seleccionesMap.set(key, {
                  docenteId: this.docenteActual!.id,
                });
                this.notif.success('Celda asignada');
              },
              error: () => this.notif.error('Error al asignar celda'),
            });
        });
      },
    });
  }

  get seleccionesPropias(): { dia: number; hora: string }[] {
    const r: { dia: number; hora: string }[] = [];
    this.seleccionesMap.forEach((v, k) => {
      if (v.docenteId === this.docenteActual?.id) {
        const [dia, hora] = k.split('-');
        r.push({ dia: +dia, hora });
      }
    });
    return r;
  }

  get docentesEnEspera(): number {
    return this.cola.filter((c: any) => c.estado === 'ESPERANDO').length;
  }

  crearVentana(): void {
    if (this.ventanaForm.invalid) return;
    this.creandoVentana = true;
    this.api
      .post<ApiResponse<any>>('/ventanas', this.ventanaForm.value)
      .subscribe({
        next: (r) => {
          this.ventanaActiva = r.data;
          this.socket.joinVentana(r.data.id);
          this.creandoVentana = false;
          this.notif.success('Ventana creada');
        },
        error: () => {
          this.creandoVentana = false;
          this.notif.error('Error al crear ventana');
        },
      });
  }

  iniciarVentana(): void {
    if (!this.ventanaActiva) return;
    this.api
      .post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva.id}/iniciar`, {})
      .subscribe({
        next: (r) => {
          this.ventanaActiva = r.data;
          this.loadCola();
          this.notif.success('Ventana iniciada');
        },
        error: () => this.notif.error('Error al iniciar ventana'),
      });
  }

  llamarSiguiente(): void {
    if (!this.ventanaActiva) return;
    this.llamandoSiguiente = true;
    this.api
      .post<
        ApiResponse<any>
      >(`/ventanas/${this.ventanaActiva.id}/siguiente`, {})
      .subscribe({
        next: () => {
          this.llamandoSiguiente = false;
          this.loadCola();
          this.notif.info('Siguiente docente llamado');
        },
        error: () => {
          this.llamandoSiguiente = false;
          this.notif.error('Error al llamar siguiente');
        },
      });
  }

  confirmarTurno(): void {
    if (!this.ventanaActiva) return;
    this.confirmando = true;
    this.api
      .post<
        ApiResponse<any>
      >(`/ventanas/${this.ventanaActiva.id}/confirmar`, {})
      .subscribe({
        next: () => {
          this.confirmando = false;
          this.seleccionesMap.clear();
          this.loadCola();
          this.notif.success('Turno confirmado');
        },
        error: () => {
          this.confirmando = false;
          this.notif.error('Error al confirmar turno');
        },
      });
  }

  cancelarSelecciones(): void {
    if (!this.ventanaActiva) return;
    this.cancelando = true;
    this.api
      .post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva.id}/cancelar`, {})
      .subscribe({
        next: () => {
          this.cancelando = false;
          this.seleccionesMap.clear();
          this.notif.info('Selecciones canceladas');
        },
        error: () => {
          this.cancelando = false;
          this.notif.error('Error al cancelar');
        },
      });
  }

  reloadEstado(): void {
    this.loadCola();
    if (this.docenteActual) this.loadGridData();
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      ESPERANDO: 'estado-esperando',
      EN_ATENCION: 'estado-atencion',
      COMPLETADO: 'estado-completado',
      AUSENTE: 'estado-ausente',
    };
    return map[estado] ?? '';
  }
}
