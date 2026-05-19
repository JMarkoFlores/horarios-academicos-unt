import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PreferenciasNotificacion {
  canal_correo: boolean;
  canal_telegram: boolean;
  telegram_chat_id: string | null;
  correo_alternativo: string | null;
}

export interface NotificacionItem {
  id: number;
  tipo: string;
  mensaje: string;
  canal: string;
  estado: string;
  fecha_envio: string;
  leido: boolean;
}

export interface EstadisticasNotificacion {
  total: number;
  entregados: number;
  fallidos: number;
  porCanal: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  constructor(private api: ApiService) {}

  getHistorial(docenteId: number, page = 1, limit = 20): Observable<{ data: { items: NotificacionItem[]; total: number } }> {
    return this.api.get(`/notificaciones/docente/${docenteId}`, { page, limit });
  }

  getPreferencias(docenteId: number): Observable<{ data: PreferenciasNotificacion }> {
    return this.api.get(`/notificaciones/preferencias/${docenteId}`);
  }

  upsertPreferencias(docenteId: number, dto: Partial<PreferenciasNotificacion>): Observable<{ data: PreferenciasNotificacion }> {
    return this.api.put(`/notificaciones/preferencias/${docenteId}`, dto);
  }

  enviarPrueba(docenteId: number): Observable<{ message: string }> {
    return this.api.post(`/notificaciones/probar/${docenteId}`, {});
  }

  getEstadisticas(periodo?: string): Observable<{ data: EstadisticasNotificacion }> {
    const params: Record<string, string> = periodo ? { periodo } : {};
    return this.api.get('/notificaciones/estadisticas', params);
  }
}
