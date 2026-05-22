import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { DiasActivosService } from '../../../../core/services/dias-activos.service';
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
export class VerDisponibilidadDialogComponent implements OnInit, OnDestroy {
  dias: string[] = [];
  diasNum: number[] = [];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);

  ocupados: SlotOcupado[] = [];
  loading = false;
  totalHoras = 0;
  private periodSub?: Subscription;

  constructor(
    private dialogRef: MatDialogRef<VerDisponibilidadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public ambiente: Ambiente,
    private api: ApiService,
    private notif: NotifToastService,
    public periodoService: PeriodoService,
    private diasActivosService: DiasActivosService,
  ) {}

  ngOnInit(): void {
    this.diasActivosService.cargar().subscribe(() => {
      this.dias = this.diasActivosService.nombres;
      this.diasNum = this.diasActivosService.numeros;
    });
    this.dias = this.diasActivosService.nombres;
    this.diasNum = this.diasActivosService.numeros;
    this.cargarDisponibilidad();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarDisponibilidad();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
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
          this.totalHoras = this.calcularTotalHoras(this.ocupados);
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          const msg = err?.error?.message ?? 'Error al cargar disponibilidad';
          this.notif.error(msg);
        },
      });
  }

  getSlot(dia: number, hora: number): SlotOcupado | null {
    return (
      this.ocupados.find((o) => {
        if (o.dia_semana !== dia) return false;
        const hi = this.horaToDecimal(o.hora_inicio);
        const hf = this.horaToDecimal(o.hora_fin);
        return hora >= hi && hora < hf;
      }) ?? null
    );
  }

  private horaToDecimal(hora: string): number {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  cls(dia: number, hora: number): string {
    const s = this.getSlot(dia, hora);
    if (!s) return 'celda-vacia';
    return s.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-ocupado';
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  private calcularTotalHoras(slots: SlotOcupado[]): number {
    let total = 0;
    for (const s of slots) {
      if (s.hora_inicio && s.hora_fin) {
        const [hi, mi] = s.hora_inicio.split(':').map(Number);
        const [hf, mf] = s.hora_fin.split(':').map(Number);
        total += hf + mf / 60 - (hi + mi / 60);
      }
    }
    return Math.round(total * 10) / 10;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
