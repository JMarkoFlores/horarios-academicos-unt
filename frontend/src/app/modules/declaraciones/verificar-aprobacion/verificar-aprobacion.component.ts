import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  carga_no_lectiva?: {
    actividades?: ActividadNoLectiva[];
    total_horas?: number;
  } | null;
  usuario_firmante?: {
    nombre?: string;
  } | null;
}

interface DocumentoConferir {
  nombre: string;
  sede: string;
  estado: string;
  tipo: 'declaracion' | 'horario' | 'jurada' | 'jurada2';
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
  documentosColumns = ['nombre', 'sede', 'estado', 'conferir'];
  descargandoDocumento: string | null = null;
  
  textoObservacion = '';
  observando = false;
  saving = false;

  documentos: DocumentoConferir[] = [
    {
      nombre: 'Declaracion de carga horaria (F01-CAD)',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'declaracion',
    },
    {
      nombre: 'Horario semanal docente (F03-CAD)',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'horario',
    },
    {
      nombre: 'Declaracion jurada de incompatibilidad (F02-CAD)',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'jurada',
    },
  ];

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
    this.api.get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`).subscribe({
      next: (docenteRes) => {
        this.docente = docenteRes.data;
        this.api
          .get<ApiResponse<DeclaracionEstadoDetalle>>(
            `/declaraciones/docentes/${this.docenteId}/declaracion?periodo=${this.periodo}`,
          )
          .subscribe({
            next: (declaracionRes) => {
              this.declaracionId = declaracionRes.data?.id || null;
              this.estado = declaracionRes.data?.estado || 'SIN_DECLARACION';
              this.directorValidador = this.resolverDirectorValidador(
                declaracionRes.data,
              );
              this.fechaValidacion = this.resolverFechaValidacion(
                declaracionRes.data,
              );
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
            },
          });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudo cargar el docente', 'Cerrar', {
          duration: 3000,
        });
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
            (sum, curso) => sum + (curso.totalHrs || 0),
            0,
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
      PENDIENTE_ENVIO: 'Pendiente de envío',
      ENVIADO_DOCENTE: 'Enviado por docente',
      OBSERVADO_DPTO: 'Observado por departamento',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por departamento',
      OBSERVADO_FACULTAD: 'Observado por facultad',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
      SIN_DECLARACION: 'Sin declaración registrada',
    };
    return labels[this.estado] || this.estado;
  }

  get estadoColor(): string {
    const colors: Record<string, string> = {
      BORRADOR: 'estado-borrador',
      PENDIENTE_ENVIO: 'estado-enviado',
      ENVIADO_DOCENTE: 'estado-enviado',
      OBSERVADO_DPTO: 'estado-observado',
      SUBSANADO: 'estado-enviado',
      VALIDADO_DPTO: 'estado-validado',
      OBSERVADO_FACULTAD: 'estado-observado',
      APROBADO_FACULTAD: 'estado-aprobado',
      CERRADO: 'estado-cerrado',
      ANULADO: 'estado-cerrado',
      SIN_DECLARACION: 'estado-cerrado',
    };
    return colors[this.estado] || 'estado-cerrado';
  }

  private resolverDirectorValidador(
    declaracion: DeclaracionEstadoDetalle | null | undefined,
  ): string {
    const nombreFirmante = declaracion?.usuario_firmante?.nombre;
    if (
      this.estaValidadaPorDepartamento(declaracion?.estado) &&
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
      this.estaValidadaPorDepartamento(declaracion?.estado) &&
      declaracion?.fecha_firma_director
    ) {
      return new Date(declaracion.fecha_firma_director).toLocaleString('es-PE');
    }

    return 'No validado';
  }

  private estaValidadaPorDepartamento(estado?: string): boolean {
    return [
      'VALIDADO_DPTO',
      'OBSERVADO_FACULTAD',
      'APROBADO_FACULTAD',
      'CERRADO',
    ].includes(estado || '');
  }

  get mostrarDocumentosConferir(): boolean {
    return this.estaValidadaPorDepartamento(this.estado);
  }

  conferirDocumento(documento: DocumentoConferir): void {
    this.descargandoDocumento = documento.tipo;

    if (documento.tipo === 'declaracion') {
      this.generarPdfDeclaracion();
      this.descargandoDocumento = null;
      return;
    }

    if (documento.tipo === 'horario') {
      this.api
        .getBlob(`/reportes/docente/${this.docenteId}/f03-cad?periodo=${this.periodo}`)
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `f03-cad_${this.docente?.apellidos || 'docente'}_${this.periodo}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            this.descargandoDocumento = null;
          },
          error: () => {
            this.snackBar.open('No se pudo descargar el horario semanal', 'Cerrar', {
              duration: 3000,
            });
            this.descargandoDocumento = null;
          },
        });
      return;
    }

    if (documento.tipo === 'jurada2') {
      this.generarPdfDeclaracionJuradaBackend();
      this.descargandoDocumento = null;
      return;
    }

    this.generarPdfDeclaracionJuradaBackend();
    this.descargandoDocumento = null;
  }

  private generarPdfDeclaracionJuradaBackend(): void {
    const d = this.docente;
    if (!d) { this.descargandoDocumento = null; return; }
    this.snackBar.open('Generando documento...', '', { duration: 2000 });
    this.api.post<any>(`/declaraciones/docentes/${d.id}/declaracion-jurada`, {
      periodo: this.periodo,
    }).subscribe({
      next: () => {
        this.api.getBlob(`/reportes/declaracion-jurada/${d.id}/pdf?periodo=${this.periodo}`)
          .subscribe({
            next: (blob) => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `declaracion_jurada_incompatibilidad_${d.apellidos}_${this.periodo}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
              this.descargandoDocumento = null;
              this.snackBar.open('PDF generado con éxito', 'Cerrar', { duration: 3000 });
            },
            error: () => {
              this.descargandoDocumento = null;
              this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
            },
          });
      },
      error: () => {
        this.descargandoDocumento = null;
        this.snackBar.open('Error al registrar la declaración jurada', 'Cerrar', { duration: 3000 });
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
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error al generar el PDF de Declaración', 'Cerrar', { duration: 3000 });
        }
      });
  }

  get puedeAprobar(): boolean {
    return this.estado === 'VALIDADO_DPTO' || this.estado === 'OBSERVADO_FACULTAD';
  }

  toggleObservar(): void {
    this.observando = !this.observando;
    this.textoObservacion = '';
  }

  aprobar(): void {
    if (!this.declaracionId) return;
    this.saving = true;
    this.api.patch<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/aprobar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Declaración aprobada correctamente', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al aprobar', 'Cerrar', { duration: 3000 });
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
    this.api.patch<ApiResponse<any>>(`/declaraciones/${this.declaracionId}/observar`, {
      observaciones: this.textoObservacion,
    }).subscribe({
      next: () => {
        this.snackBar.open('Declaración observada correctamente', 'Cerrar', { duration: 3000 });
        this.textoObservacion = '';
        this.observando = false;
        this.saving = false;
        this.cargarDatos();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al observar', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
