import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Docente, Curso, Ambiente } from '../../../core/interfaces/entities';

export interface CeldaDialogData {
  dia: number;
  hora: string;
  docente: Docente;
  cursos: Curso[];
  ambientes: Ambiente[];
}

@Component({
  selector: 'app-celda-dialog',
  templateUrl: './celda-dialog.component.html',
})
export class CeldaDialogComponent {
  form: FormGroup;
  diaLabels = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  tiposClase = [
    { valor: 'TEORIA', label: 'Teoría' },
    { valor: 'LABORATORIO', label: 'Laboratorio' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CeldaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CeldaDialogData,
  ) {
    this.form = this.fb.group({
      cursoId: [null, Validators.required],
      tipoClase: ['TEORIA', Validators.required],
      ambienteId: [null, Validators.required],
    });
  }

  confirmar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.dialogRef.close(this.form.value);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
