import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { ApiResponse, HorarioAsignado } from '../../core/interfaces/entities';

@Component({
  selector: 'app-docente-horario',
  templateUrl: './docente-horario.component.html',
  styleUrls: ['./docente-horario.component.scss']
})
export class DocenteHorarioComponent implements OnInit {
  horarios: HorarioAsignado[] = [];
  loading = false;
  dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService
  ) {}

  ngOnInit(): void {
    this.cargarHorario();
  }

  cargarHorario(): void {
    if (!this.periodoService.periodo) return;
    this.loading = true;
    this.api.get<ApiResponse<HorarioAsignado[]>>('/horarios/mis-horarios', { 
      periodo: this.periodoService.periodo 
    }).subscribe({
      next: (r) => {
        this.horarios = r.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
