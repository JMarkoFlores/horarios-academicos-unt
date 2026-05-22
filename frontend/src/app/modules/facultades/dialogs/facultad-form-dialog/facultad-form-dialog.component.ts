import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacultadesService, Facultad } from '../../../../core/services/facultades.service';
import { UsuariosService, UsuarioItem } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-facultad-form-dialog',
  templateUrl: './facultad-form-dialog.component.html',
})
export class FacultadFormDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  usuarios: UsuarioItem[] = [];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private service: FacultadesService,
    private usuariosService: UsuariosService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<FacultadFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { facultad?: Facultad },
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data?.facultad;
    const f = this.data?.facultad;
    this.form = this.fb.group({
      codigo: [f?.codigo ?? '', [Validators.required, Validators.maxLength(20)]],
      nombre: [f?.nombre ?? '', [Validators.required, Validators.maxLength(200)]],
      descripcion: [f?.descripcion ?? '', Validators.maxLength(500)],
      coordinador_id: [f?.coordinador_id ?? null],
      activo: [f?.activo ?? true],
    });
    this.usuariosService.listar().subscribe({ next: (res) => (this.usuarios = res.data) });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const payload = this.form.value;
    const obs = this.isEdit
      ? this.service.actualizarFacultad(this.data.facultad!.id, payload)
      : this.service.crearFacultad(payload);

    obs.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Facultad actualizada' : 'Facultad creada', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
