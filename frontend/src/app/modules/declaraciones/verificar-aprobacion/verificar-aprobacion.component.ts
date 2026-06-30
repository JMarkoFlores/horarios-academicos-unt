import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';

interface CursoLectivo {
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
  detalle: string;
  horas: number;
}

interface DeclaracionEstadoDetalle {
  id?: number;
  estado?: string;
  fecha_firma_director?: string | null;
  fecha_firma_decano?: string | null;
  carga_no_lectiva?: {
    actividades?: ActividadNoLectiva[];
    total_horas?: number;
  } | null;
  usuario_firmante?: {
    nombre?: string;
  } | null;
}

@Component({
  selector: 'app-verificar-aprobacion',
  templateUrl: './verificar-aprobacion.component.html',
  styleUrls: ['./verificar-aprobacion.component.scss'],
})
export class VerificarAprobacionComponent implements OnInit {
  docenteId = 0;
  declaracionId: number | null = null;
  docente: Docente | null = null;
  periodo = '';
  estado = 'SIN_DECLARACION';
  directorValidador = 'No validado';
  fechaValidacion = 'No validado';
  loading = true;
  cursosLectivos: CursoLectivo[] = [];
  actividadesNoLectivas: ActividadNoLectiva[] = [];
  totalHorasLectivas = 0;
  totalHorasNoLectivas = 0;

