import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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

  private codigoExistente = false;
  private codigoCheckTimer: any = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      tipo: ['AULA', Validators.required],
      capacidad: [null, [Validators.required, Validators.min(1), Validators.max(500)]],
      piso: [null, [Validators.min(-2), Validators.max(20)]],
      pabellon: ['', Validators.maxLength(50)],
      sede: ['', Validators.maxLength(100)],
      equipamiento: [''],
      estado: ['ACTIVO', Validators.required],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.ambienteId = parseInt(id, 10);
      this.loadAmbiente();
    }

    // Validación de código duplicado en tiempo real (debounce 400ms)
    this.form.get('codigo')?.valueChanges.subscribe((value: string) => {
      if (this.codigoCheckTimer) clearTimeout(this.codigoCheckTimer);
      this.codigoExistente = false;
      if (!value || value.length < 2) return;
      this.codigoCheckTimer = setTimeout(() => this.verificarCodigo(value), 400);
    });
  }

  private verificarCodigo(codigo: string): void {
    if (this.isEdit) return; // Skip for edit (backend handles it)
    this.api.get<ApiResponse<any>>('/ambientes', { busqueda: codigo, limit: 1 }).subscribe({
      next: (res) => {
        const items = res.data?.items ?? [];
        const duplicado = items.some((a: Ambiente) => a.codigo.toUpperCase() === codigo.toUpperCase());
        if (duplicado) {
          this.codigoExistente = true;
          this.form.get('codigo')?.setErrors({ duplicado: true });
        }
      },
    });
  }

  loadAmbiente(): void {
    this.loading = true;
    this.api.get<ApiResponse<Ambiente>>(`/ambientes/${this.ambienteId}`).subscribe({
      next: res => {
        const data = res.data;
        this.form.patchValue(data);
        this.loading = false;
      },
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
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'Error al guardar el ambiente';
        const field = err?.error?.field;
        if (field === 'codigo') {
          this.form.get('codigo')?.setErrors({ backend: msg });
        } else {
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      },
    });
  }

  cancelar(): void { this.router.navigate(['/app/ambientes']); }

  // Equipment chips helpers
  get equipamientoChips(): string[] {
    const val = this.form.get('equipamiento')?.value ?? '';
    if (!val) return [];
    return val.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
  }

  addEquipamiento(chip: string): void {
    if (!chip.trim()) return;
    const current = this.equipamientoChips;
    if (!current.includes(chip.trim())) {
      const newVal = current.length > 0 ? current.join(', ') + ', ' + chip.trim() : chip.trim();
      this.form.get('equipamiento')?.setValue(newVal);
    }
  }

  removeEquipamiento(chip: string): void {
    const current = this.equipamientoChips.filter((c: string) => c !== chip);
    this.form.get('equipamiento')?.setValue(current.join(', '));
  }
}
