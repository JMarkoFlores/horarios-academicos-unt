import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PeriodoService {
  private _periodo = new BehaviorSubject<string>('2026-I');
  private _periodosList = new BehaviorSubject<string[]>(['2025-II', '2026-I', '2026-II', '2027-I']);

  constructor(private api: ApiService) {}

  cargarPeriodos(): void {
    this.api.get<any>('/periodos/todos').subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        if (list.length > 0) {
          const codigos = list.map((p: any) => p.codigo);
          this._periodosList.next(codigos);
          // Buscar el periodo activo por defecto
          const activo = list.find((p: any) => p.activo);
          if (activo) {
            this._periodo.next(activo.codigo);
          } else {
            const current = this._periodo.getValue();
            if (!codigos.includes(current)) {
              this._periodo.next(codigos[0]);
            }
          }
        }
      },
      error: () => {
        // Fallback en caso de error
      }
    });
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
}
