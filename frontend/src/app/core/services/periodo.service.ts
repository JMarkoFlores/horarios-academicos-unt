import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PeriodoService {
  private _periodo = new BehaviorSubject<string>('2026-I');
  private _periodosList = new BehaviorSubject<string[]>(['2025-II', '2026-I', '2026-II', '2027-I']);
  private _periodoActivo = new BehaviorSubject<any>(null);

  constructor(private api: ApiService) {}

  cargarPeriodos(): void {
    this.api.get<any>('/periodos/todos').subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        if (list.length > 0) {
          const codigos = list.map((p: any) => p.codigo);
          this._periodosList.next(codigos);

          const guardado = localStorage.getItem('periodo_seleccionado');
          const activo = list.find((p: any) => p.activo);

          if (guardado && codigos.includes(guardado)) {
            this._periodo.next(guardado);
            this._periodoActivo.next(list.find((p: any) => p.codigo === guardado) ?? activo ?? list[0]);
          } else if (activo) {
            this._periodo.next(activo.codigo);
            this._periodoActivo.next(activo);
            localStorage.setItem('periodo_seleccionado', activo.codigo);
          } else {
            this._periodo.next(codigos[0]);
            this._periodoActivo.next(list[0]);
            localStorage.setItem('periodo_seleccionado', codigos[0]);
          }
        }
      },
      error: () => {
        // Fallback en caso de error
      }
    });
  }

  cambiarPeriodo(codigo: string): void {
    if (this._periodosList.getValue().includes(codigo)) {
      localStorage.setItem('periodo_seleccionado', codigo);
      this._periodo.next(codigo);
    }
  }

  get periodos(): string[] {
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

  get periodoActivo(): any {
    return this._periodoActivo.getValue();
  }

  get periodoActivo$() {
    return this._periodoActivo.asObservable();
  }
}
