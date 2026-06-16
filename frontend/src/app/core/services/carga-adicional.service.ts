import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface CargaAdicional {
  id: number;
  declaracion_id: number;
  docente_id: number;
  dependencia: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  horario_semanal: Array<{ dia: string; hora_inicio: string; hora_fin: string }> | null;
  total_horas: number;
  unidad_academica: string;
  resolucion: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface CreateCargaAdicionalDto {
  declaracion_id: number;
  docente_id: number;
  dependencia: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  horario_semanal?: Array<{ dia: string; hora_inicio: string; hora_fin: string }>;
  total_horas: number;
  unidad_academica: string;
  resolucion?: string;
  observaciones?: string;
}

export interface UpdateCargaAdicionalDto extends Partial<CreateCargaAdicionalDto> {}

@Injectable({
  providedIn: 'root',
})
export class CargaAdicionalService {
  constructor(private api: ApiService) {}

  findAll(declaracionId?: number, docenteId?: number): Observable<any> {
    const params: Record<string, number> = {};
    if (declaracionId) params['declaracion_id'] = declaracionId;
    if (docenteId) params['docente_id'] = docenteId;
    return this.api.get('/carga-adicional', params);
  }

  findOne(id: number): Observable<any> {
    return this.api.get(`/carga-adicional/${id}`);
  }

  create(dto: CreateCargaAdicionalDto): Observable<any> {
    return this.api.post('/carga-adicional', dto);
  }

  update(id: number, dto: UpdateCargaAdicionalDto): Observable<any> {
    return this.api.put(`/carga-adicional/${id}`, dto);
  }

  remove(id: number): Observable<any> {
    return this.api.delete(`/carga-adicional/${id}`);
  }
}
