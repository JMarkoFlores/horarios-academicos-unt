export interface NotificacionJobData {
  docenteId: number;
  ventanaId?: string;
  periodo?: string;
  tipo: 'recordatorio-24h' | 'alerta-15min' | 'horario-confirmado' | 'email-test' | 'telegram-test';
  canal: 'email' | 'telegram' | 'ambos';
  prioridad?: number; // 1 = alta, 2 = media, 3 = baja
  intento?: number;
}

export interface ResultadoNotificacion {
  exito: boolean;
  canal: 'email' | 'telegram';
  error?: string;
  codigoError?: string;
  timestamp: Date;
}
