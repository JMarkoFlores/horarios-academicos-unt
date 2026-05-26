import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificacionesService, PreferenciasNotificacion, NotificacionItem } from '../../core/services/notificaciones.service';
import { NotifToastService } from '../../core/services/notif-toast.service';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
})
export class NotificacionesComponent implements OnInit {
  preferenciasForm!: FormGroup;
  preferencias: PreferenciasNotificacion | null = null;
  historial: NotificacionItem[] = [];
  totalHistorial = 0;
  page = 1;
  limit = 20;
  cargando = false;
  enviandoPrueba = false;
  docenteId: number | null = null;
  docenteCodigo: string | null = null;
  docenteNombre: string | null = null;
  isAdmin = false;
  estadisticas: any = null;
  telegramBotUsername = 'BhorariosUNT_bot'; // Username del bot oficial de UNT
  docentes: any[] = []; // Lista de docentes para autocomplete
  buscandoDocentes = false;

  displayedColumns = ['tipo', 'canal', 'estado', 'fecha_envio', 'mensaje'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private api: ApiService,
    private notifService: NotificacionesService,
    private toast: NotifToastService,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getUsuarioActual();
    this.docenteId = usuario?.docenteId ?? null;
    this.isAdmin = this.authService.hasRole('administradorsistema');

    // Diagnóstico visible
    console.log('Usuario:', usuario, 'docenteId:', this.docenteId);

    this.preferenciasForm = this.fb.group({
      canal_correo: [true],
      canal_telegram: [false],
      telegram_chat_id: [''],
      correo_alternativo: [''],
    });

    if (this.docenteId) {
      this.cargarDatosDocente();
      this.cargarPreferencias();
      this.cargarHistorial();
    } else if (!this.isAdmin) {
      this.toast.error('Sesión sin docenteId. Cierra sesión y vuelve a entrar.');
    }

    if (this.isAdmin) {
      this.cargarEstadisticas();
    }
  }

  cargarDatosDocente(): void {
    if (!this.docenteId) return;
    this.api.get<any>(`/docentes/${this.docenteId}`).subscribe({
      next: (res: any) => {
        this.docenteCodigo = res.data?.codigo ?? null;
        this.docenteNombre = res.data?.nombre ?? null;
      },
      error: () => {
        // Si no puede cargar, el código y nombre quedan null
      }
    });
  }

  buscarDocentes(query: string): void {
    if (!query || query.length < 2) {
      this.docentes = [];
      return;
    }
    this.buscandoDocentes = true;
    this.api.get<any>(`/docentes?search=${query}`).subscribe({
      next: (res: any) => {
        this.docentes = res.data?.data || res.data || [];
        this.buscandoDocentes = false;
      },
      error: () => {
        this.docentes = [];
        this.buscandoDocentes = false;
      }
    });
  }

  seleccionarDocente(docente: any): void {
    this.docenteId = docente.id;
    this.docenteNombre = docente.nombre;
    this.docenteCodigo = docente.codigo;
    this.docentes = [];
    this.cargarPreferencias();
    this.cargarHistorial();
  }

  displayDocente(docente: any): string {
    return docente ? `${docente.nombre} (${docente.codigo})` : '';
  }

  abrirTelegramBot(): void {
    const url = `https://t.me/${this.telegramBotUsername}`;
    window.open(url, '_blank');
  }

  get comandoStart(): string {
    return this.docenteCodigo ? `/start ${this.docenteCodigo}` : '/start <código>';
  }

  setDocenteIdManual(id: number): void {
    this.docenteId = id;
    this.cargarHistorial();
  }

  cargarPreferencias(): void {
    if (!this.docenteId) return;
    this.cargando = true;
    this.notifService.getPreferencias(this.docenteId).subscribe({
      next: (res: any) => {
        const prefs = res.data?.data || res.data;
        this.preferenciasForm.patchValue({
          canal_correo: prefs?.canal_correo ?? true,
          canal_telegram: prefs?.canal_telegram ?? false,
          telegram_chat_id: prefs?.telegram_chat_id || '',
          correo_alternativo: prefs?.correo_alternativo || '',
        });
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  guardarPreferencias(): void {
    if (!this.docenteId) {
      this.toast.error('No se pudo identificar al docente. Cierra sesión y vuelve a iniciar sesión.');
      return;
    }
    const dto = this.preferenciasForm.value;
    console.log('Guardando preferencias:', dto);
    this.notifService.upsertPreferencias(this.docenteId, dto).subscribe({
      next: (res) => {
        console.log('Respuesta guardado:', res);
        this.toast.success('Preferencias guardadas exitosamente');
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        console.log('Error al guardar preferencias:', err);
        const msg = err?.error?.message || err?.message || 'Error desconocido al guardar preferencias';
        this.toast.error('Error: ' + msg);
      },
    });
  }

  cargarHistorial(): void {
    if (!this.docenteId) return;
    this.notifService.getHistorial(this.docenteId, this.page, this.limit).subscribe({
      next: (res: any) => {
        this.historial = res.data?.items ?? [];
        this.totalHistorial = res.data?.total ?? 0;
      },
      error: () => this.toast.error('Error al cargar historial'),
    });
  }

  enviarPrueba(): void {
    if (!this.docenteId) return;
    this.enviandoPrueba = true;
    this.notifService.enviarPrueba(this.docenteId).subscribe({
      next: () => {
        this.toast.success('Notificación de prueba enviada');
        this.enviandoPrueba = false;
        this.cargarHistorial();
      },
      error: () => {
        this.toast.error('Error al enviar prueba');
        this.enviandoPrueba = false;
      },
    });
  }

  cargarEstadisticas(periodo?: string): void {
    this.notifService.getEstadisticas(periodo).subscribe({
      next: (res: any) => {
        this.estadisticas = res.data;
      },
      error: () => this.toast.error('Error al cargar estadísticas'),
    });
  }

  onPageChange(event: any): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.cargarHistorial();
  }

  logout(): void {
    this.authService.logout();
  }

  copiarComando(): void {
    if (this.docenteCodigo) {
      navigator.clipboard.writeText(this.comandoStart);
      this.toast.success('Comando copiado al portapapeles');
    }
  }
}
