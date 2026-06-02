import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../../core/interfaces/entities';

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

const ACTIVIDADES_NO_LECTIVAS: { id: number; descripcion: string }[] = [
  { id: 1, descripcion: '1. TRABAJO LECTIVO: Datos completos y con claridad' },
  {
    id: 2,
    descripcion: '2. PREPARACIÓN Y EVALUACIÓN (Max 50% de Trabajo Lectivo)',
  },
  {
    id: 3,
    descripcion:
      '3. CONSEJERÍA Y TUTORÍA: señalar número de alumnos y ciclo académico',
  },
  {
    id: 4,
    descripcion:
      '4. INVESTIGACIÓN: Consignar el nro de inscripción, código, nombre y duración del proyecto',
  },
  {
    id: 5,
    descripcion:
      '5. CAPACITACIÓN: Señalar lo referente a este rubro en el marco de los planes de cada Facultad',
  },
  {
    id: 6,
    descripcion: '6. ACTIVIDADES DE GOBIERNO: Se desempeña cargo indique',
  },
  {
    id: 7,
    descripcion: '7. ACTIVIDADES DE ADMINISTRACIÓN: Si desempeña cargo indique',
  },
  {
    id: 8,
    descripcion:
      '8. ASESORÍA DE TESIS, EXÁMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL',
  },
  {
    id: 9,
    descripcion:
      '9. RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad, proyecto a ejecutarse',
  },
  {
    id: 10,
    descripcion:
      '10. COMITÉS TÉCNICOS Y COMISIONES: Consignar el número de Resolución autorizativa',
  },
];

@Component({
  selector: 'app-verificar-declaracion',
  templateUrl: './verificar-declaracion.component.html',
  styleUrls: ['./verificar-declaracion.component.scss'],
})
export class VerificarDeclaracionComponent implements OnInit {
  docenteId = 0;
  docente: Docente | null = null;
  loading = true;
  saving = false;
  periodoActivo = '';

  estadoDeclaracion: string = 'BORRADOR';
  estadoLabel = '';
  estadoColor = '';

  // Horas lectivas
  cursosLectivos: CursoLectivo[] = [];
  totalHorasLectivas = 0;

  // Horas no lectivas
  actividadesNoLectivas: ActividadNoLectiva[] = [];
  totalHorasNoLectivas = 0;

  // Total general
  totalHoras = 0;

