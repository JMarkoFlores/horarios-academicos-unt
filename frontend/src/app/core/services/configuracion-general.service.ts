import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../interfaces/entities';

export interface ConfiguracionGeneral {
  id: number;
  nombre_institucional: string;
  nombre_facultad: string;
  logo_url: string;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
}

const DEFAULTS: ConfiguracionGeneral = {
  id: 0,
  nombre_institucional: 'Horarios UNT',
  nombre_facultad: 'Ingeniería de Sistemas',
  logo_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Universidad_Nacional_de_Trujillo_-_Per%C3%BA_vector_logo.png',
  color_primario: '#6366f1',
  color_secundario: '#4338ca',
  color_acento: '#8b5cf6',
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionGeneralService {
  private _config$ = new BehaviorSubject<ConfiguracionGeneral>(DEFAULTS);
  readonly config$ = this._config$.asObservable();

  get config(): ConfiguracionGeneral {
    return this._config$.getValue();
  }

  constructor(private api: ApiService) {}

  cargar(): void {
    this.api
      .get<ApiResponse<ConfiguracionGeneral>>('/configuracion/general')
      .subscribe({
        next: (r) => {
          if (r.data) {
            this.aplicar(r.data);
          }
        },
        error: () => {
          /* Sin configuración guardada aún, usar defaults */
        },
      });
  }

  aplicar(config: ConfiguracionGeneral): void {
    const merged = { ...DEFAULTS, ...config };
    this._config$.next(merged);
    this._setCssVars(merged);
  }

  private _setCssVars(c: ConfiguracionGeneral): void {
    const root = document.documentElement.style;

    root.setProperty('--color-primary-500', c.color_primario);
    root.setProperty('--color-primary', c.color_primario);
    root.setProperty('--color-primary-hover', c.color_primario);
    root.setProperty('--color-primary-600', this._darken(c.color_primario, 10));
    root.setProperty('--color-primary-700', c.color_secundario);
    root.setProperty('--color-primary-800', this._darken(c.color_secundario, 10));
    root.setProperty(
      '--color-primary-light',
      this._hexToRgba(c.color_primario, 0.1),
    );

    root.setProperty('--color-accent-500', c.color_acento);
    root.setProperty('--color-accent', c.color_acento);
    root.setProperty('--color-accent-600', this._darken(c.color_acento, 10));
  }

  /** Oscurece un color hex en `amount` puntos (0-255) */
  private _darken(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  /** Convierte hex a rgba con opacidad */
  private _hexToRgba(hex: string, alpha: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
