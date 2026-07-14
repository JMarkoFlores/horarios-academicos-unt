import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ROLES } from '../../../core/constants/roles';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'app-registrar-usuario-dialog',
  templateUrl: './registrar-usuario-dialog.component.html',
})
export class RegistrarUsuarioDialogComponent {
  form: FormGroup;
  loading = false;
  hidePassword = true;

  roles = [
    { value: ROLES.ADMINISTRADOR_SISTEMA, label: 'Administrador del Sistema' },
    { value: ROLES.DIRECTOR_ESCUELA, label: 'Director de Escuela' },
    { value: ROLES.COORDINADOR_ACADEMICO, label: 'Coordinador Académico' },
    { value: ROLES.SECRETARIA, label: 'Secretaria' },
    { value: ROLES.DOCENTE, label: 'Docente' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarUsuarioDialogComponent>,
    private usuariosService: UsuariosService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rol: [ROLES.SECRETARIA, Validators.required],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.usuariosService.crear(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Usuario registrado exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar usuario';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.loading = false;
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
