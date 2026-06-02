import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { PeriodoAcademico } from '../interfaces/entities';

@Injectable({ providedIn: 'root' })
export class PeriodoService {
  private _periodo = new BehaviorSubject<string>('2026-I');
  private _periodosList = new BehaviorSubject<PeriodoAcademico[]>([]);
  private _periodoActivo = new BehaviorSubject<PeriodoAcademico | null>(null);

  constructor(private api: ApiService) {}

  cargarPeriodos(): void {
    this.api.get<any>('/periodos/todos').subscribe({
      next: (res) => {
        const list: PeriodoAcademico[] = res?.data ?? [];
        if (list.length > 0) {
          this._periodosList.next(list);

          const guardado = localStorage.getItem('periodo_seleccionado');
          const activo = list.find((p) => p.activo);

          if (guardado && list.some(p => p.codigo === guardado)) {
            this._periodo.next(guardado);
            this._periodoActivo.next(list.find((p) => p.codigo === guardado) ?? activo ?? list[0]);
          } else if (activo) {
            this._periodo.next(activo.codigo);
            this._periodoActivo.next(activo);
            localStorage.setItem('periodo_seleccionado', activo.codigo);
          } else {
            this._periodo.next(list[0].codigo);
            this._periodoActivo.next(list[0]);
            localStorage.setItem('periodo_seleccionado', list[0].codigo);
          }
        }
      },
      error: () => {
        // Fallback en caso de error
      }
    });
  }

  cambiarPeriodo(codigo: string): void {
    const periodos = this._periodosList.getValue();
    if (periodos.some(p => p.codigo === codigo)) {
      localStorage.setItem('periodo_seleccionado', codigo);
      this._periodo.next(codigo);
      this._periodoActivo.next(periodos.find(p => p.codigo === codigo) ?? null);
    }
  }

  get periodos(): PeriodoAcademico[] {
    return this._periodosList.getValue();
  }

  get periodos$() {
    return this._periodosList.asObservable();
  }

  get periodo(): string {
    return this._periodo.getValue();
  }

  set periodo(value: string) {
    this._periodo.next(value);
  }

  get periodo$() {
    return this._periodo.asObservable();
  }

  get periodoActivo(): PeriodoAcademico | null {
    return this._periodoActivo.getValue();
  }

  get periodoActivo$() {
    return this._periodoActivo.asObservable();
  }
}
