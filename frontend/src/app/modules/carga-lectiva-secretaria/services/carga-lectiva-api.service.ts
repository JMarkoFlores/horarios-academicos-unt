import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable } from 'rxjs';
import {
  CursoPendiente,
  DocenteAsignador,
  BloqueHorario,
  AmbienteDisponible,
  ValidacionDrop,
  ProgresoAsignacion,
} from '../models/asignador.models';

@Injectable({ providedIn: 'root' })
export class CargaLectivaApiService {
  constructor(private api: ApiService) {}

  getCursosPendientes(periodoId: number): Observable<CursoPendiente[]> {
    return this.api.get<CursoPendiente[]>(`asignador/cursos-pendientes/${periodoId}`);
  }

  getDocentes(periodoId: number): Observable<DocenteAsignador[]> {
    return this.api.get<DocenteAsignador[]>(`asignador/docentes/${periodoId}`);
  }

  getHorarioDocente(docenteId: number, periodo: string): Observable<BloqueHorario[]> {
    return this.api.get<BloqueHorario[]>(`asignador/horario-docente/${docenteId}`, { periodo });
  }

  getAmbientes(periodoCodigo: string): Observable<AmbienteDisponible[]> {
    return this.api.get<AmbienteDisponible[]>(`asignador/ambientes/${periodoCodigo}`);
  }

  getOcupacionAmbiente(ambienteId: number, periodo: string): Observable<any> {
    return this.api.get<any>(`asignador/ocupacion-ambiente/${ambienteId}`, { periodo });
  }

  validar(datos: any): Observable<ValidacionDrop> {
    return this.api.post<ValidacionDrop>(`asignador/validar`, datos);
  }

  asignar(datos: any): Observable<{ id: number; mensaje: string }> {
    return this.api.post<{ id: number; mensaje: string }>(`asignador/asignar`, datos);
  }

  mover(id: number, datos: any): Observable<{ id: number; mensaje: string }> {
    return this.api.put<{ id: number; mensaje: string }>(`asignador/mover/${id}`, datos);
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.api.delete<{ mensaje: string }>(`asignador/eliminar/${id}`);
  }

  getProgreso(periodoId: number): Observable<ProgresoAsignacion> {
    return this.api.get<ProgresoAsignacion>(`asignador/progreso/${periodoId}`);
  }
}
