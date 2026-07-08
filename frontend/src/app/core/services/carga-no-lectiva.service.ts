import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface HorarioNoLectivo {
  id: number;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number;
  lugar?: string;
}

export interface ActividadNoLectiva {
  id: number;
  declaracion_id: number;
  tipo: string;
  descripcion: string;
  detalle?: string;
  horas_totales: number;
  horas_distribuidas: number;
  horas_pendientes: number;
  horas_manual: boolean;
  orden: number;
  horarios: HorarioNoLectivo[];
  created_at: string;
  updated_at: string;
}

export interface CreateActividadDto {
  tipo: string;
  descripcion: string;
  detalle?: string;
  horas_totales: number;
  horas_manual?: boolean;
  orden?: number;
}

export interface UpdateActividadDto {
  tipo?: string;
  descripcion?: string;
  detalle?: string;
  horas_totales?: number;
  horas_manual?: boolean;
  orden?: number;
}

export interface CreateHorarioDto {
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  lugar?: string;
}

export interface UpdateHorarioDto {
  dia?: number;
  hora_inicio?: string;
  hora_fin?: string;
  lugar?: string;
}

export interface ResumenActividad {
  actividad: ActividadNoLectiva;
  horas_totales: number;
  horas_distribuidas: number;
  horas_pendientes: number;
  porcentaje_completado: number;
  distribucion_por_dia: Record<number, number>;
}

export interface ResumenDeclaracion {
  total_actividades: number;
  total_horas_no_lectivas: number;
  total_horas_distribuidas: number;
  total_horas_pendientes: number;
  actividades: Array<{
    id: number;
    tipo: string;
    descripcion: string;
    horas_totales: number;
    horas_distribuidas: number;
    horas_pendientes: number;
    porcentaje_completado: number;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class CargaNoLectivaService {
  constructor(private api: ApiService) {}

  getActividadesByDeclaracion(declaracionId: number): Observable<ActividadNoLectiva[]> {
    return this.api.get<ActividadNoLectiva[]>(`/carga-no-lectiva/declaracion/${declaracionId}`);
  }

  getActividadById(id: number): Observable<ActividadNoLectiva> {
    return this.api.get<ActividadNoLectiva>(`/carga-no-lectiva/actividad/${id}`);
  }

  getResumenActividad(id: number): Observable<ResumenActividad> {
    return this.api.get<ResumenActividad>(`/carga-no-lectiva/actividad/${id}/resumen`);
  }

  getResumenDeclaracion(declaracionId: number): Observable<ResumenDeclaracion> {
    return this.api.get<ResumenDeclaracion>(`/carga-no-lectiva/declaracion/${declaracionId}/resumen`);
  }

  createActividad(declaracionId: number, dto: CreateActividadDto): Observable<ActividadNoLectiva> {
    return this.api.post<ActividadNoLectiva>(`/carga-no-lectiva/declaracion/${declaracionId}/actividad`, dto);
  }

  updateActividad(id: number, dto: UpdateActividadDto): Observable<ActividadNoLectiva> {
    return this.api.put<ActividadNoLectiva>(`/carga-no-lectiva/actividad/${id}`, dto);
  }

  deleteActividad(id: number): Observable<void> {
    return this.api.delete<void>(`/carga-no-lectiva/actividad/${id}`);
  }

  addHorario(actividadId: number, dto: CreateHorarioDto): Observable<HorarioNoLectivo> {
    return this.api.post<HorarioNoLectivo>(`/carga-no-lectiva/actividad/${actividadId}/horario`, dto);
  }

  updateHorario(id: number, dto: UpdateHorarioDto): Observable<HorarioNoLectivo> {
    return this.api.put<HorarioNoLectivo>(`/carga-no-lectiva/horario/${id}`, dto);
  }

  deleteHorario(id: number): Observable<void> {
    return this.api.delete<void>(`/carga-no-lectiva/horario/${id}`);
  }
}
