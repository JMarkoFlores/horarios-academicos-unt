import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, Ambiente } from '../../../core/interfaces/entities';

@Component({
  selector: 'app-ambiente-form',
  templateUrl: './ambiente-form.component.html',
  styleUrls: ['./ambiente-form.component.scss'],
})
export class AmbienteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  ambienteId!: number;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(15)]],
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      tipo: ['AULA', Validators.required],
      capacidad: [30, [Validators.required, Validators.min(1)]],
      piso: [null],
      pabellon: [''],
      equipamiento: [''],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.ambienteId = parseInt(id, 10);
      this.loadAmbiente();
    }
  }

  loadAmbiente(): void {
    this.loading = true;
    this.api.get<ApiResponse<Ambiente>>(`/ambientes/${this.ambienteId}`).subscribe({
      next: res => { this.form.patchValue(res.data); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const request = this.isEdit
      ? this.api.patch<ApiResponse<Ambiente>>(`/ambientes/${this.ambienteId}`, this.form.value)
      : this.api.post<ApiResponse<Ambiente>>('/ambientes', this.form.value);

    request.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Ambiente actualizado' : 'Ambiente creado', 'OK', { duration: 2000 });
        this.router.navigate(['/app/ambientes']);
      },
      error: () => { this.saving = false; },
    });
  }

  cancelar(): void { this.router.navigate(['/app/ambientes']); }
}
