import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TurnoConfig {
  id: number;
  nombre: string;
  tipo: string;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number;
  dias_habilitados: number[];
  facultad_id: number | null;
  activo: boolean;
  descripcion: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TurnoConfigService {
  constructor(private readonly http: HttpClient) {}

  obtenerTurnos(facultadId?: number): Observable<{ data: TurnoConfig[]; message: string; statusCode: number }> {
    const params = facultadId ? `?facultad_id=${facultadId}` : '';
    return this.http.get<{ data: TurnoConfig[]; message: string; statusCode: number }>(
      `${environment.apiUrl}/turno-config${params}`
    );
  }

  aplicarTurnos(body: { turno_ids: number[]; docente_id: number; periodo: string }): Observable<{ data: null; message: string; statusCode: number }> {
    return this.http.post<{ data: null; message: string; statusCode: number }>(
      `${environment.apiUrl}/turno-config/aplicar`,
      body
    );
  }

  inicializarTurnos(): Observable<{ data: null; message: string; statusCode: number }> {
    return this.http.post<{ data: null; message: string; statusCode: number }>(
      `${environment.apiUrl}/turno-config/inicializar`,
      {}
    );
  }
}
