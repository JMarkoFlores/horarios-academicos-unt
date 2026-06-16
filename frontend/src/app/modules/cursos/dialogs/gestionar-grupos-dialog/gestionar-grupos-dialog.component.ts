import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';
import { Curso, Grupo, ApiResponse } from '../../../../core/interfaces/entities';
import { ConfirmDialogComponent } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

export interface GestionarGruposData {
  curso: Curso;
}

export interface GrupoPorTipo {
  tipo: 'TEORIA' | 'PRACTICA' | 'LABORATORIO';
  label: string;
  icon: string;
  color: string;
  grupos: Grupo[];
}

@Component({
  selector: 'app-gestionar-grupos-dialog',
  templateUrl: './gestionar-grupos-dialog.component.html',
  styleUrls: ['./gestionar-grupos-dialog.component.scss'],
})
export class GestionarGruposDialogComponent implements OnInit {
  form!: FormGroup;
  grupos: Grupo[] = [];
  gruposPorTipo: GrupoPorTipo[] = [];
  loading = false;
  guardando = false;
  periodoId: number | null = null;
  editingGroupId: number | null = null;

  readonly tiposDisponibles = [
    { value: 'TEORIA', label: 'Teoría', icon: 'menu_book', color: 'var(--color-primary)' },
    { value: 'PRACTICA', label: 'Práctica', icon: 'build', color: 'var(--color-warning)' },
    { value: 'LABORATORIO', label: 'Laboratorio', icon: 'biotech', color: 'var(--color-accent)' },
  ];

  constructor(
    private dialogRef: MatDialogRef<GestionarGruposDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GestionarGruposData,
    private fb: FormBuilder,
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPeriodoActivo();
  }

  initForm(): void {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      tipo: ['TEORIA', Validators.required],
      ciclo: [this.data.curso.ciclo, [Validators.required, Validators.min(1), Validators.max(12)]],
      cupo_maximo: [40, [Validators.required, Validators.min(1), Validators.max(500)]],
    });

    this.form.get('tipo')?.valueChanges.subscribe((tipo: string) => {
      const defaults: Record<string, { cupo: number; codigo: string; nombre: string }> = {
        TEORIA: { cupo: 40, codigo: 'T1', nombre: 'Teoría 1' },
        PRACTICA: { cupo: 40, codigo: 'P1', nombre: 'Práctica 1' },
        LABORATORIO: { cupo: 30, codigo: 'L1', nombre: 'Laboratorio 1' },
      };
      if (!this.editingGroupId) {
        const d = defaults[tipo];
        this.form.patchValue({
          cupo_maximo: d.cupo,
          codigo: d.codigo,
          nombre: d.nombre,
        });
      }
    });
  }

  loadPeriodoActivo(): void {
    this.loading = true;
    this.api.get<ApiResponse<any>>('/periodos', { limit: 100 }).subscribe({
      next: (res) => {
        const list = res.data?.items ?? res.data ?? [];
        const active = list.find((p: any) => p.codigo === this.periodoService.periodo);
        if (active) {
          this.periodoId = active.id;
          this.cargarGrupos();
        } else {
          this.notif.error('No se pudo encontrar el período académico activo');
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  cargarGrupos(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<any>>('/grupos', {
        curso_id: this.data.curso.id,
        periodo: this.periodoService.periodo,
        limit: 100,
      })
      .subscribe({
        next: (r: any) => {
          this.grupos = r?.data?.items ?? r?.data ?? [];
          this.organizarPorTipo();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private organizarPorTipo(): void {
    const map = new Map<string, Grupo[]>();
    for (const g of this.grupos) {
      const t = g.tipo || 'TEORIA';
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(g);
    }
    this.gruposPorTipo = this.tiposDisponibles
      .map((td) => ({
        tipo: td.value as 'TEORIA' | 'PRACTICA' | 'LABORATORIO',
        label: td.label,
        icon: td.icon,
        color: td.color,
        grupos: (map.get(td.value) || []).sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }))
      .filter((s) => s.grupos.length > 0);
  }

  guardar(): void {
    if (this.form.invalid || !this.periodoId) return;

    this.guardando = true;
    const body = {
      ...this.form.value,
      curso_id: this.data.curso.id,
      periodo_academico_id: this.periodoId,
    };

    if (this.editingGroupId) {
      this.api.patch<ApiResponse<any>>(`/grupos/${this.editingGroupId}`, body).subscribe({
        next: () => {
          this.guardando = false;
          this.notif.success('Grupo actualizado correctamente');
          this.cancelarEdicion();
          this.cargarGrupos();
        },
        error: (err) => {
          this.guardando = false;
          const msg = err?.error?.message ?? 'Error al actualizar grupo';
          this.notif.error(msg);
        },
      });
    } else {
      this.api.post<ApiResponse<any>>('/grupos', body).subscribe({
        next: () => {
          this.guardando = false;
          this.notif.success('Grupo creado correctamente');
          this.form.get('codigo')?.reset();
          this.form.get('nombre')?.reset();
          this.form.get('tipo')?.setValue('TEORIA');
          this.cargarGrupos();
        },
        error: (err) => {
          this.guardando = false;
          const msg = err?.error?.message ?? 'Error al crear grupo';
          this.notif.error(msg);
        },
      });
    }
  }

  activarEdicion(grupo: Grupo): void {
    this.editingGroupId = grupo.id;
    this.form.patchValue({
      codigo: grupo.codigo,
      nombre: grupo.nombre,
      tipo: grupo.tipo || 'TEORIA',
      ciclo: grupo.ciclo,
      cupo_maximo: grupo.cupo_maximo,
    });
  }

  cancelarEdicion(): void {
    this.editingGroupId = null;
    this.form.reset({
      codigo: '',
      nombre: '',
      tipo: 'TEORIA',
      ciclo: this.data.curso.ciclo,
      cupo_maximo: 40,
    });
  }

  eliminar(grupo: Grupo): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Grupo',
        message: `¿Eliminar el grupo "${grupo.codigo}"?`,
        detail: `Sección: ${grupo.nombre}. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.delete<ApiResponse<any>>(`/grupos/${grupo.id}`).subscribe({
        next: () => {
          this.notif.success('Grupo eliminado correctamente');
          this.cargarGrupos();
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Error al eliminar grupo';
          this.notif.error(msg);
        },
      });
    });
  }

  cerrar(): void {
    this.dialogRef.close(true);
  }
}