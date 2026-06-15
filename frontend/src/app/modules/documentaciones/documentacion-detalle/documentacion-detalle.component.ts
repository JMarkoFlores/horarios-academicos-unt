import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  ApiResponse,
  DeclaracionVista,
  CargaLectivaRegistro,
  DeclaracionObservacion,
} from '../../../core/interfaces/entities';

interface CursoLectivoFallback {
  id: number;
  codigo: string;
  nombre: string;
  seccion: string;
  escuela: string;
  ciclo: number;
  nroAlumnos: number;
  hrsTeo: number;
  hrsPra: number;
  hrsLab: number;
  totalHrs: number;
}

interface ActividadNoLectiva {
  id: number;
  codigo: string;
  descripcion: string;
  detalle?: string;
  horas: number;
}

@Component({
  selector: 'app-documentacion-detalle',
  templateUrl: './documentacion-detalle.component.html',
  styleUrls: ['./documentacion-detalle.component.scss'],
})
export class DocumentacionDetalleComponent implements OnInit {
  declaracionId = 0;
  data: DeclaracionVista | null = null;
  loading = true;
  saving = false;
  cursosFallback: CursoLectivoFallback[] = [];
  observaciones: DeclaracionObservacion[] = [];
  textoObservacion = '';
  displayedColumns = [
    'curso',
    'ciclo',
    'alumnos',
    'hrsTeo',
    'hrsPra',
    'hrsLab',
    'horas',
  ];
  displayedColumnsNoLectivas = ['codigo', 'actividad', 'detalle', 'horario', 'horas'];
  displayedColumnsObs = ['fecha', 'usuario', 'observacion', 'estado', 'subsanado'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.declaracionId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<DeclaracionVista>>(`/declaraciones/${this.declaracionId}`)
      .subscribe({
        next: (res) => {
          this.data = res.data;
          const docenteId = res.data.docente.id;
          const periodo = res.data.periodo.codigo;

          forkJoin({
            cursos: this.api.get<ApiResponse<CursoLectivoFallback[]>>(
              `/declaraciones/docentes/${docenteId}/cursos`,
              { periodo },
            ),
            observaciones: this.api.get<ApiResponse<DeclaracionObservacion[]>>(
              `/declaraciones/${this.declaracionId}/observaciones`,
            ),
          }).subscribe({
            next: ({ cursos, observaciones }) => {
              this.cursosFallback = cursos.data || [];
              this.observaciones = observaciones.data || [];
              this.loading = false;
            },
            error: () => {
              this.cursosFallback = [];
              this.observaciones = [];
              this.loading = false;
            },
          });
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('No se pudo cargar la documentacion', 'Cerrar', {
            duration: 3000,
          });
          this.router.navigate(['/app/documentaciones']);
        },
      });
  }

