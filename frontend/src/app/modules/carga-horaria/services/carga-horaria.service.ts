import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Docente, FormatoItem, Semestre } from '../models/carga-horaria.models';
import { MOCK_DOCENTE, MOCK_SEMESTRES, MOCK_FORMATOS } from '../mocks/mock-data';

@Injectable({ providedIn: 'root' })
export class CargaHorariaService {
  getSemestres(): Observable<Semestre[]> {
    return of(MOCK_SEMESTRES).pipe(delay(300));
  }

  getDocenteActual(): Observable<Docente> {
    return of(MOCK_DOCENTE).pipe(delay(300));
  }

  getFormatos(semestreId: number): Observable<FormatoItem[]> {
    return of(semestreId)
      .pipe(
        map((id) => MOCK_FORMATOS[id] ?? []),
        delay(300),
      );
  }
}
