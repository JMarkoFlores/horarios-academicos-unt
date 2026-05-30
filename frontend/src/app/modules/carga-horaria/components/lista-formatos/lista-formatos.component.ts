import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { EstadoDeclaracion, FormatoItem, Docente, Semestre } from '../../models/carga-horaria.models';
import { CargaHorariaService } from '../../services/carga-horaria.service';

@Component({
  selector: 'app-lista-formatos',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './lista-formatos.component.html',
  styleUrls: ['./lista-formatos.component.scss'],
})
export class ListaFormatosComponent implements OnInit {
  displayedColumns = [
    'numero',
    'formato',
    'sede',
    'estado',
    'ultimaActualizacion',
    'accion',
  ];

  formatos: FormatoItem[] = [];
  docente?: Docente;
  semestre?: Semestre;
  loadingDocente = true;
  loadingSemestre = true;
  loadingFormatos = true;

  constructor(
    private readonly cargaHorariaService: CargaHorariaService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargaHorariaService
      .getDocenteActual()
      .pipe(finalize(() => (this.loadingDocente = false)))
      .subscribe((docente) => (this.docente = docente));

    this.route.queryParamMap.subscribe((params) => {
      const semestreIdParam = params.get('semestreId');
      if (!semestreIdParam) {
        this.semestre = undefined;
        this.formatos = [];
        this.loadingSemestre = false;
        this.loadingFormatos = false;
        return;
      }

      const semestreId = Number(semestreIdParam);
      if (Number.isNaN(semestreId)) {
        this.semestre = undefined;
        this.formatos = [];
        this.loadingSemestre = false;
        this.loadingFormatos = false;
        return;
      }

      this.cargarSemestreYFormatos(semestreId);
    });
  }

  private cargarSemestreYFormatos(semestreId: number): void {
    this.loadingSemestre = true;
    this.loadingFormatos = true;

    this.cargaHorariaService
      .getSemestres()
      .pipe(finalize(() => (this.loadingSemestre = false)))
      .subscribe((semestres) => {
        this.semestre = semestres.find((item) => item.id === semestreId);
      });

    this.cargaHorariaService
      .getFormatos(semestreId)
      .pipe(finalize(() => (this.loadingFormatos = false)))
      .subscribe((formatos) => {
        this.formatos = formatos;
      });
  }

  estadoLabel(estado: EstadoDeclaracion): string {
    const labels: Record<EstadoDeclaracion, string> = {
      [EstadoDeclaracion.NO_INICIADO]: 'No iniciado',
      [EstadoDeclaracion.BORRADOR]: 'Borrador',
      [EstadoDeclaracion.PENDIENTE_ENVIO]: 'Pendiente de envío',
      [EstadoDeclaracion.ENVIADO_DOCENTE]: 'Enviado al docente',
      [EstadoDeclaracion.OBSERVADO_DPTO]: 'Observado Dpto.',
      [EstadoDeclaracion.OBSERVADO_FACULTAD]: 'Observado Facultad',
      [EstadoDeclaracion.VALIDADO_DPTO]: 'Validado Dpto.',
      [EstadoDeclaracion.APROBADO_FACULTAD]: 'Aprobado Facultad',
      [EstadoDeclaracion.CERRADO]: 'Cerrado',
    };
    return labels[estado];
  }

  estadoChipClass(estado: EstadoDeclaracion): string {
    switch (estado) {
      case EstadoDeclaracion.NO_INICIADO:
        return 'chip-neutro';
      case EstadoDeclaracion.BORRADOR:
      case EstadoDeclaracion.PENDIENTE_ENVIO:
      case EstadoDeclaracion.ENVIADO_DOCENTE:
        return 'chip-azul';
      case EstadoDeclaracion.OBSERVADO_DPTO:
      case EstadoDeclaracion.OBSERVADO_FACULTAD:
        return 'chip-ambar';
      case EstadoDeclaracion.VALIDADO_DPTO:
        return 'chip-verde';
      case EstadoDeclaracion.APROBADO_FACULTAD:
      case EstadoDeclaracion.CERRADO:
        return 'chip-verde-oscuro';
      default:
        return 'chip-neutro';
    }
  }

  accionLabel(estado: EstadoDeclaracion): string {
    if (estado === EstadoDeclaracion.NO_INICIADO) return 'Iniciar';
    if (estado === EstadoDeclaracion.BORRADOR) return 'Continuar';
    if (
      estado === EstadoDeclaracion.APROBADO_FACULTAD ||
      estado === EstadoDeclaracion.CERRADO
    )
      return 'Descargar PDF';
    if (
      estado === EstadoDeclaracion.OBSERVADO_DPTO ||
      estado === EstadoDeclaracion.OBSERVADO_FACULTAD
    )
      return 'Revisar';
    if (estado === EstadoDeclaracion.VALIDADO_DPTO) return 'Ver detalle';
    return 'Seguimiento';
  }

  ejecutarAccion(formato: FormatoItem): void {
    const { estado, id } = formato;
    if (
      estado === EstadoDeclaracion.APROBADO_FACULTAD ||
      estado === EstadoDeclaracion.CERRADO
    ) {
      this.snackBar.open('Descarga simulada del PDF.', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    this.router.navigate(['/carga-horaria/formato-uno', id]);
  }
}
