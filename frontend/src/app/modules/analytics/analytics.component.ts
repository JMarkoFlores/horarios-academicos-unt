import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  loading = true;
  kpis: any = {};
  suggestions: any[] = [];
  
  // Saturation Chart
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // Utilization Chart
  public doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    const p = this.periodoService.periodo;

    forkJoin({
      kpis: this.api.get<any>('/analytics/kpis', { periodo: p }),
      saturation: this.api.get<any[]>('/analytics/saturation', { periodo: p }),
      utilization: this.api.get<any[]>('/analytics/utilization', { periodo: p }),
      suggestions: this.api.get<any[]>('/analytics/suggestions', { periodo: p })
    }).subscribe({
      next: (res: any) => {
        this.kpis = res.kpis.data;
        this.suggestions = res.suggestions.data;
        
        const saturationData = res.saturation.data || [];
        const utilizationData = res.utilization.data || [];

        // Prepare Saturation Chart
        this.barChartData = {
          labels: saturationData.map((s: any) => s.nombre),
          datasets: [{ 
            data: saturationData.map((s: any) => s.total_horas), 
            label: 'Horas Asignadas',
            backgroundColor: 'rgba(63, 81, 181, 0.7)',
            borderColor: 'rgba(63, 81, 181, 1)',
            borderWidth: 1
          }]
        };

        // Prepare Utilization Chart
        this.doughnutChartData = {
          labels: ['En Uso', 'Disponible'],
          datasets: [{
            data: [
              utilizationData.reduce((a: any, b: any) => a + Number(b.horas_usadas), 0),
              utilizationData.length * 75 - utilizationData.reduce((a: any, b: any) => a + Number(b.horas_usadas), 0)
            ],
            backgroundColor: ['#4caf50', '#eeeeee']
          }]
        };

        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
