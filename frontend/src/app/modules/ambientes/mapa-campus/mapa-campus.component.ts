import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { AmbienteMapa, ApiResponse } from '../../../core/interfaces/entities';

type LegendItem = {
  label: string;
  color: string;
};

const COLOR_PALETTE = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
  '#eab308',
  '#0ea5e9',
];

const DEFAULT_VIEWBOX = '0 0 100 100';

@Component({
  selector: 'app-mapa-campus',
  templateUrl: './mapa-campus.component.html',
  styleUrls: ['./mapa-campus.component.scss'],
})
export class MapaCampusComponent implements OnInit {
  loading = false;
  ambientes: AmbienteMapa[] = [];
  ambientesConUbicacion: AmbienteMapa[] = [];
  ambientesSinUbicacion: AmbienteMapa[] = [];
  filteredConUbicacion: AmbienteMapa[] = [];
  filteredSinUbicacion: AmbienteMapa[] = [];
  mapViewBox = DEFAULT_VIEWBOX;
  pointRadius = 3;
  selectedAmbiente: AmbienteMapa | null = null;
  pabellonOptions: Array<{ value: string; label: string }> = [];
  pisoOptions: Array<{ value: string; label: string }> = [];
  selectedPabellon = 'todos';
  selectedPiso = 'todos';
  legendItems: LegendItem[] = [];
  private buildingColors: Record<string, string> = {};

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadMapa();
  }

  loadMapa(): void {
    this.loading = true;
    this.api.get<ApiResponse<AmbienteMapa[]>>('/ambientes/mapa').subscribe({
      next: (res) => {
        this.ambientes = (res.data ?? []).map((ambiente) => ({
          ...ambiente,
          coordX: ambiente.coordX === null ? null : Number(ambiente.coordX),
          coordY: ambiente.coordY === null ? null : Number(ambiente.coordY),
        }));
        this.processData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al cargar el mapa del campus', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  selectAmbiente(ambiente: AmbienteMapa): void {
    this.selectedAmbiente = ambiente;
  }

  clearSelection(): void {
    this.selectedAmbiente = null;
  }

  getTooltip(ambiente: AmbienteMapa): string {
    return `Ambiente: ${ambiente.nombre}\nEdificio: ${this.getEdificioLabel(ambiente)}\nCapacidad: ${ambiente.capacidad}`;
  }

  getEdificioColor(ambiente: AmbienteMapa): string {
    const label = this.getEdificioLabel(ambiente);
    return this.buildingColors[label] ?? COLOR_PALETTE[0];
  }

  getEdificioLabel(ambiente: AmbienteMapa): string {
    const label = (ambiente.edificio ?? ambiente.pabellon ?? '').trim();
    return label.length ? label : 'Sin edificio';
  }

  getPabellonLabel(ambiente: AmbienteMapa): string {
    const label = (ambiente.pabellon ?? ambiente.edificio ?? '').trim();
    return label.length ? label : 'Sin pabellón';
  }

  getPisoLabel(ambiente: AmbienteMapa): string {
    if (ambiente.piso === null || ambiente.piso === undefined) {
      return 'Sin piso';
    }
    return `Piso ${ambiente.piso}`;
  }

  private processData(): void {
    this.ambientesConUbicacion = this.ambientes.filter(
      (ambiente) =>
        ambiente.coordX !== null &&
        ambiente.coordX !== undefined &&
        ambiente.coordY !== null &&
        ambiente.coordY !== undefined,
    );
    this.ambientesSinUbicacion = this.ambientes.filter(
      (ambiente) =>
        ambiente.coordX === null ||
        ambiente.coordY === null ||
        ambiente.coordX === undefined ||
        ambiente.coordY === undefined,
    );
    this.buildFilterOptions();
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredConUbicacion = this.ambientesConUbicacion.filter((ambiente) =>
      this.matchesFilters(ambiente),
    );
    this.filteredSinUbicacion = this.ambientesSinUbicacion.filter((ambiente) =>
      this.matchesFilters(ambiente),
    );
    if (
      this.selectedAmbiente &&
      !this.filteredConUbicacion.some((a) => a.id === this.selectedAmbiente?.id) &&
      !this.filteredSinUbicacion.some((a) => a.id === this.selectedAmbiente?.id)
    ) {
      this.selectedAmbiente = null;
    }
    this.updateViewBox();
    this.updateLegend();
  }

  private updateViewBox(): void {
    if (this.filteredConUbicacion.length === 0) {
      this.mapViewBox = DEFAULT_VIEWBOX;
      this.pointRadius = 3;
      return;
    }
    const xs = this.filteredConUbicacion.map((a) => Number(a.coordX ?? 0));
    const ys = this.filteredConUbicacion.map((a) => Number(a.coordY ?? 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const span = Math.max(spanX, spanY);
    const padding = Math.max(span * 0.18, 1);
    const width = spanX + padding * 2;
    const height = spanY + padding * 2;
    this.mapViewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
    this.pointRadius = Math.max(2.4, Math.min(6, span / 35));
  }

  private updateLegend(): void {
    const edificios = Array.from(
      new Set(this.filteredConUbicacion.map((a) => this.getEdificioLabel(a))),
    ).sort((a, b) => a.localeCompare(b, 'es'));
    this.buildingColors = {};
    edificios.forEach((edificio, index) => {
      this.buildingColors[edificio] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    this.legendItems = edificios.map((label) => ({
      label,
      color: this.buildingColors[label],
    }));
  }

  private matchesFilters(ambiente: AmbienteMapa): boolean {
    const pisoValue = this.normalizePiso(ambiente);
    const pabellonValue = this.normalizePabellon(ambiente);
    if (this.selectedPiso !== 'todos' && pisoValue !== this.selectedPiso) {
      return false;
    }
    if (this.selectedPabellon !== 'todos' && pabellonValue !== this.selectedPabellon) {
      return false;
    }
    return true;
  }

  private buildFilterOptions(): void {
    const pisos = new Set<string>();
    const pabellones = new Set<string>();
    this.ambientes.forEach((ambiente) => {
      pisos.add(this.normalizePiso(ambiente));
      pabellones.add(this.normalizePabellon(ambiente));
    });
    const pisoValues = Array.from(pisos).sort((a, b) => {
      if (a === 'sin') return 1;
      if (b === 'sin') return -1;
      return a.localeCompare(b, 'es', { numeric: true });
    });
    const pabellonValues = Array.from(pabellones).sort((a, b) => {
      if (a === 'sin') return 1;
      if (b === 'sin') return -1;
      return a.localeCompare(b, 'es');
    });
    this.pisoOptions = pisoValues.map((value) => ({
      value,
      label: value === 'sin' ? 'Sin piso' : `Piso ${value}`,
    }));
    this.pabellonOptions = pabellonValues.map((value) => ({
      value,
      label: value === 'sin' ? 'Sin pabellón' : value,
    }));
  }

  private normalizePiso(ambiente: AmbienteMapa): string {
    if (ambiente.piso === null || ambiente.piso === undefined) {
      return 'sin';
    }
    return String(ambiente.piso);
  }

  private normalizePabellon(ambiente: AmbienteMapa): string {
    const label = (ambiente.pabellon ?? ambiente.edificio ?? '').trim();
    return label.length ? label : 'sin';
  }
}
