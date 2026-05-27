import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

export interface CeldaMatriz {
  dia: number;
  horaInicio: string;
  horaFin: string;
  estado: string;
  metadata?: any;
}

@Component({
  selector: 'app-grilla-horarios',
  templateUrl: './grilla-horarios.component.html',
  styleUrl: './grilla-horarios.component.scss'
})
export class GrillaHorariosComponent implements OnInit, OnDestroy {
  @Input() ventanaId!: string;
  @Input() ambienteId!: number;
  @Input() sesionId!: string;
  @Input() docenteId!: number;
  @Input() cursoId!: number;
  @Input() tipoClase!: string;
  @Input() periodo!: string;
  @Input() horasRequeridas: number = 0;
  @Input() horasAsignadas: number = 0;
  
  private _grupoSeleccionado?: number;
  @Input() 
  set grupoSeleccionado(value: number | undefined) {
    console.log('[GrillaHorarios] grupoSeleccionado set a:', value);
    this._grupoSeleccionado = value;
    if (this.ambienteId) {
      this.cargarMatriz();
    }
  }
  get grupoSeleccionado(): number | undefined {
    return this._grupoSeleccionado;
  }
  
  @Output() seleccionCambiada = new EventEmitter<void>();

  matriz: CeldaMatriz[] = [];
  horas: string[] = [];
  dias = [
    { valor: 1, label: 'Lun' },
    { valor: 2, label: 'Mar' },
    { valor: 3, label: 'Mié' },
    { valor: 4, label: 'Jue' },
    { valor: 5, label: 'Vie' },
    { valor: 6, label: 'Sáb' },
  ];
  loading = false;

  private celdaSeleccionadaSub?: Subscription;
  private celdaLiberadaSub?: Subscription;

  constructor(
    private api: ApiService,
    private socketService: SocketService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.horas = [];
    for (let h = 7; h <= 21; h++) {
      this.horas.push(`${h.toString().padStart(2, '0')}:00`);
    }
    this.socketService.connect();
    this.socketService.joinVentana(this.ventanaId);
    this.celdaSeleccionadaSub = this.socketService.celdaSeleccionada$.subscribe(() => {
      this.cargarMatriz();
    });
    this.celdaLiberadaSub = this.socketService.celdaLiberada$.subscribe(() => {
      this.cargarMatriz();
    });
  }

  ngOnDestroy(): void {
    this.socketService.leaveVentana(this.ventanaId);
    this.celdaSeleccionadaSub?.unsubscribe();
    this.celdaLiberadaSub?.unsubscribe();
  }

