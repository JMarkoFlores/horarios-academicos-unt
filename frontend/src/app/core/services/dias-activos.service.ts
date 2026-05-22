import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface DiaActivo {
  nombre: string;
  dia_semana: number;
}

const FALLBACK: DiaActivo[] = [
  { nombre: 'Lunes',     dia_semana: 1 },
  { nombre: 'Martes',    dia_semana: 2 },
  { nombre: 'Miércoles', dia_semana: 3 },
  { nombre: 'Jueves',    dia_semana: 4 },
  { nombre: 'Viernes',   dia_semana: 5 },
];

@Injectable({ providedIn: 'root' })
export class DiasActivosService {
  private _dias$ = new BehaviorSubject<DiaActivo[]>(FALLBACK);
  readonly dias$ = this._dias$.asObservable();

  constructor(private api: ApiService) {}

  get dias(): DiaActivo[] {
    return this._dias$.getValue();
  }

  get nombres(): string[] {
    return this.dias.map(d => d.nombre);
  }

  get numeros(): number[] {
    return this.dias.map(d => d.dia_semana);
  }

  /** Retorna un array indexado por dia_semana (1-7) con el nombre del día */
  get labelMap(): string[] {
    const map: string[] = Array(8).fill('');
    this.dias.forEach(d => { map[d.dia_semana] = d.nombre; });
    return map;
  }

  cargar(): Observable<any> {
    return this.api.get<any>('/configuracion/dias-activos').pipe(
      tap((r: any) => {
        const activos: DiaActivo[] = (r?.data ?? [])
          .filter((d: any) => d.activo)
          .sort((a: any, b: any) => a.dia_semana - b.dia_semana)
          .map((d: any) => ({ nombre: d.nombre, dia_semana: d.dia_semana }));
        if (activos.length > 0) {
          this._dias$.next(activos);
        }
      }),
      catchError(() => of(null)),
    );
  }
}
