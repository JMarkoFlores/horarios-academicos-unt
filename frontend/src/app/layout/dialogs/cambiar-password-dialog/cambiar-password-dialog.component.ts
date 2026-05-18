import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

function passwordsCoinciden(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('password_nueva')?.value;
  const confirmar = group.get('confirmar_password')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-cambiar-password-dialog',
  templateUrl: './cambiar-password-dialog.component.html',
})
export class CambiarPasswordDialogComponent {
  form: FormGroup;
  loading = false;
  hideActual = true;
  hideNueva = true;
  hideConfirmar = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CambiarPasswordDialogComponent>,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group(
      {
        password_actual: ['', Validators.required],
        password_nueva: ['', [Validators.required, Validators.minLength(8)]],
        confirmar_password: ['', Validators.required],
      },
      { validators: passwordsCoinciden },
    );
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.authService.cambiarPassword(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Contraseña cambiada exitosamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al cambiar contraseña';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.loading = false;
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
