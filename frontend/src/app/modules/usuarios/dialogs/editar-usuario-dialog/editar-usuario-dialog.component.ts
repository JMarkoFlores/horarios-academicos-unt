import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService, UsuarioItem } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-editar-usuario-dialog',
  templateUrl: './editar-usuario-dialog.component.html',
})
export class EditarUsuarioDialogComponent {
  form: FormGroup;
  loading = false;

  roles = [
    { value: 'administradorsistema', label: 'Administrador del Sistema' },
    { value: 'directorescuela', label: 'Director de Escuela' },
    { value: 'coordinadoracademico', label: 'Coordinador Académico' },
    { value: 'operadorhorarios', label: 'Operador de Horarios' },
    { value: 'docente', label: 'Docente' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditarUsuarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public usuario: UsuarioItem,
    private usuariosService: UsuariosService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      nombre: [usuario.nombre, [Validators.required, Validators.minLength(3)]],
      email: [usuario.email, [Validators.required, Validators.email]],
      rol: [usuario.rol, Validators.required],
      activo: [usuario.activo],
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.usuariosService.actualizar(this.usuario.id, this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Usuario actualizado correctamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al actualizar usuario';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.loading = false;
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
