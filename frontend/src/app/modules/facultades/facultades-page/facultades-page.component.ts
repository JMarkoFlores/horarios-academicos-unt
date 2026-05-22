import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FacultadesService,
  Facultad,
  Escuela,
  Departamento,
} from '../../../core/services/facultades.service';
import { FacultadFormDialogComponent } from '../dialogs/facultad-form-dialog/facultad-form-dialog.component';
import { EscuelaFormDialogComponent } from '../dialogs/escuela-form-dialog/escuela-form-dialog.component';
import { DepartamentoFormDialogComponent } from '../dialogs/departamento-form-dialog/departamento-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-facultades-page',
  templateUrl: './facultades-page.component.html',
  styleUrls: ['./facultades-page.component.scss'],
})
export class FacultadesPageComponent implements OnInit {
  facultades: Facultad[] = [];
  escuelas: Escuela[] = [];
  departamentos: Departamento[] = [];
  loading = false;

  facultadFiltro: number | null = null;
  escuelaFiltro: number | null = null;

  colsFacultades = ['codigo', 'nombre', 'coordinador', 'escuelas', 'estado', 'acciones'];
  colsEscuelas = ['codigo', 'nombre', 'facultad', 'coordinador', 'departamentos', 'estado', 'acciones'];
  colsDepartamentos = ['codigo', 'nombre', 'escuela', 'coordinador', 'estado', 'acciones'];

  constructor(
    private service: FacultadesService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.service.listarFacultades().subscribe({ next: (r) => (this.facultades = r.data) });
    this.service.listarEscuelas().subscribe({ next: (r) => (this.escuelas = r.data) });
    this.service.listarDepartamentos().subscribe({
      next: (r) => { this.departamentos = r.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get escuelasFiltradas(): Escuela[] {
    if (!this.facultadFiltro) return this.escuelas;
    return this.escuelas.filter((e) => e.facultad_id === this.facultadFiltro);
  }

  get departamentosFiltrados(): Departamento[] {
    if (!this.escuelaFiltro) return this.departamentos;
    return this.departamentos.filter((d) => d.escuela_id === this.escuelaFiltro);
  }

  // ── Facultad ──────────────────────────────────────────────────────────────
  openFacultadDialog(facultad?: Facultad): void {
    const ref = this.dialog.open(FacultadFormDialogComponent, {
      width: '520px',
      data: { facultad },
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.loadAll(); });
  }

  deleteFacultad(f: Facultad): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Facultad',
        message: `¿Eliminar la facultad "${f.nombre}"?`,
        detail: 'Esta acción no se puede revertir. La facultad no debe tener escuelas.',
        confirmLabel: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.eliminarFacultad(f.id).subscribe({
        next: () => { this.snack.open('Facultad eliminada', 'OK', { duration: 2500 }); this.loadAll(); },
        error: (err) => this.snack.open(err?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
      });
    });
  }

  // ── Escuela ───────────────────────────────────────────────────────────────
  openEscuelaDialog(escuela?: Escuela): void {
    const ref = this.dialog.open(EscuelaFormDialogComponent, {
      width: '520px',
      data: { escuela, facultad_id: this.facultadFiltro ?? undefined },
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.loadAll(); });
  }

  deleteEscuela(e: Escuela): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Escuela',
        message: `¿Eliminar la escuela "${e.nombre}"?`,
        detail: 'La escuela no debe tener departamentos asociados.',
        confirmLabel: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.eliminarEscuela(e.id).subscribe({
        next: () => { this.snack.open('Escuela eliminada', 'OK', { duration: 2500 }); this.loadAll(); },
        error: (err) => this.snack.open(err?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
      });
    });
  }

  // ── Departamento ──────────────────────────────────────────────────────────
  openDepartamentoDialog(dep?: Departamento): void {
    const ref = this.dialog.open(DepartamentoFormDialogComponent, {
      width: '520px',
      data: { departamento: dep, escuela_id: this.escuelaFiltro ?? undefined },
    });
    ref.afterClosed().subscribe((ok) => { if (ok) this.loadAll(); });
  }

  deleteDepartamento(d: Departamento): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Departamento',
        message: `¿Eliminar el departamento "${d.nombre}"?`,
        detail: 'Esta acción no se puede revertir.',
        confirmLabel: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.eliminarDepartamento(d.id).subscribe({
        next: () => { this.snack.open('Departamento eliminado', 'OK', { duration: 2500 }); this.loadAll(); },
        error: (err) => this.snack.open(err?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
      });
    });
  }

  getNombreFacultad(id: number): string {
    return this.facultades.find((f) => f.id === id)?.nombre ?? '—';
  }

  getNombreEscuela(id: number): string {
    return this.escuelas.find((e) => e.id === id)?.nombre ?? '—';
  }
}