  cargarMatriz(): void {
    if (!this.ambienteId || !this.ventanaId) return;
    this.loading = true;
    this.api.get<any>(`/ventanas/${this.ventanaId}/disponibilidad-matriz`, {
      ambiente_id: this.ambienteId,
      sesionId: this.sesionId,
      docenteId: this.docenteId
    }).subscribe({
      next: (r) => {
        this.matriz = r.data || [];
        // Buscar celdas con estado temporal para depurar
        const celdasTemporales = this.matriz.filter((c: any) => 
          c.estado === 'TEMPORAL_PROPIO' || c.estado === 'TEMPORAL_PROPIO_MULTIPLE'
        );
        console.log('[GrillaHorarios] Matriz cargada:', this.matriz.length, 'celdas');
        console.log('[GrillaHorarios] Celdas temporales encontradas:', celdasTemporales);
        if (celdasTemporales.length > 0) {
          console.log('[GrillaHorarios] Ejemplo de celda temporal:', celdasTemporales[0]);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al cargar disponibilidad', 'Error', { duration: 3000 });
      }
    });
  }

  forzarRecargaMatriz(): void {
    console.log('[GrillaHorarios] forzarRecargaMatriz llamado, grupoSeleccionado:', this._grupoSeleccionado);
    this.cargarMatriz();
  }

  getCelda(dia: number, hora: string): CeldaMatriz | undefined {
    return this.matriz.find(c => c.dia === dia && c.horaInicio === hora);
  }

  getHoraFin(hora: string): string {
    const horaNum = parseInt(hora.split(':')[0], 10);
    return `${(horaNum + 1).toString().padStart(2, '0')}:00`;
  }

  async onCeldaClick(dia: number, hora: string): Promise<void> {
    const celda = this.getCelda(dia, hora);
    if (!celda) return;

    const horaFin = `${(parseInt(hora.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

    // Verificar si ya se cubrieron las horas requeridas antes de agregar más bloques
    const esNuevoBloque = celda.estado === 'LIBRE';
    if (esNuevoBloque && this.horasRequeridas > 0 && this.horasAsignadas >= this.horasRequeridas) {
      this.snack.open(
        `Ya se cubrieron las ${this.horasRequeridas}h requeridas para este curso. No se pueden agregar más bloques.`,
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }

    // Clic izquierdo: agregar bloque (permitido en celdas libres, temporales propias, y con ocupaciones confirmadas)
    if (celda.estado === 'LIBRE' || celda.estado === 'TEMPORAL_PROPIO' || celda.estado === 'TEMPORAL_PROPIO_MULTIPLE' ||
        celda.estado === 'CONFIRMADO' || celda.estado === 'CONFIRMADO_MULTIPLE' || 
        celda.estado === 'CONFIRMADO_DOCENTE' || celda.estado === 'CONFIRMADO_DOCENTE_MULTIPLE') {
      
      // Verificar si ya hay 3 bloques (confirmados + temporales)
      let bloquesActuales = 0;
      if (celda.metadata?.ocupaciones) {
        bloquesActuales = celda.metadata.ocupaciones.length;
      } else if (celda.estado === 'TEMPORAL_PROPIO' || celda.estado === 'CONFIRMADO' || celda.estado === 'CONFIRMADO_DOCENTE') {
        bloquesActuales = 1;
      }

      if (bloquesActuales >= 3) {
        this.snack.open('Máximo 3 bloques permitidos por celda', 'Cerrar', { duration: 3000 });
        return;
      }

      // Agregar bloque
      console.log('[GrillaHorarios] Enviando selección con grupoSeleccionado:', this._grupoSeleccionado);
      this.api.post<any>(`/ventanas/${this.ventanaId}/celda`, {
        ventanaId: this.ventanaId,
        sesionId: this.sesionId,
        docenteId: this.docenteId,
        cursoId: this.cursoId,
        grupoId: this.grupoSeleccionado,
        tipoClase: this.tipoClase,
        ambienteId: this.ambienteId,
        dia,
        horaInicio: hora,
        horaFin: horaFin,
        periodo: this.periodo
      }).subscribe({
        next: (r) => {
          if (r.data?.exito) {
            this.snack.open('Bloque agregado', 'OK', { duration: 2000 });
            this.seleccionCambiada.emit();
            this.cargarMatriz();
          } else {
            const msg = r.data?.motivo || 'No se pudo agregar el bloque';
            if (r.data?.alternativas?.length) {
              const nombres = r.data.alternativas.map((a: any) => a.codigo).join(', ');
              this.snack.open(`${msg}. Alternativas: ${nombres}`, 'Cerrar', { duration: 6000 });
            } else {
              this.snack.open(msg, 'Cerrar', { duration: 4000 });
            }
          }
        },
        error: (err) => {
          this.snack.open(err.error?.message || 'Error al agregar bloque', 'Error', { duration: 3000 });
        }
      });
    }
  }

  onCeldaRightClick(dia: number, hora: string, event: MouseEvent): void {
    event.preventDefault();
    const celda = this.getCelda(dia, hora);
    if (!celda) return;

    // Clic derecho: eliminar bloque propio o ver detalles si es de otros
    if (celda.estado === 'TEMPORAL_PROPIO' || celda.estado === 'TEMPORAL_PROPIO_MULTIPLE') {
      // Eliminar bloque propio
      this.api.post<any>(`/ventanas/${this.ventanaId}/celda/deseleccionar`, {
        sesionId: this.sesionId,
        ambienteId: this.ambienteId,
        dia,
        horaInicio: hora,
        periodo: this.periodo
      }).subscribe({
        next: () => {
          this.snack.open('Bloque eliminado', 'OK', { duration: 2000 });
          this.seleccionCambiada.emit();
          this.cargarMatriz();
        },
        error: (err) => {
          this.snack.open(err.error?.message || 'Error al eliminar bloque', 'Error', { duration: 3000 });
        }
      });
    } else if (celda.estado === 'TEMPORAL_OTRO' || celda.estado === 'CONFIRMADO' || celda.estado === 'CONFIRMADO_MULTIPLE' || 
               celda.estado === 'CONFIRMADO_DOCENTE' || celda.estado === 'CONFIRMADO_DOCENTE_MULTIPLE') {
      // Mostrar detalles de otros
      const tooltip = this.getTooltipCelda(celda);
      this.snack.open(tooltip, 'Cerrar', { duration: 5000 });
    }
  }

  onCeldaDoubleClick(dia: number, hora: string): void {
    const celda = this.getCelda(dia, hora);
    if (!celda) return;

    // Doble clic: mostrar modal con todos los detalles
    const tooltip = this.getTooltipCelda(celda);
    // TODO: Implementar modal con detalles completos
    this.snack.open(tooltip, 'Cerrar', { duration: 8000 });
  }

  getBloqueCount(celda: CeldaMatriz): number {
    if (celda.estado === 'LIBRE') return 0;
    if (celda.estado === 'TEMPORAL_PROPIO' || celda.estado === 'CONFIRMADO' || celda.estado === 'CONFIRMADO_DOCENTE') return 1;
    if ((celda.estado === 'TEMPORAL_PROPIO_MULTIPLE' || celda.estado === 'CONFIRMADO_MULTIPLE' || celda.estado === 'CONFIRMADO_DOCENTE_MULTIPLE') && celda.metadata?.ocupaciones) {
      return celda.metadata.ocupaciones.length;
    }
    return 0;
  }

  getOcupacionesArray(celda: CeldaMatriz): any[] {
    if (celda.estado === 'TEMPORAL_PROPIO') {
      // Para selección temporal simple, crear array con una ocupación
      return [{ docenteId: this.docenteId }];
    }
    if (celda.estado === 'TEMPORAL_PROPIO_MULTIPLE' && celda.metadata?.ocupaciones) {
      return celda.metadata.ocupaciones;
    }
    if (celda.estado === 'CONFIRMADO' && celda.metadata) {
      // Para confirmado simple, verificar si tiene ocupaciones array o metadata simple
      if (celda.metadata.ocupaciones) {
        return celda.metadata.ocupaciones;
      }
      return [{ docenteId: celda.metadata.docenteId, cursoId: celda.metadata.cursoId }];
    }
    if (celda.estado === 'CONFIRMADO_DOCENTE' && celda.metadata) {
      if (celda.metadata.ocupaciones) {
        return celda.metadata.ocupaciones;
      }
      return [{ docenteId: celda.metadata.docenteId, cursoId: celda.metadata.cursoId }];
    }
    if ((celda.estado === 'CONFIRMADO_MULTIPLE' || celda.estado === 'CONFIRMADO_DOCENTE_MULTIPLE') && celda.metadata?.ocupaciones) {
      return celda.metadata.ocupaciones;
    }
    return [];
  }

  onBloqueRightClick(event: MouseEvent, dia: number, hora: string, ocupacion: any): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Solo permitir eliminar si es del propio docente
    if (ocupacion.docenteId === this.docenteId) {
      this.api.post<any>(`/ventanas/${this.ventanaId}/celda/deseleccionar`, {
        sesionId: this.sesionId,
        ambienteId: this.ambienteId,
        dia,
        horaInicio: hora,
        periodo: this.periodo
      }).subscribe({
        next: () => {
          this.snack.open('Bloque eliminado', 'OK', { duration: 2000 });
          this.seleccionCambiada.emit();
          this.cargarMatriz();
        },
        error: (err) => {
          this.snack.open(err.error?.message || 'Error al eliminar bloque', 'Error', { duration: 3000 });
        }
      });
    } else {
      this.snack.open('Solo puedes eliminar tus propios bloques', 'Cerrar', { duration: 3000 });
    }
  }

  getClaseCelda(celda: CeldaMatriz | undefined): string {
    if (!celda) return '';
    switch (celda.estado) {
      case 'LIBRE': return 'celda-libre';
      case 'BLOQUEADO': return 'celda-bloqueada';
      case 'CONFIRMADO': return 'celda-confirmada';
      case 'CONFIRMADO_DOCENTE': return 'celda-confirmada-docente';
      case 'CONFIRMADO_MULTIPLE': return 'celda-confirmada-multiple';
      case 'CONFIRMADO_DOCENTE_MULTIPLE': return 'celda-confirmada-docente-multiple';
      case 'TEMPORAL_OTRO': return 'celda-temporal-otro';
      case 'TEMPORAL_PROPIO': return 'celda-temporal-propio';
      case 'TEMPORAL_PROPIO_MULTIPLE': return 'celda-temporal-propio-multiple';
      default: return '';
    }
  }

  getTooltipCelda(celda: CeldaMatriz | undefined): string {
    if (!celda) return '';
    switch (celda.estado) {
      case 'LIBRE': return 'Disponible — Haz clic para seleccionar';
      case 'BLOQUEADO': return 'Fuera de franja institucional o restricción';
      case 'CONFIRMADO':
        if (celda.metadata?.ocupaciones) {
          return celda.metadata.ocupaciones.map((o: any) => 
            `${o.docenteId ? 'Docente ' + o.docenteId : ''}${o.cursoNombre ? ' — ' + o.cursoNombre : ''}${o.tipoClase ? ' (' + o.tipoClase : ''}${o.grupoId ? ', G' + o.grupoId : ''})`
          ).join('\n');
        }
        const docente = celda.metadata?.docenteNombre || `Docente ${celda.metadata?.docenteId || ''}`;
        const curso = celda.metadata?.cursoNombre || '';
        const tipo = celda.metadata?.tipoClase || '';
        const grupo = celda.metadata?.grupoCodigo || '';
        let tooltip = `Ocupado: ${docente}${curso ? ' — ' + curso : ''}${tipo ? ' (' + tipo : ''}`;
        if (tipo === 'LABORATORIO' && grupo) {
          const grupoNum = grupo.match(/-G(\d+)$/)?.[1] || '';
          if (grupoNum) {
            tooltip += `, G${grupoNum}`;
          }
        }
        tooltip += ')';
        return tooltip;
      case 'CONFIRMADO_DOCENTE':
        if (celda.metadata?.ocupaciones) {
          return celda.metadata.ocupaciones.map((o: any) => 
            `${o.docenteId ? 'Docente ' + o.docenteId : ''}${o.cursoNombre ? ' — ' + o.cursoNombre : ''}${o.tipoClase ? ' (' + o.tipoClase : ''}${o.grupoId ? ', G' + o.grupoId : ''}${o.otroAmbiente ? ' (otro ambiente)' : ''})`
          ).join('\n');
        }
        const cursoDocente = celda.metadata?.cursoNombre || '';
        const tipoDocente = celda.metadata?.tipoClase || '';
        const grupoDocente = celda.metadata?.grupoCodigo || '';
        let tooltipDocente = `Tu horario: ${cursoDocente}${tipoDocente ? ' (' + tipoDocente : ''}`;
        if (tipoDocente === 'LABORATORIO' && grupoDocente) {
          const grupoNumDocente = grupoDocente.match(/-G(\d+)$/)?.[1] || '';
          if (grupoNumDocente) {
            tooltipDocente += `, G${grupoNumDocente}`;
          }
        }
        tooltipDocente += ')';
        return tooltipDocente;
      case 'CONFIRMADO_MULTIPLE':
        return celda.metadata?.ocupaciones?.length > 0 
          ? `${celda.metadata.ocupaciones.length} ocupaciones:\n${celda.metadata.ocupaciones.map((o: any) => 
              `${o.docenteId ? 'Docente ' + o.docenteId : ''}${o.cursoNombre ? ' — ' + o.cursoNombre : ''}${o.tipoClase ? ' (' + o.tipoClase : ''}${o.grupoId ? ', G' + o.grupoId : ''}`
            ).join('\n')}`
          : 'Múltiples ocupaciones';
      case 'CONFIRMADO_DOCENTE_MULTIPLE':
        return celda.metadata?.ocupaciones?.length > 0 
          ? `Tu horario + ${celda.metadata.ocupaciones.length - 1} más:\n${celda.metadata.ocupaciones.map((o: any) => 
              `${o.docenteId ? 'Docente ' + o.docenteId : ''}${o.cursoNombre ? ' — ' + o.cursoNombre : ''}${o.tipoClase ? ' (' + o.tipoClase : ''}${o.grupoId ? ', G' + o.grupoId : ''}${o.otroAmbiente ? ' (otro ambiente)' : ''}`
            ).join('\n')}`
          : 'Tu horario + más ocupaciones';
      case 'TEMPORAL_OTRO': return 'Reservado temporalmente por otro operador';
      case 'TEMPORAL_PROPIO': return 'Tu selección temporal — Haz clic para quitar';
      case 'TEMPORAL_PROPIO_MULTIPLE':
        return celda.metadata?.ocupaciones?.length > 0 
          ? `Tu selección + ${celda.metadata.ocupaciones.length - 1} más:\n${celda.metadata.ocupaciones.map((o: any) => 
              `Docente ${o.docenteId}${o.cursoId ? ' — Curso ' + o.cursoId : ''}`
            ).join('\n')}`
          : 'Tu selección + más bloques';
      default: return '';
    }
  }
}
