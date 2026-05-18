import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CrearUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  email?: string;
  rol?: string;
  activo?: boolean;
}

export interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private api: ApiService) {}

  crear(payload: CrearUsuarioPayload): Observable<any> {
    return this.api.post('/usuarios', payload);
  }

  listar(): Observable<{ data: UsuarioItem[] }> {
    return this.api.get<{ data: UsuarioItem[] }>('/usuarios');
  }

  actualizar(id: number, payload: ActualizarUsuarioPayload): Observable<any> {
    return this.api.patch(`/usuarios/${id}`, payload);
  }

  eliminar(id: number): Observable<any> {
    return this.api.delete(`/usuarios/${id}`);
  }
}
