import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { Observable, map } from 'rxjs';
import {
  CursoPendiente,
  DocenteAsignador,
  BloqueHorario,
  AmbienteDisponible,
  ValidacionDrop,
  ProgresoAsignacion,
} from '../models/asignador.models';

interface StandardResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

@Injectable({ providedIn: 'root' })
export class CargaLectivaApiService {
  constructor(private api: ApiService) {}

  private unwrap<T>(res: StandardResponse<T> | T): T {
    return (res && typeof res === 'object' && 'data' in res) ? (res as StandardResponse<T>).data : res as T;
  }

  getCursosPendientes(periodoId: number): Observable<CursoPendiente[]> {
    return this.api.get<StandardResponse<CursoPendiente[]>>(`asignador/cursos-pendientes/${periodoId}`)
      .pipe(map(res => this.unwrap(res)));
  }

  getDocentes(periodoId: number): Observable<DocenteAsignador[]> {
    return this.api.get<StandardResponse<DocenteAsignador[]>>(`asignador/docentes/${periodoId}`)
      .pipe(map(res => this.unwrap(res)));
  }

  getHorarioDocente(docenteId: number, periodo: string): Observable<BloqueHorario[]> {
    return this.api.get<StandardResponse<BloqueHorario[]>>(`asignador/horario-docente/${docenteId}`, { periodo })
      .pipe(map(res => this.unwrap(res)));
  }

  getAmbientes(periodoCodigo: string): Observable<AmbienteDisponible[]> {
    return this.api.get<StandardResponse<AmbienteDisponible[]>>(`asignador/ambientes/${periodoCodigo}`)
      .pipe(map(res => this.unwrap(res)));
  }

  getOcupacionAmbiente(ambienteId: number, periodo: string): Observable<any> {
    return this.api.get<StandardResponse<any>>(`asignador/ocupacion-ambiente/${ambienteId}`, { periodo })
      .pipe(map(res => this.unwrap(res)));
  }

  validar(datos: any): Observable<ValidacionDrop> {
    return this.api.post<StandardResponse<ValidacionDrop>>(`asignador/validar`, datos)
      .pipe(map(res => this.unwrap(res)));
  }

  asignar(datos: any): Observable<{ id: number; mensaje: string }> {
    return this.api.post<StandardResponse<{ id: number; mensaje: string }>>(`asignador/asignar`, datos)
      .pipe(map(res => this.unwrap(res)));
  }

  mover(id: number, datos: any): Observable<{ id: number; mensaje: string }> {
    return this.api.put<StandardResponse<{ id: number; mensaje: string }>>(`asignador/mover/${id}`, datos)
      .pipe(map(res => this.unwrap(res)));
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.api.delete<StandardResponse<{ mensaje: string }>>(`asignador/eliminar/${id}`)
      .pipe(map(res => this.unwrap(res)));
  }

  getProgreso(periodoId: number): Observable<ProgresoAsignacion> {
    return this.api.get<StandardResponse<ProgresoAsignacion>>(`asignador/progreso/${periodoId}`)
      .pipe(map(res => this.unwrap(res)));
  }
}
