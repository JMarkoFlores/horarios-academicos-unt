import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { Docente, ApiResponse } from '../../../../core/interfaces/entities';

@Component({
  selector: 'app-detalle-docente-dialog',
  templateUrl: './detalle-docente-dialog.component.html',
  styleUrls: ['./detalle-docente-dialog.component.scss'],
})
export class DetalleDocenteDialogComponent implements OnInit {
  docente: Docente;
  carga: any = null;
  horarios: any[] = [];
  declaracion: any = null;
  loading = true;

  modalidades: Record<string, string> = {
    DEDICACION_EXCLUSIVA: 'Dedicación Exclusiva',
    TIEMPO_COMPLETO_40: 'Tiempo Completo (40h)',
    TIEMPO_PARCIAL_20: 'Tiempo Parcial 20h',
    TIEMPO_PARCIAL_12: 'Tiempo Parcial 12h',
    TIEMPO_PARCIAL_10: 'Tiempo Parcial 10h',
    TIEMPO_PARCIAL_8: 'Tiempo Parcial 8h',
  };

  horasMaximas: Record<string, number> = {
    DEDICACION_EXCLUSIVA: 40,
    TIEMPO_COMPLETO_40: 40,
    TIEMPO_PARCIAL_20: 20,
    TIEMPO_PARCIAL_12: 12,
    TIEMPO_PARCIAL_10: 10,
    TIEMPO_PARCIAL_8: 8,
  };

  constructor(
    public dialogRef: MatDialogRef<DetalleDocenteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Docente,
    private api: ApiService,
    private periodoService: PeriodoService,
  ) {
    this.docente = data;
  }

  ngOnInit(): void {
    this.loadCarga();
    this.loadHorarios();
    this.loadDeclaraciones();
  }

  loadCarga(): void {
    const periodo = this.periodoService.periodo;
    this.api.get<ApiResponse<any>>('/docentes/carga-desequilibrada', { periodo }).subscribe({
      next: (res) => {
        this.carga = (res.data || []).find((d: any) => d.docenteId === this.docente.id);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  loadHorarios(): void {
    const periodo = this.periodoService.periodo;
    this.api.get<ApiResponse<any[]>>(`/horarios/docente/${this.docente.id}`, { periodo }).subscribe({
      next: (res) => { this.horarios = res.data || []; },
      error: () => {},
    });
  }

  loadDeclaraciones(): void {
    const periodo = this.periodoService.periodo;
    this.api.get<ApiResponse<any>>(`/declaraciones/docentes/${this.docente.id}/declaracion`, { periodo }).subscribe({
      next: (res) => { this.declaracion = res.data || null; },
      error: () => {},
    });
  }

  getMaxHoras(): number {
    return this.horasMaximas[this.docente.modalidad || ''] || 0;
  }

  getHorasActuales(): number {
    return this.carga?.distribucion?.totalHoras || 0;
  }

  getCumplimiento(): number {
    const max = this.getMaxHoras();
    return max > 0 ? Math.round((this.getHorasActuales() / max) * 100) : 0;
  }

  getCumplimientoColor(): string {
    const pct = this.getCumplimiento();
    if (pct >= 100) return '#10b981';
    if (pct >= 80) return '#3b82f6';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  }

  close(): void {
    this.dialogRef.close();
  }
}
