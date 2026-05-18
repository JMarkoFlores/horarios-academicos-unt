import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { Ambiente, ApiResponse } from '../../../../core/interfaces/entities';

interface SlotOcupado {
  id: number;
  dia_semana: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_clase: string;
  estado: string;
  docente: string | null;
  curso: string | null;
  grupo: string | null;
}

@Component({
  selector: 'app-ver-disponibilidad-dialog',
  templateUrl: './ver-disponibilidad-dialog.component.html',
  styleUrls: ['./ver-disponibilidad-dialog.component.scss'],
})
export class VerDisponibilidadDialogComponent implements OnInit {
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  diasNum = [1, 2, 3, 4, 5];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  ocupados: SlotOcupado[] = [];
  loading = false;
  totalHoras = 0;

  constructor(
    private dialogRef: MatDialogRef<VerDisponibilidadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public ambiente: Ambiente,
    private api: ApiService,
    private notif: NotifToastService,
    public periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.cargarDisponibilidad();
  }

  cargarDisponibilidad(): void {
    this.loading = true;
    this.api
      .get<ApiResponse<any>>(`/ambientes/${this.ambiente.id}/disponibilidad`, {
        periodo: this.periodoService.periodo,
        page: 1,
        limit: 200,
      })
      .subscribe({
        next: (r) => {
          this.ocupados = r.data?.data ?? r.data ?? [];
          this.totalHoras = this.ocupados.length;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err?.error?.message ?? 'Error al cargar disponibilidad';
          this.notif.error(msg);
        },
      });
  }

  private normalizeHora(hora: string | undefined): string {
    if (!hora) return '';
    return hora.length >= 5 ? hora.substring(0, 5) : hora;
  }

  getSlot(dia: number, hora: number): SlotOcupado | null {
    const h = this.fmtH(hora);
    return (
      this.ocupados.find(
        (o) => o.dia_semana === dia && this.normalizeHora(o.hora_inicio) === h,
      ) ?? null
    );
  }

  cls(dia: number, hora: number): string {
    const s = this.getSlot(dia, hora);
    if (!s) return 'celda-vacia';
    return s.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-ocupado';
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
