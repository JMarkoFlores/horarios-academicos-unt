import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import {
  ApiResponse,
  CampañaVentanas,
  PeriodoAcademico,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-campaigns-list',
  templateUrl: './campaigns-list.component.html',
  styleUrls: ['./campaigns-list.component.scss'],
})
export class CampaignsListComponent implements OnInit {
  dataSource: CampañaVentanas[] = [];
  periodos: PeriodoAcademico[] = [];
  loading = false;
  selectedPeriodoId?: number;
  displayedColumns = [
    'nombre',
    'descripcion',
    'periodo',
    'estado',
    'fecha_inicio',
    'fecha_fin',
    'acciones',
  ];

  estadoLabels: Record<string, string> = {
    BORRADOR: 'Borrador',
    GENERADO: 'Generado',
    PUBLICADO: 'Publicado',
    EN_CURSO: 'En curso',
    CERRADO: 'Cerrado',
  };

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.loadPeriodos();
    this.loadCampaigns();
  }

  loadPeriodos(): void {
    this.periodoService.periodos$.subscribe((periodos) => {
      this.periodos = periodos;
      if (periodos.length > 0 && !this.selectedPeriodoId) {
        this.selectedPeriodoId = periodos[0].id;
      }
    });
  }

  loadCampaigns(): void {
    this.loading = true;
    let params: Record<string, string | number> | undefined;
    if (this.selectedPeriodoId) {
      params = { periodoId: this.selectedPeriodoId };
    }
    this.api.get<ApiResponse<CampañaVentanas[]>>('/campanas-ventanas', params).subscribe({
      next: (res) => {
        this.dataSource = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading campaigns:', err);
        this.snackBar.open('Error al cargar campañas', 'OK', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  onPeriodoChange(): void {
    this.loadCampaigns();
  }

  generarVentanas(campaign: CampañaVentanas): void {
    if (!confirm(`¿Generar ventanas para la campaña "${campaign.nombre}"?`)) return;
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/campanas-ventanas/${campaign.id}/generar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Ventanas generadas exitosamente', 'OK', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error generating windows:', err);
        this.snackBar.open(
          err.error?.message || 'Error al generar ventanas',
          'OK',
          { duration: 5000 }
        );
        this.loading = false;
      },
    });
  }

  publicar(campaign: CampañaVentanas): void {
    if (!confirm(`¿Publicar la campaña "${campaign.nombre}"?`)) return;
    this.loading = true;
    this.api.post<ApiResponse<CampañaVentanas>>(`/campanas-ventanas/${campaign.id}/publicar`, {}).subscribe({
      next: () => {
        this.snackBar.open('Campaña publicada exitosamente', 'OK', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error publishing campaign:', err);
        this.snackBar.open(
          err.error?.message || 'Error al publicar campaña',
          'OK',
          { duration: 5000 }
        );
        this.loading = false;
      },
    });
  }

  eliminarVentanas(campaign: CampañaVentanas): void {
    if (!confirm(`¿Eliminar todas las ventanas de la campaña "${campaign.nombre}"?`)) return;
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/campanas-ventanas/${campaign.id}/eliminar-ventanas`, {}).subscribe({
      next: () => {
        this.snackBar.open('Ventanas eliminadas exitosamente', 'OK', { duration: 3000 });
        this.loadCampaigns();
      },
      error: (err) => {
        console.error('Error deleting windows:', err);
        this.snackBar.open(
          err.error?.message || 'Error al eliminar ventanas',
          'OK',
          { duration: 5000 }
        );
        this.loading = false;
      },
    });
  }
}