  validarAprobacion(): void {
    if (!this.data?.declaracion) return;
    this.saving = true;
    this.api
      .patch<ApiResponse<DeclaracionVista>>(
        `/declaraciones/${this.data.declaracion.id}/validar`,
        { observaciones: 'Validado por director de escuela' },
      )
      .subscribe({
        next: (res) => {
          this.data = res.data;
          this.saving = false;
          this.snackBar.open(
            'La declaracion cambio a VALIDADO_DPTO',
            'Cerrar',
            { duration: 3000 },
          );
          this.router.navigate(['/app/documentaciones']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(
            err?.error?.message || 'No se pudo verificar la aprobacion',
            'Cerrar',
            { duration: 3000 },
          );
        },
      });
  }

  observarDocumento(): void {
    if (!this.data?.declaracion) return;
    if (!this.textoObservacion || this.textoObservacion.trim().length < 10) {
      this.snackBar.open('La observación debe tener al menos 10 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.api
      .patch<ApiResponse<DeclaracionVista>>(
        `/declaraciones/${this.data.declaracion.id}/observar`,
        { observaciones: this.textoObservacion },
      )
      .subscribe({
        next: (res) => {
          this.data = res.data;
          this.saving = false;
          this.snackBar.open(
            'La declaracion cambio a OBSERVADO_DPTO',
            'Cerrar',
            { duration: 3000 },
          );
          this.cargar();
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(
            err?.error?.message || 'No se pudo observar el documento',
            'Cerrar',
            { duration: 3000 },
          );
        },
      });
  }

  puedeValidar(): boolean {
    return this.data?.estado === 'ENVIADO_DOCENTE' || this.data?.estado === 'OBSERVADO_DPTO' || this.data?.estado === 'SUBSANADO';
  }

  puedeObservar(): boolean {
    return this.puedeValidar() && this.data?.estado !== 'OBSERVADO_DPTO' && this.data?.estado !== 'OBSERVADO_FACULTAD';
  }

  get registros(): CargaLectivaRegistro[] {
    return this.data?.cargaLectiva?.registros || [];
  }

  get actividadesNoLectivas(): ActividadNoLectiva[] {
    const actividades = this.data?.declaracion?.carga_no_lectiva?.actividades || [];
    return actividades.filter(
      (actividad) =>
        Number(actividad.horas || 0) > 0 || Boolean(actividad.detalle?.trim()),
    );
  }

  get totalHorasNoLectivas(): number {
    return Number(this.data?.declaracion?.carga_no_lectiva?.total_horas || 0);
  }

  get totalHorasLectivas(): number {
    if (this.cursosFallback.length > 0) {
      return this.cursosFallback.reduce(
        (total, curso) => total + Number(curso.totalHrs || 0),
        0,
      );
    }
    return this.registros.reduce(
      (total, registro) => total + Number(registro.horasBloque || 0),
      0,
    );
  }

  get totalHorasDeclaradas(): number {
    return this.totalHorasLectivas + this.totalHorasNoLectivas;
  }

  get tieneLectivaConHorario(): boolean {
    return this.registros.length > 0 && this.cursosFallback.length === 0;
  }

  get tieneLectivaFallback(): boolean {
    return !this.tieneLectivaConHorario && this.cursosFallback.length > 0;
  }

  get estado(): string {
    return this.data?.estado || 'SIN_DECLARACION';
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      NO_INICIADO: 'No iniciado',
      BORRADOR: 'Borrador',
      PENDIENTE_ENVIO: 'Pendiente de envío',
      ENVIADO_DOCENTE: 'Enviado por docente',
      OBSERVADO_DPTO: 'Observado por departamento',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por departamento',
      OBSERVADO_FACULTAD: 'Observado por facultad',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
      SIN_DECLARACION: 'Sin declaracion',
    };
    return labels[this.estado] || this.estado;
  }

  get estadoColorClass(): string {
    const colors: Record<string, string> = {
      ENVIADO_DOCENTE: 'estado-enviado',
      OBSERVADO_DPTO: 'estado-observado',
      SUBSANADO: 'estado-subsanado',
      VALIDADO_DPTO: 'estado-validado',
      OBSERVADO_FACULTAD: 'estado-observado-facultad',
      APROBADO_FACULTAD: 'estado-aprobado',
      CERRADO: 'estado-cerrado',
      BORRADOR: 'estado-borrador',
      SIN_DECLARACION: 'estado-cerrado',
    };
    return colors[this.estado] || 'estado-cerrado';
  }

  getDiaLabel(dia: number): string {
    return ['','Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][dia] || String(dia);
  }

  getHorarioStr(item: any): string {
    if (Array.isArray(item.horarios) && item.horarios.length > 0) {
      return item.horarios.map((h: any) =>
        `${h.dia} ${(h.hora_inicio || '').substring(0, 5)}-${(h.hora_fin || '').substring(0, 5)}`
      ).join(', ');
    }
    if (item.horario) return item.horario;
    return '—';
  }

  volver(): void {
    this.router.navigate(['/app/documentaciones']);
  }
}
