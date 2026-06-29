import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/interfaces/entities';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

export interface OfertaAcademica {
  id: number;
  periodo_id: number;
  curso_plan_id: number;
  tipo_clase: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  secciones: number;
  activo: boolean;
  periodo?: { id: number; codigo: string; nombre: string };
  curso_plan?: {
    id: number;
    ciclo: number;
    horas_teoria: number;
    horas_practica: number;
    horas_laboratorio: number;
    curso: { id: number; codigo: string; nombre: string; creditos: number };
  };
}

@Component({
  selector: 'app-oferta-academica-list',
  templateUrl: './oferta-academica-list.component.html',
  styleUrls: ['./oferta-academica-list.component.scss'],
})
export class OfertaAcademicaListComponent implements OnInit {
  displayedColumns = ['codigo', 'nombre', 'ciclo', 'tipo', 'secciones', 'periodo', 'activo', 'acciones'];
  dataSource: OfertaAcademica[] = [];
  loading = false;
  searchControl = new FormControl('');
  generando = false;

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadOfertas();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadOfertas());
  }

  loadOfertas(): void {
    this.loading = true;
    const params: Record<string, string | number> = {};
    if (this.searchControl.value) params['search'] = this.searchControl.value;
    this.api.get<ApiResponse<OfertaAcademica[]>>('/oferta-academica', params).subscribe({
      next: (res) => {
        this.dataSource = res.data;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  generarDesdePlan(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Generar Oferta Académica',
        message: '¿Generar oferta académica desde el plan de estudios activo?',
        detail: 'Se crearán registros para todos los cursos del plan activo en el período actual. Los cursos ya ofertados se omitirán.',
        confirmText: 'Generar',
        confirmColor: 'primary',
      },
    });
    dialogRef.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.generando = true;
      this.api.get<ApiResponse<{ id: number; codigo: string; nombre: string }[]>>('/plan-estudios', { activo: true }).subscribe({
        next: (planesRes) => {
          const planes = planesRes.data || planesRes as any;
          const activo = Array.isArray(planes) ? planes.find((p: any) => p.activo) : null;
          if (!activo) {
            this.generando = false;
            this.snackBar.open('No hay un plan de estudios activo', 'Cerrar', { duration: 4000 });
            return;
          }
          this.api.get<ApiResponse<any>>('/periodos', { activo: true }).subscribe({
            next: (perRes) => {
              const periodos = perRes.data?.items || [];
              const periodo = Array.isArray(periodos) ? periodos.find((p: any) => p.activo) : null;
              if (!periodo) {
                this.generando = false;
                this.snackBar.open('No hay un período activo', 'Cerrar', { duration: 4000 });
                return;
              }
              this.api.post<any>(`/oferta-academica/generar/${periodo.id}/${activo.id}`, {}).subscribe({
                next: (res) => {
                  this.generando = false;
                  const count = Array.isArray(res?.data || res) ? (res?.data || res).length : 0;
                  this.snackBar.open(`Oferta generada: ${count} registros creados`, 'OK', { duration: 4000 });
                  this.loadOfertas();
                },
                error: (err) => {
                  this.generando = false;
                  this.snackBar.open(err?.error?.message ?? 'Error al generar oferta', 'Cerrar', { duration: 4000 });
                },
              });
            },
            error: () => {
              this.generando = false;
              this.snackBar.open('Error al obtener período activo', 'Cerrar', { duration: 4000 });
            },
          });
        },
        error: () => {
          this.generando = false;
          this.snackBar.open('Error al obtener plan activo', 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  toggleActivo(oferta: OfertaAcademica): void {
    const accion = oferta.activo ? 'Desactivar' : 'Activar';
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: `${accion} oferta`,
        message: `¿${accion} la oferta de "${oferta.curso_plan?.curso?.nombre || ''}"?`,
        detail: oferta.activo
          ? 'El curso dejará de estar disponible para asignación lectiva.'
          : 'El curso volverá a estar disponible para asignación lectiva.',
        confirmText: accion,
        confirmColor: oferta.activo ? 'warn' : 'primary',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.patch<ApiResponse<OfertaAcademica>>(`/oferta-academica/${oferta.id}/toggle-activo`, {}).subscribe({
        next: () => {
          this.snackBar.open(`Oferta ${accion.toLowerCase()}da`, 'OK', { duration: 2500 });
          this.loadOfertas();
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  tipoClaseLabel(tipo: string): string {
    const labels: Record<string, string> = { TEORIA: 'Teoría', PRACTICA: 'Práctica', LABORATORIO: 'Laboratorio' };
    return labels[tipo] || tipo;
  }
}
