import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PeriodoService {
  private _periodo = new BehaviorSubject<string>('2026-I');

  readonly periodos = ['2025-II', '2026-I', '2026-II', '2027-I'];

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
