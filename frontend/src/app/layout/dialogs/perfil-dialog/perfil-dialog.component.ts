import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Usuario } from '../../../core/interfaces/entities';

const ROL_LABELS: Record<string, string> = {
  administradorsistema: 'Administrador del Sistema',
  directorescuela: 'Director de Escuela',
  coordinadoracademico: 'Coordinador Académico',
  operadorhorarios: 'Operador de Horarios',
  docente: 'Docente',
  visualizador: 'Visualizador',
};

@Component({
  selector: 'app-perfil-dialog',
  templateUrl: './perfil-dialog.component.html',
})
export class PerfilDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public usuario: Usuario,
    private dialogRef: MatDialogRef<PerfilDialogComponent>,
  ) {}

  get iniciales(): string {
    if (!this.usuario?.nombre) return '?';
    return this.usuario.nombre
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  getRolLabel(rol?: string): string {
    return rol ? (ROL_LABELS[rol] ?? rol) : '—';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
