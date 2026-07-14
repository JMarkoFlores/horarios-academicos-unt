import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DeclaracionClad, ObservarCladDto } from '../interfaces/clad.interface';

interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

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
    return this.http.get<ApiResponse<DeclaracionClad[]>>(this.apiUrl, { params })
      .pipe(map(res => res.data));
  }

  getMiClad(periodo: string): Observable<DeclaracionClad> {
    return this.http.get<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/mi-clad`, {
      params: { periodo }
    }).pipe(map(res => res.data));
  }

  findOne(id: number): Observable<DeclaracionClad> {
    return this.http.get<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  create(clad: Partial<DeclaracionClad>): Observable<DeclaracionClad> {
    return this.http.post<ApiResponse<DeclaracionClad>>(this.apiUrl, clad)
      .pipe(map(res => res.data));
  }

  update(id: number, clad: Partial<DeclaracionClad>): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}`, clad)
      .pipe(map(res => res.data));
  }

  remove(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  enviar(id: number): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/enviar`, {})
      .pipe(map(res => res.data));
  }

  validarDpto(id: number): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/validar-dpto`, {})
      .pipe(map(res => res.data));
  }

  observarDpto(id: number, dto: ObservarCladDto): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/observar-dpto`, dto)
      .pipe(map(res => res.data));
  }

  validarDependencia(id: number): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/validar-dependencia`, {})
      .pipe(map(res => res.data));
  }

  observarDependencia(id: number, dto: ObservarCladDto): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/observar-dependencia`, dto)
      .pipe(map(res => res.data));
  }

  aprobarFinal(id: number): Observable<DeclaracionClad> {
    return this.http.patch<ApiResponse<DeclaracionClad>>(`${this.apiUrl}/${id}/aprobar-final`, {})
      .pipe(map(res => res.data));
  }
}
