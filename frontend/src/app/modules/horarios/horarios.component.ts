import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import {
  ApiResponse,
  Docente,
  Ambiente,
  HorarioAsignado,
  ConflictoAsignacion,
} from '../../core/interfaces/entities';

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss'],
})
export class HorariosComponent implements OnInit {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  diasNum = [1, 2, 3, 4, 5];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  // Tab 1 — Vista Docente
  todosDocentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  asignacionesDocente: HorarioAsignado[] = [];
  loadingDocente = false;
  descargandoDoc = false;

  // Tab 2 — Vista Ambiente
  todosAmbientes: Ambiente[] = [];
  ambienteSeleccionado: Ambiente | null = null;
  asignacionesAmbiente: HorarioAsignado[] = [];
  loadingAmbiente = false;

  // Tab 3 — Conflictos
  conflictos: ConflictoAsignacion[] = [];
  loadingConflictos = false;
  colsConflictos = [
    'tipo_conflicto',
    'descripcion',
    'periodo_academico',
    'resuelto',
    'acciones',
  ];

  // Tab 4 — Gestión
  generando = false;
  limpiando = false;
  resultadoGeneracion: any = null;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
  ) {}

  ngOnInit(): void {
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosDocentes = r?.data?.items ?? [];
      },
    });

    this.api.get<any>('/ambientes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosAmbientes = r?.data?.items ?? r?.data ?? [];
      },
    });

    this.loadConflictos();
  }

  selectDocente(d: Docente): void {
    this.docenteSeleccionado = d;
    this.loadingDocente = true;
    this.api
      .get<
        ApiResponse<HorarioAsignado[]>
      >(`/horarios/docente/${d.id}`, { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.asignacionesDocente = r.data ?? [];
          this.loadingDocente = false;
        },
        error: () => {
          this.loadingDocente = false;
        },
      });
  }

  selectAmbiente(a: Ambiente): void {
    this.ambienteSeleccionado = a;
    this.loadingAmbiente = true;
    this.api
      .get<
        ApiResponse<HorarioAsignado[]>
      >(`/horarios/ambiente/${a.id}`, { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.asignacionesAmbiente = r.data ?? [];
          this.loadingAmbiente = false;
        },
        error: () => {
          this.loadingAmbiente = false;
        },
      });
  }

  getAsigDoc(dia: number, hora: number): HorarioAsignado | null {
    const h = this.fmtH(hora);
    return (
      this.asignacionesDocente.find(
        (a) => a.dia_semana === dia && a.hora_inicio === h,
      ) ?? null
    );
  }

  getAsigAmb(dia: number, hora: number): HorarioAsignado | null {
    const h = this.fmtH(hora);
    return (
      this.asignacionesAmbiente.find(
        (a) => a.dia_semana === dia && a.hora_inicio === h,
      ) ?? null
    );
  }

  clsDoc(dia: number, hora: number): string {
    const a = this.getAsigDoc(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  clsAmb(dia: number, hora: number): string {
    const a = this.getAsigAmb(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  get horasAsignadas(): number {
    return this.asignacionesDocente.length;
  }

  descargarPdfDocente(): void {
    if (!this.docenteSeleccionado) return;
    this.descargandoDoc = true;
    this.api
      .getBlob(`/reportes/docente/${this.docenteSeleccionado.id}/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoDoc = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.docenteSeleccionado!.apellidos}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoDoc = false;
          this.notif.error('Error al descargar PDF');
        },
      });
  }

  loadConflictos(): void {
    this.loadingConflictos = true;
    this.api
      .get<
        ApiResponse<ConflictoAsignacion[]>
      >(`/horarios/conflictos/${this.periodoService.periodo}`)
      .subscribe({
        next: (r) => {
          this.conflictos = r.data ?? [];
          this.loadingConflictos = false;
        },
        error: () => {
          this.loadingConflictos = false;
        },
      });
  }

  resolverConflicto(c: ConflictoAsignacion): void {
    this.api
      .patch<ApiResponse<any>>(`/horarios/conflictos/${c.id}/resolver`, {})
      .subscribe({
        next: () => {
          this.notif.success('Conflicto resuelto');
          this.loadConflictos();
        },
        error: () => this.notif.error('Error al resolver conflicto'),
      });
  }

  generarHorario(): void {
    if (
      !confirm(
        `¿Generar horario automático para el período ${this.periodoService.periodo}? Puede tardar varios minutos.`,
      )
    )
      return;
    this.generando = true;
    this.resultadoGeneracion = null;
    this.api
      .post<
        ApiResponse<any>
      >('/horarios/generar', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.generando = false;
          this.resultadoGeneracion = r.data;
          this.notif.success('Horario generado');
        },
        error: () => {
          this.generando = false;
          this.notif.error('Error al generar horario');
        },
      });
  }

  limpiarHorario(): void {
    const p = this.periodoService.periodo;
    if (
      !confirm(
        `¿Limpiar TODOS los horarios del período ${p}? Esta acción es IRREVERSIBLE.`,
      )
    )
      return;
    if (!confirm(`Confirmación final: eliminar todos los horarios de ${p}`))
      return;
    this.limpiando = true;
    this.api
      .delete<ApiResponse<any>>(`/horarios/limpiar?periodo=${p}`)
      .subscribe({
        next: () => {
          this.limpiando = false;
          this.notif.success('Horarios eliminados');
        },
        error: () => {
          this.limpiando = false;
          this.notif.error('Error al limpiar horarios');
        },
      });
  }
}
