import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DeclaracionClad, ObservarCladDto } from '../interfaces/clad.interface';

@Injectable({
  providedIn: 'root'
})
export class CladService {
  private apiUrl = `${environment.apiUrl}/clad`;

  constructor(private http: HttpClient) {}

  findAll(filtros?: any): Observable<DeclaracionClad[]> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<DeclaracionClad[]>(this.apiUrl, { params });
  }

  getMiClad(periodo: string): Observable<DeclaracionClad> {
    return this.http.get<DeclaracionClad>(`${this.apiUrl}/mi-clad`, {
      params: { periodo }
    });
  }

  findOne(id: number): Observable<DeclaracionClad> {
    return this.http.get<DeclaracionClad>(`${this.apiUrl}/${id}`);
  }

  create(clad: Partial<DeclaracionClad>): Observable<DeclaracionClad> {
    return this.http.post<DeclaracionClad>(this.apiUrl, clad);
  }

  update(id: number, clad: Partial<DeclaracionClad>): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}`, clad);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  enviar(id: number): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/enviar`, {});
  }

  validarDpto(id: number): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/validar-dpto`, {});
  }

  observarDpto(id: number, dto: ObservarCladDto): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/observar-dpto`, dto);
  }

  validarDependencia(id: number): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/validar-dependencia`, {});
  }

  observarDependencia(id: number, dto: ObservarCladDto): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/observar-dependencia`, dto);
  }

  aprobarFinal(id: number): Observable<DeclaracionClad> {
    return this.http.patch<DeclaracionClad>(`${this.apiUrl}/${id}/aprobar-final`, {});
  }
}
