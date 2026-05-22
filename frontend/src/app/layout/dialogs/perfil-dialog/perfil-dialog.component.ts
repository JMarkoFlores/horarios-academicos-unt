import {
  Component,
  Inject,
  OnInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Usuario } from '../../../core/interfaces/entities';
import { AuthService } from '../../../core/services/auth.service';

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
  styleUrls: ['./perfil-dialog.component.scss'],
})
export class PerfilDialogComponent implements OnInit {
  fotoUrl: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public usuario: Usuario,
    private dialogRef: MatDialogRef<PerfilDialogComponent>,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.usuario) {
      this.fotoUrl = this.authService.getProfilePhoto(this.usuario.id);
    }
  }

  triggerFileInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.ngZone.run(() => {
            const base64 = reader.result as string;
            this.fotoUrl = base64;
            this.authService.saveProfilePhoto(this.usuario.id, base64);
            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

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

  logout(): void {
    this.dialogRef.close('logout');
    this.authService.logout();
  }
}
