import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacultadesService, Departamento, Escuela } from '../../../../core/services/facultades.service';
import { UsuariosService, UsuarioItem } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-departamento-form-dialog',
  templateUrl: './departamento-form-dialog.component.html',
})
export class DepartamentoFormDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  usuarios: UsuarioItem[] = [];
  escuelas: Escuela[] = [];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private service: FacultadesService,
    private usuariosService: UsuariosService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<DepartamentoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { departamento?: Departamento; escuela_id?: number },
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data?.departamento;
    const d = this.data?.departamento;
    this.form = this.fb.group({
      codigo: [d?.codigo ?? '', [Validators.required, Validators.maxLength(20)]],
      nombre: [d?.nombre ?? '', [Validators.required, Validators.maxLength(200)]],
      descripcion: [d?.descripcion ?? '', Validators.maxLength(500)],
      escuela_id: [d?.escuela_id ?? this.data?.escuela_id ?? null, Validators.required],
      coordinador_id: [d?.coordinador_id ?? null],
      activo: [d?.activo ?? true],
    });
    this.usuariosService.listar().subscribe({ next: (res) => (this.usuarios = res.data) });
    this.service.listarEscuelas().subscribe({ next: (res) => (this.escuelas = res.data) });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const obs = this.isEdit
      ? this.service.actualizarDepartamento(this.data.departamento!.id, this.form.value)
      : this.service.crearDepartamento(this.form.value);

    obs.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Departamento actualizado' : 'Departamento creado', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