  textoObservacion = '';
  observando = false;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.periodo = this.periodoService.periodo;
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.api.get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`).pipe(
      switchMap((docenteRes) => {
        this.docente = docenteRes.data;
        return this.api.get<ApiResponse<DeclaracionEstadoDetalle>>(
          `/declaraciones/docentes/${this.docenteId}/declaracion?periodo=${this.periodo}`,
        );
      }),
    ).subscribe({
      next: (declaracionRes) => {
        this.declaracionId = declaracionRes.data?.id || null;
        this.estado = declaracionRes.data?.estado || 'SIN_DECLARACION';
        this.directorValidador = this.resolverDirectorValidador(declaracionRes.data);
        this.fechaValidacion = this.resolverFechaValidacion(declaracionRes.data);
        this.cargarCargaNoLectiva(declaracionRes.data?.carga_no_lectiva);
        this.cargarCursosAsignados();
        this.loading = false;
      },
      error: () => {
        this.declaracionId = null;
        this.estado = 'SIN_DECLARACION';
        this.directorValidador = 'No validado';
        this.fechaValidacion = 'No validado';
        this.cursosLectivos = [];
        this.actividadesNoLectivas = [];
        this.loading = false;
        this.snackBar.open('No se pudieron cargar los datos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private cargarCursosAsignados(): void {
    this.api
      .get<ApiResponse<any[]>>(
        `/declaraciones/docentes/${this.docenteId}/cursos?periodo=${this.periodo}`,
      )
      .subscribe({
        next: (res) => {
          this.cursosLectivos = (res.data || []).map((c: any) => ({
            id: c.id,
            codigo: c.codigo || '',
            nombre: c.nombre || '',
            seccion: c.seccion || '',
            escuela: c.escuela || '',
            ciclo: c.ciclo || 0,
            nroAlumnos: c.nroAlumnos || 0,
            hrsTeo: c.hrsTeo || 0,
            hrsPra: c.hrsPra || 0,
            hrsLab: c.hrsLab || 0,
            totalHrs: c.totalHrs || 0,
          }));
          this.totalHorasLectivas = this.cursosLectivos.reduce(
            (sum, curso) => sum + (curso.totalHrs || 0), 0,
          );
        },
      });
  }

  private cargarCargaNoLectiva(
    data: DeclaracionEstadoDetalle['carga_no_lectiva'],
  ): void {
    this.actividadesNoLectivas = (data?.actividades || []).map((actividad) => ({
      id: actividad.id,
      codigo: actividad.codigo,
      descripcion: actividad.descripcion,
      detalle: actividad.detalle || '',
      horas: Number(actividad.horas) || 0,
    }));
    this.totalHorasNoLectivas = Number(data?.total_horas || 0);
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      BORRADOR: 'Borrador',
      ENVIADO: 'Enviado por docente',
      VALIDADO_DPTO: 'Validado por departamento',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
      SIN_DECLARACION: 'Sin declaración registrada',
    };
    return labels[this.estado] || this.estado;
  }

  get estadoColor(): string {
    const colors: Record<string, string> = {
      BORRADOR: 'estado-borrador',
      ENVIADO: 'estado-enviado',
      VALIDADO_DPTO: 'estado-validado',
      APROBADO_FACULTAD: 'estado-aprobado',
      CERRADO: 'estado-cerrado',
      SIN_DECLARACION: 'estado-cerrado',
    };
    return colors[this.estado] || 'estado-cerrado';
  }

  private resolverDirectorValidador(
    declaracion: DeclaracionEstadoDetalle | null | undefined,
  ): string {
    const nombreFirmante = declaracion?.usuario_firmante?.nombre;
    if (
      ['VALIDADO_DPTO', 'APROBADO_FACULTAD', 'CERRADO', 'OBSERVADO_DPTO', 'OBSERVADO_FACULTAD', 'REABIERTO'].includes(declaracion?.estado || '') &&
      nombreFirmante
    ) {
      return nombreFirmante;
    }
    return 'No validado';
  }

  private resolverFechaValidacion(
    declaracion: DeclaracionEstadoDetalle | null | undefined,
  ): string {
    if (
      ['VALIDADO_DPTO', 'APROBADO_FACULTAD', 'CERRADO', 'OBSERVADO_DPTO', 'OBSERVADO_FACULTAD', 'REABIERTO'].includes(declaracion?.estado || '') &&
      declaracion?.fecha_firma_director
    ) {
      return new Date(declaracion.fecha_firma_director).toLocaleString('es-PE');
    }
    return 'No validado';
  }

  get mostrarDocumentosConferir(): boolean {
    return ['VALIDADO_DPTO', 'APROBADO_FACULTAD', 'CERRADO', 'OBSERVADO_DPTO', 'OBSERVADO_FACULTAD', 'REABIERTO'].includes(this.estado);
  }

  get puedeAprobar(): boolean {
    return this.estado === 'VALIDADO_DPTO';
  }

  get puedeCerrar(): boolean {
    return this.estado === 'APROBADO_FACULTAD';
  }

  toggleObservar(): void {
    this.observando = !this.observando;
    this.textoObservacion = '';
  }

  aprobar(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/validar-facultad`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración aprobada por facultad', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al aprobar', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  cerrar(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/cerrar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración cerrada correctamente', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al cerrar', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  observar(): void {
    if (!this.declaracionId) return;
    if (!this.textoObservacion || this.textoObservacion.trim().length < 10) {
      this.snackBar.open('La observación debe tener al menos 10 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.api.post<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/observaciones`, {
      observacion: this.textoObservacion,
    }).subscribe({
      next: () => {
        this.snackBar.open('Observación registrada correctamente', 'Cerrar', { duration: 3000 });
        this.textoObservacion = '';
        this.observando = false;
        this.saving = false;
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al registrar observación', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  generarPdfDeclaracion(): void {
    if (!this.docente) return;
    this.snackBar.open('Generando documento...', '', { duration: 2000 });
    this.api.getBlob(`/reportes/f01-cad/${this.docente.id}/pdf?periodo=${this.periodo}`)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `f01-cad_${this.docente?.apellidos || 'docente'}_${this.periodo}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          this.snackBar.open('PDF descargado con éxito', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
        },
      });
  }

  generarPdfHorario(): void {
    if (!this.docente) return;
    this.snackBar.open('Generando documento...', '', { duration: 2000 });
    this.api.getBlob(`/reportes/docente/${this.docenteId}/f03-cad?periodo=${this.periodo}`)
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `f03-cad_${this.docente?.apellidos || 'docente'}_${this.periodo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.snackBar.open('PDF descargado con éxito', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Error al generar el horario', 'Cerrar', { duration: 3000 });
        },
      });
  }

  generarPdfJurada(): void {
    if (!this.docente) return;
    this.snackBar.open('Generando documento...', '', { duration: 2000 });
    this.api.post<any>(`/declaraciones/docentes/${this.docente.id}/declaracion-jurada`, {
      periodo: this.periodo,
    }).pipe(
      switchMap(() => this.api.getBlob(`/reportes/declaracion-jurada/${this.docente!.id}/pdf?periodo=${this.periodo}`)),
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `declaracion_jurada_${this.docente?.apellidos || 'docente'}_${this.periodo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        this.snackBar.open('PDF generado con éxito', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Error al generar la declaración jurada', 'Cerrar', { duration: 3000 });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
