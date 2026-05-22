import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Facultad {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  coordinador_id?: number;
  coordinador?: { id: number; nombre: string; email: string };
  escuelas?: Escuela[];
}

export interface Escuela {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  facultad_id: number;
  facultad?: Facultad;
  coordinador_id?: number;
  coordinador?: { id: number; nombre: string; email: string };
  departamentos?: Departamento[];
}

export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  escuela_id: number;
  escuela?: Escuela;
  coordinador_id?: number;
  coordinador?: { id: number; nombre: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class FacultadesService {
  constructor(private api: ApiService) {}

  // Facultades
  listarFacultades(): Observable<{ data: Facultad[] }> {
    return this.api.get<{ data: Facultad[] }>('/facultades');
  }
  crearFacultad(payload: Partial<Facultad>): Observable<any> {
    return this.api.post('/facultades', payload);
  }
  actualizarFacultad(id: number, payload: Partial<Facultad>): Observable<any> {
    return this.api.patch(`/facultades/${id}`, payload);
  }
  eliminarFacultad(id: number): Observable<any> {
    return this.api.delete(`/facultades/${id}`);
  }

  // Escuelas
  listarEscuelas(facultadId?: number): Observable<{ data: Escuela[] }> {
    const params: any = {};
    if (facultadId) params['facultad_id'] = facultadId;
    return this.api.get<{ data: Escuela[] }>('/escuelas', params);
  }
  crearEscuela(payload: Partial<Escuela>): Observable<any> {
    return this.api.post('/escuelas', payload);
  }
  actualizarEscuela(id: number, payload: Partial<Escuela>): Observable<any> {
    return this.api.patch(`/escuelas/${id}`, payload);
  }
  eliminarEscuela(id: number): Observable<any> {
    return this.api.delete(`/escuelas/${id}`);
  }

  // Departamentos
  listarDepartamentos(escuelaId?: number): Observable<{ data: Departamento[] }> {
    const params: any = {};
    if (escuelaId) params['escuela_id'] = escuelaId;
    return this.api.get<{ data: Departamento[] }>('/departamentos', params);
  }
  crearDepartamento(payload: Partial<Departamento>): Observable<any> {
    return this.api.post('/departamentos', payload);
  }
  actualizarDepartamento(id: number, payload: Partial<Departamento>): Observable<any> {
    return this.api.patch(`/departamentos/${id}`, payload);
  }
  eliminarDepartamento(id: number): Observable<any> {
    return this.api.delete(`/departamentos/${id}`);
  }
}
