import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse, DisponibilidadDocente, Docente } from '../../core/interfaces/entities';
import { ApiService } from '../../core/services/api.service';

export interface TurnoHorario {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface DiaActivo {
  id?: number;
  dia_semana: number;
  nombre: string;
  activo?: boolean;
}

export interface ParametroCarga {
  id: number;
  periodo_academico: string;
  tipo_docente: string;
  categoria: string;
  modalidad: string;
  horas_min_semanal: number;
  horas_max_semanal: number;
  cursos_min_docente: number;
  cursos_max_docente: number;
}

export interface DisponibilidadDocenteResponse {
  docente: Pick<Docente, 'id' | 'nombres' | 'apellidos' | 'codigo'>;
  periodo: string;
  slots: DisponibilidadDocente[];
}

export interface GuardarDisponibilidadPayload {
  slots: Array<{
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    disponible: boolean;
  }>;
  periodo: string;
}

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  constructor(private readonly api: ApiService) {}

  obtenerDocenteById(id: number): Observable<Docente> {
    return this.api
      .get<ApiResponse<Docente>>(`/docentes/${id}`)
      .pipe(map((res) => res.data));
  }

  obtenerTurnos(): Observable<TurnoHorario[]> {
    return this.api
      .get<ApiResponse<TurnoHorario[]>>('/configuracion/turnos')
      .pipe(
        map((response) =>
          (response?.data ?? [])
            .filter((turno) => turno.activo)
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
        ),
      );
  }

  obtenerDiasActivos(): Observable<DiaActivo[]> {
    return this.api
      .get<ApiResponse<DiaActivo[]>>('/configuracion/dias-activos')
      .pipe(
        map((response) =>
          (response?.data ?? [])
            .filter((dia) => dia.activo !== false)
            .sort((a, b) => a.dia_semana - b.dia_semana),
        ),
      );
  }

  obtenerDocentes(): Observable<Docente[]> {
    return this.api
      .get<ApiResponse<{ items: Docente[] }>>('/docentes', { limit: 100 })
      .pipe(map((response) => response?.data?.items ?? []));
  }

  obtenerDisponibilidadDocente(
    docenteId: number,
    periodo: string,
  ): Observable<DisponibilidadDocenteResponse> {
    return this.api.get<ApiResponse<DisponibilidadDocenteResponse>>(
      `/disponibilidad/docente/${docenteId}`,
      { periodo },
    ).pipe(map((response) => response.data));
  }

  guardarDisponibilidadDocente(
    docenteId: number,
    payload: GuardarDisponibilidadPayload,
  ): Observable<ApiResponse<DisponibilidadDocenteResponse>> {
    return this.api.post<ApiResponse<DisponibilidadDocenteResponse>>(
      `/disponibilidad/docente/${docenteId}`,
      payload,
    );
  }

  eliminarDisponibilidadDocente(
    docenteId: number,
    periodo: string,
  ): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(
      `/disponibilidad/docente/${docenteId}?periodo=${periodo}`,
    );
  }

  obtenerParametrosCarga(periodo: string): Observable<ParametroCarga[]> {
    return this.api
      .get<ApiResponse<ParametroCarga[]>>('/configuracion/parametros-carga', {
        periodo,
      })
      .pipe(map((response) => response?.data ?? []));
  }
}
