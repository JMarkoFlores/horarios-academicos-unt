import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';
import {
  Curso,
  Ambiente,
  ApiResponse,
} from '../../../../core/interfaces/entities';

export interface AsignarAmbientesData {
  curso: Curso;
  tipo_clase: 'TEORIA' | 'LABORATORIO';
}

@Component({
  selector: 'app-asignar-ambientes-dialog',
  templateUrl: './asignar-ambientes-dialog.component.html',
  styleUrls: ['./asignar-ambientes-dialog.component.scss'],
})
export class AsignarAmbientesDialogComponent implements OnInit {
  ambientesDisponibles: Ambiente[] = [];
  seleccionados: number[] = [];
  loading = false;
  guardando = false;

  constructor(
    private dialogRef: MatDialogRef<AsignarAmbientesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarAmbientesData,
    private api: ApiService,
    private notif: NotifToastService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    const tiposReq = this.data.tipo_clase === 'TEORIA' 
      ? ['AULA', 'TALLER'] 
      : ['LABORATORIO'];

    this.api
      .get<ApiResponse<any>>('/ambientes', { limit: 100, activo: 'true' })
      .subscribe({
        next: (r) => {
          const all = r.data?.items ?? r.data ?? [];
          this.ambientesDisponibles = all.filter(
            (a: Ambiente) => tiposReq.includes(a.tipo),
          );
          this.cargarAsignados();
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private cargarAsignados(): void {
    this.api
      .get<ApiResponse<any>>(`/cursos/${this.data.curso.id}/ambientes`, {
        tipo_clase: this.data.tipo_clase,
      })
      .subscribe({
        next: (r) => {
          const asignados = r.data?.items ?? r.data ?? [];
          this.seleccionados = asignados.map((a: Ambiente) => a.id);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  get titulo(): string {
    return this.data.tipo_clase === 'TEORIA'
      ? 'Ambientes de Teoría'
      : 'Ambientes de Laboratorio';
  }

  toggleSeleccion(id: number): void {
    const idx = this.seleccionados.indexOf(id);
    if (idx >= 0) {
      this.seleccionados.splice(idx, 1);
    } else {
      this.seleccionados.push(id);
    }
  }

  isSelected(id: number): boolean {
    return this.seleccionados.includes(id);
  }

  guardar(): void {
    this.guardando = true;
    this.api
      .post<ApiResponse<any>>(`/cursos/${this.data.curso.id}/ambientes`, {
        ambiente_ids: this.seleccionados,
        tipo_clase: this.data.tipo_clase,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.notif.success('Ambientes asignados correctamente');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.guardando = false;
          const msg = err?.error?.message ?? 'Error al asignar ambientes';
          this.notif.error(msg);
        },
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
