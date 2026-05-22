import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacultadesService, Escuela, Facultad } from '../../../../core/services/facultades.service';
import { UsuariosService, UsuarioItem } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-escuela-form-dialog',
  templateUrl: './escuela-form-dialog.component.html',
})
export class EscuelaFormDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  usuarios: UsuarioItem[] = [];
  facultades: Facultad[] = [];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private service: FacultadesService,
    private usuariosService: UsuariosService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<EscuelaFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { escuela?: Escuela; facultad_id?: number },
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data?.escuela;
    const e = this.data?.escuela;
    this.form = this.fb.group({
      codigo: [e?.codigo ?? '', [Validators.required, Validators.maxLength(20)]],
      nombre: [e?.nombre ?? '', [Validators.required, Validators.maxLength(200)]],
      descripcion: [e?.descripcion ?? '', Validators.maxLength(500)],
      facultad_id: [e?.facultad_id ?? this.data?.facultad_id ?? null, Validators.required],
      coordinador_id: [e?.coordinador_id ?? null],
      activo: [e?.activo ?? true],
    });
    this.usuariosService.listar().subscribe({ next: (res) => (this.usuarios = res.data) });
    this.service.listarFacultades().subscribe({ next: (res) => (this.facultades = res.data) });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const obs = this.isEdit
      ? this.service.actualizarEscuela(this.data.escuela!.id, this.form.value)
      : this.service.crearEscuela(this.form.value);

    obs.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Escuela actualizada' : 'Escuela creada', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