  // Para control de edición
  esEditable = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.periodoActivo = this.periodoService.periodo;
    this.inicializarActividadesNoLectivas();
    this.cargarDocente();
    this.cargarCursosAsignados();
    this.cargarDeclaracion();
  }

  inicializarActividadesNoLectivas(): void {
    this.actividadesNoLectivas = ACTIVIDADES_NO_LECTIVAS.map((a) => ({
      id: a.id,
      codigo: a.id.toString().padStart(3, '0'),
      descripcion: a.descripcion,
      detalle: '',
      horas: 0,
    }));
  }

  cargarDocente(): void {
    this.api
      .get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`)
      .subscribe({
        next: (res) => {
          this.docente = res.data;
        },
        error: () => {
          this.snackBar.open('Error al cargar datos del docente', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

  cargarCursosAsignados(): void {
    this.api
      .get<
        ApiResponse<any[]>
      >(`/declaraciones/docentes/${this.docenteId}/cursos?periodo=${this.periodoActivo}`)
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
          this.calcularTotales();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  cargarDeclaracion(): void {
    this.api
      .get<
        ApiResponse<any>
      >(`/declaraciones/docentes/${this.docenteId}/declaracion?periodo=${this.periodoActivo}`)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.estadoDeclaracion = res.data.estado || 'BORRADOR';
            this.actualizarEstadoVisual();
            if (res.data.carga_no_lectiva) {
              this.cargarCargaNoLectiva(res.data.carga_no_lectiva);
            }
          } else {
            this.estadoDeclaracion = 'BORRADOR';
            this.actualizarEstadoVisual();
          }
        },
        error: () => {
          this.estadoDeclaracion = 'BORRADOR';
          this.actualizarEstadoVisual();
        },
      });
  }

  cargarCargaNoLectiva(data: any): void {
    if (Array.isArray(data.actividades)) {
      data.actividades.forEach((a: any) => {
        const act = this.actividadesNoLectivas.find((x) => x.id === a.id);
        if (act) {
          act.detalle = a.detalle || '';
          act.horas = a.horas || 0;
        }
      });
      this.calcularTotales();
    }
  }

  actualizarEstadoVisual(): void {
    const mapa: Record<
      string,
      { label: string; color: string; editable: boolean }
    > = {
      BORRADOR: { label: 'BORRADOR', color: 'estado-borrador', editable: true },
      ENVIADO_DOCENTE: {
        label: 'ENVIADO POR DOCENTE',
        color: 'estado-enviado',
        editable: false,
      },
      OBSERVADO_DPTO: {
        label: 'OBSERVADO POR DPTO',
        color: 'estado-observado',
        editable: true,
      },
      VALIDADO_DPTO: {
        label: 'VALIDADO POR DPTO',
        color: 'estado-validado',
        editable: false,
      },
      APROBADO_FACULTAD: {
        label: 'APROBADO POR FACULTAD',
        color: 'estado-aprobado',
        editable: false,
      },
      CERRADO: { label: 'CERRADO', color: 'estado-cerrado', editable: false },
    };
    const config = mapa[this.estadoDeclaracion] || mapa['BORRADOR'];
    this.estadoLabel = config.label;
    this.estadoColor = config.color;
    this.esEditable = config.editable;
  }

  calcularTotales(): void {
    this.totalHorasLectivas = this.cursosLectivos.reduce(
      (sum, c) => sum + (c.totalHrs || 0),
      0,
    );
    this.totalHorasNoLectivas = this.actividadesNoLectivas.reduce(
      (sum, a) => sum + (Number(a.horas) || 0),
      0,
    );
    this.totalHoras = this.totalHorasLectivas + this.totalHorasNoLectivas;
  }

  onCursoChange(curso: CursoLectivo): void {
    curso.totalHrs =
      (Number(curso.hrsTeo) || 0) +
      (Number(curso.hrsPra) || 0) +
      (Number(curso.hrsLab) || 0);
    this.calcularTotales();
  }

  onActividadChange(): void {
    this.calcularTotales();
  }

  guardar(): void {
    if (!this.esEditable) {
      this.snackBar.open(
        'La declaración no se puede modificar en este estado',
        'Cerrar',
        { duration: 3000 },
      );
      return;
    }

    this.saving = true;
    const payload = {
      docente_id: this.docenteId,
      periodo: this.periodoActivo,
      estado: 'BORRADOR',
      cursos_lectivos: this.cursosLectivos.map((c) => ({
        curso_id: c.id,
        nro_alumnos: c.nroAlumnos,
        hrs_teo: c.hrsTeo,
        hrs_pra: c.hrsPra,
        hrs_lab: c.hrsLab,
        total_hrs: c.totalHrs,
      })),
      carga_no_lectiva: {
        actividades: this.actividadesNoLectivas.map((a) => ({
          id: a.id,
          codigo: a.codigo,
          descripcion: a.descripcion,
          detalle: a.detalle,
          horas: Number(a.horas) || 0,
        })),
        total_horas: this.totalHorasNoLectivas,
      },
      total_horas: this.totalHoras,
    };

    this.api
      .post<ApiResponse<any>>('/declaraciones/guardar', payload)
      .subscribe({
        next: () => {
          this.snackBar.open('Declaración guardada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.saving = false;
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al guardar la declaración',
            'Cerrar',
            { duration: 3000 },
          );
          this.saving = false;
        },
      });
  }

  enviar(): void {
    this.saving = true;
    this.api
      .post<ApiResponse<any>>(
        `/declaraciones/docentes/${this.docenteId}/enviar`,
        {
          periodo: this.periodoActivo,
        },
      )
      .subscribe({
        next: () => {
          this.estadoDeclaracion = 'ENVIADO_DOCENTE';
          this.actualizarEstadoVisual();
          this.snackBar.open('Declaración enviada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.saving = false;
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al enviar la declaración',
            'Cerrar',
            { duration: 3000 },
          );
          this.saving = false;
        },
      });
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
