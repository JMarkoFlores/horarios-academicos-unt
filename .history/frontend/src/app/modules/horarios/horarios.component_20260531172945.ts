import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import {
  ApiResponse,
  Docente,
  Ambiente,
  HorarioAsignado,
  ConflictoAsignacion,
  Curso,
} from '../../core/interfaces/entities';
import { AsignarHorarioDialogComponent } from './dialogs/asignar-horario-dialog/asignar-horario-dialog.component';

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.scss'],
})
export class HorariosComponent implements OnInit, OnDestroy {
  dias: string[] = [];
  diasNum: number[] = [];
  horas = Array.from({ length: 15 }, (_, i) => i + 7);
  loadingDias = true;

  // Tab 1 — Vista Docente
  todosDocentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  asignacionesDocente: HorarioAsignado[] = [];
  loadingDocente = false;
  descargandoDoc = false;

  // Tab 2 — Vista Ambiente
  todosAmbientes: Ambiente[] = [];
  ambienteSeleccionado: Ambiente | null = null;
  asignacionesAmbiente: HorarioAsignado[] = [];
  loadingAmbiente = false;

  // Tab 3 — Conflictos
  conflictos: ConflictoAsignacion[] = [];
  loadingConflictos = false;
  colsConflictos = [
    'tipo_conflicto',
    'descripcion',
    'periodo_academico',
    'resuelto',
    'acciones',
  ];

  // Tab 4 — Gestión
  generando = false;
  limpiando = false;
  resultadoGeneracion: any = null;
  debugResult: any = null;
  loadingDebug = false;
  private periodSub?: Subscription;

  // Tab 3 — Vista por Ciclo
  ciclosDisponibles: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  cicloSeleccionado: number | null = null;
  asignacionesCiclo: HorarioAsignado[] = [];
  loadingCiclo = false;
  descargandoCiclo = false;
  descargandoTodo = false;
  descargandoTodoPdfStatus = false;
  descargandoTodoExcelStatus = false;

  // Hora de almuerzo (se cargará desde restricciones)
  horaInicioAlmuerzo = 12;
  horaFinAlmuerzo = 13;
  restriccionesCargadas = false;

  // Colores por categoría/docente
  private colorMap = new Map<string, string>();
  private colors = [
    '#3b82f6', // primary
    '#10b981', // accent
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ];
  private colorIndex = 0;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarRestriccionesAlmuerzo();
    
    this.api.get<any>('/configuracion/dias-activos').subscribe({
      next: (r: any) => {
        const activos: {
          dia_semana: number;
          nombre: string;
          activo: boolean;
        }[] = (r?.data ?? []).filter((d: any) => d.activo);
        activos.sort((a, b) => a.dia_semana - b.dia_semana);
        this.dias = activos.map((d) => d.nombre);
        this.diasNum = activos.map((d) => d.dia_semana);
        this.loadingDias = false;
      },
      error: () => {
        this.dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        this.diasNum = [1, 2, 3, 4, 5];
        this.loadingDias = false;
      },
    });

    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (r: any) => {
        this.todosDocentes = r?.data?.items ?? r?.data ?? [];
      },
    });

    this.api
      .get<any>('/ambientes', { limit: 100, estado: 'ACTIVO' })
      .subscribe({
        next: (r: any) => {
          this.todosAmbientes = r?.data?.items ?? r?.data ?? [];
        },
      });

    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarRestriccionesAlmuerzo();
      this.loadConflictos();
      if (this.docenteSeleccionado) {
        this.selectDocente(this.docenteSeleccionado);
      }
      if (this.ambienteSeleccionado) {
        this.selectAmbiente(this.ambienteSeleccionado);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.periodSub) {
      this.periodSub.unsubscribe();
    }
  }

  cargarRestriccionesAlmuerzo(): void {
    this.api.get<any>('/configuracion/restricciones', {
      periodo: this.periodoService.periodo,
    }).subscribe({
      next: (r: any) => {
        const restricciones = r?.data ?? [];
        const bloqueAlmuerzo = restricciones.find(
          (r: any) => r.tipo_restriccion === 'BLOQUE_ALMUERZO'
        );
        
        if (bloqueAlmuerzo && bloqueAlmuerzo.valor) {
          const val = bloqueAlmuerzo.valor;
          if (val.hora_inicio && val.hora_fin) {
            const [hInicio] = val.hora_inicio.split(':').map(Number);
            const [hFin] = val.hora_fin.split(':').map(Number);
            this.horaInicioAlmuerzo = hInicio;
            this.horaFinAlmuerzo = hFin;
            this.restriccionesCargadas = true;
          }
        }
      },
      error: () => {
        // Mantener valores por defecto si hay error
        this.horaInicioAlmuerzo = 12;
        this.horaFinAlmuerzo = 13;
      },
    });
  }

  private horaToDecimal(hora: string | undefined): number {
    if (!hora) return 0;
    const [h, m] = hora.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  getAsigDoc(dia: number, hora: number): HorarioAsignado | null {
    const hDecimal = hora;
    return (
      this.asignacionesDocente.find(
        (a) =>
          (a.dia_semana ?? a.dia) === dia &&
          this.horaToDecimal(a.hora_inicio) <= hDecimal &&
          this.horaToDecimal(a.hora_fin) > hDecimal,
      ) ?? null
    );
  }

  getAsigAmb(dia: number, hora: number): HorarioAsignado | null {
    const hDecimal = hora;
    return (
      this.asignacionesAmbiente.find(
        (a) =>
          (a.dia_semana ?? a.dia) === dia &&
          this.horaToDecimal(a.hora_inicio) <= hDecimal &&
          this.horaToDecimal(a.hora_fin) > hDecimal,
      ) ?? null
    );
  }

  clsDoc(dia: number, hora: number): string {
    const a = this.getAsigDoc(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  clsAmb(dia: number, hora: number): string {
    const a = this.getAsigAmb(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  fmtH(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  abrirAsignar(dia: number, hora: number): void {
    if (!this.docenteSeleccionado) return;
    const hInicio = this.fmtH(hora);
    const hFin = this.fmtH(hora + 2);

    const dialogRef = this.dialog.open(AsignarHorarioDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        docente: this.docenteSeleccionado,
        dia,
        horaInicio: hInicio,
        horaFin: hFin,
        periodo: this.periodoService.periodo,
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.selectDocente(this.docenteSeleccionado!);
      }
    });
  }

  get horasAsignadas(): number {
    return this.asignacionesDocente.length;
  }

  descargarPdfDocente(): void {
    if (!this.docenteSeleccionado) return;
    this.descargandoDoc = true;
    this.api
      .getBlob(`/reportes/docente/${this.docenteSeleccionado.id}/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoDoc = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.docenteSeleccionado!.apellidos}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoDoc = false;
          this.notif.error('Error al descargar PDF');
        },
      });
  }

  mostrarMensajeSinHorario(): void {
    this.notif.info('Este docente aún no tiene horarios asignados. Primero genere o asigne horarios.');
  }

  descargarICalendar(): void {
    if (!this.docenteSeleccionado) return;
    this.descargandoDoc = true;
    const timestamp = String(Date.now());
    this.api
      .getBlob(`/horarios/docente/${this.docenteSeleccionado.id}/ics`, {
        periodo: this.periodoService.periodo,
        _t: timestamp,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoDoc = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.docenteSeleccionado!.apellidos}_${this.periodoService.periodo}.ics`;
          a.click();
          URL.revokeObjectURL(url);
          this.notif.success('Archivo iCalendar descargado');
        },
        error: () => {
          this.descargandoDoc = false;
          this.notif.error('Error al descargar iCalendar');
        },
      });
  }

  getColorDocente(docenteId: number): string {
    const key = `docente_${docenteId}`;
    if (!this.colorMap.has(key)) {
      this.colorMap.set(key, this.colors[this.colorIndex % this.colors.length]);
      this.colorIndex++;
    }
    return this.colorMap.get(key)!;
  }

  getColorCurso(cursoId: number): string {
    const key = `curso_${cursoId}`;
    if (!this.colorMap.has(key)) {
      this.colorMap.set(key, this.colors[this.colorIndex % this.colors.length]);
      this.colorIndex++;
    }
    return this.colorMap.get(key)!;
  }

  getColorAmbiente(ambienteId: number): string {
    const key = `ambiente_${ambienteId}`;
    if (!this.colorMap.has(key)) {
      this.colorMap.set(key, this.colors[this.colorIndex % this.colors.length]);
      this.colorIndex++;
    }
    return this.colorMap.get(key)!;
  }

  esHoraAlmuerzo(hora: number): boolean {
    return hora >= this.horaInicioAlmuerzo && hora < this.horaFinAlmuerzo;
  }

  getEstiloCelda(asignacion: HorarioAsignado, tipo: 'docente' | 'ambiente' | 'ciclo'): any {
    const color = this.getColorForProfesor(asignacion.docente?.id);
    return {
      'background-color': color,
    };
  }

  private generarBloques(asignaciones: HorarioAsignado[]): any[] {
    console.log('[generarBloques] Input asignaciones:', asignaciones);
    const bloques: any[] = [];
    const bloquesPorDiaYHora: Map<string, any[]> = new Map();
    
    // Primero, fusionar horarios consecutivos
    const sortedAsignaciones = [...asignaciones].sort((a, b) => {
      const diaDiff = (a.dia_semana ?? a.dia) - (b.dia_semana ?? b.dia);
      if (diaDiff !== 0) return diaDiff;
      return this.horaToDecimal(a.hora_inicio) - this.horaToDecimal(b.hora_inicio);
    });

    const mergedAsignaciones: HorarioAsignado[] = [];
    const keyToAsignacionMap = new Map<string, HorarioAsignado>();

    sortedAsignaciones.forEach(asignacion => {
      const dia = asignacion.dia_semana ?? asignacion.dia;
      const key = `${asignacion.curso?.id}-${asignacion.docente?.id}-${asignacion.ambiente?.id}-${asignacion.grupo?.id}-${dia}-${asignacion.tipo_clase}`;
      
      const existing = keyToAsignacionMap.get(key);
      
      if (existing) {
        const existingHoraFin = this.horaToDecimal(existing.hora_fin);
        const currentHoraInicio = this.horaToDecimal(asignacion.hora_inicio);
        
        if (Math.abs(existingHoraFin - currentHoraInicio) < 0.1) {
          existing.hora_fin = asignacion.hora_fin;
        } else {
          keyToAsignacionMap.set(`${key}-${Date.now()}-${Math.random()}`, asignacion);
        }
      } else {
        keyToAsignacionMap.set(key, asignacion);
      }
    });

    const finalAsignaciones = Array.from(keyToAsignacionMap.values());
    console.log('[generarBloques] After merge, finalAsignaciones:', finalAsignaciones);

    finalAsignaciones.forEach(asignacion => {
      const dia = asignacion.dia_semana ?? asignacion.dia;
      const horaInicio = this.horaToDecimal(asignacion.hora_inicio);
      const horaFin = this.horaToDecimal(asignacion.hora_fin);
      console.log('[generarBloques] Procesando asignacion (merged):', { 
        curso: asignacion.curso?.nombre, 
        dia, 
        horaInicio, 
        horaFin 
      });
      
      const bloque = {
        key: `${asignacion.curso?.id}-${asignacion.docente?.id}-${asignacion.ambiente?.id}-${Date.now()}-${Math.random()}`,
        dia,
        horaInicio,
        horaFin,
        asignacion,
        asignaciones: [asignacion],
      };
      
      for (let h = Math.floor(horaInicio); h < horaFin; h++) {
        const key = `${dia}-${h}`;
        console.log('[generarBloques]   Checking h:', h, 'key:', key, 'is start:', h === Math.floor(horaInicio));
        if (!bloquesPorDiaYHora.has(key)) {
          bloquesPorDiaYHora.set(key, []);
        }
        if (h === Math.floor(horaInicio)) {
          console.log('[generarBloques]   Adding bloque to key:', key);
          bloquesPorDiaYHora.get(key)!.push(bloque);
        }
      }
    });

    bloquesPorDiaYHora.forEach((bloquesEnCelda, key) => {
      const anchoPorBloque = 100 / bloquesEnCelda.length;
      console.log('[generarBloques] Key:', key, 'bloquesEnCelda count:', bloquesEnCelda.length, 'ancho:', anchoPorBloque);
      bloquesEnCelda.forEach((bloque, index) => {
        bloque.left = index * anchoPorBloque;
        bloque.width = anchoPorBloque;
        console.log('[generarBloques]   Adding final bloque:', { 
          curso: bloque.asignacion.curso?.nombre, 
          left: bloque.left, 
          width: bloque.width, 
          height: (bloque.horaFin - bloque.horaInicio) * 120 
        });
        bloques.push(bloque);
      });
    });

    const sorted = bloques.sort((a, b) => {
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.horaInicio - b.horaInicio;
    });
    console.log('[generarBloques] Final bloques:', sorted);
    return sorted;
  }

  private bloquesDocente: any[] = [];
  private bloquesAmbiente: any[] = [];
  private bloquesCiclo: any[] = [];
  private profesorColorMap = new Map<number, string>();
  private readonly profesorColors = [
    '#FFCDD2',
    '#F8BBD9',
    '#F0B27A',
    '#F9E79F',
    '#D5F5E3',
    '#AED6F1',
    '#D7BDE2',
    '#FADBD8',
    '#A9DFBF',
    '#F9EBEA',
    '#D4EFDF',
    '#A9CCE3',
    '#E8DAEF',
    '#F5EEF8',
    '#EBF5FB',
  ];

  selectDocente(d: Docente): void {
    this.docenteSeleccionado = d;
    this.loadingDocente = true;
    this.api
      .get<
        ApiResponse<any>
      >(`/horarios/docente/${d.id}`, { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.asignacionesDocente = r.data?.items ?? r.data ?? [];
          console.log('[selectDocente] asignacionesDocente:', this.asignacionesDocente);
          this.bloquesDocente = this.generarBloques(this.asignacionesDocente);
          console.log('[selectDocente] bloquesDocente:', this.bloquesDocente);
          this.loadingDocente = false;
        },
        error: () => {
          this.loadingDocente = false;
        },
      });
  }

  selectAmbiente(a: Ambiente): void {
    this.ambienteSeleccionado = a;
    this.loadingAmbiente = true;
    this.api
      .get<
        ApiResponse<any>
      >(`/horarios/ambiente/${a.id}`, { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.asignacionesAmbiente = r.data?.items ?? r.data ?? [];
          this.bloquesAmbiente = this.generarBloques(this.asignacionesAmbiente);
          this.loadingAmbiente = false;
        },
        error: () => {
          this.loadingAmbiente = false;
        },
      });
  }

  selectCiclo(ciclo: number): void {
    this.cicloSeleccionado = ciclo;
    this.loadingCiclo = true;
    this.api
      .get<ApiResponse<any>>(`/horarios/periodo/${this.periodoService.periodo}`, {
        limit: 500,
      })
      .subscribe({
        next: (r) => {
          const allAsignaciones: HorarioAsignado[] = r.data?.items ?? r.data ?? [];
          this.asignacionesCiclo = allAsignaciones.filter(a => 
            a.curso && a.curso.ciclo === ciclo
          );
          this.bloquesCiclo = this.generarBloques(this.asignacionesCiclo);
          this.loadingCiclo = false;
        },
        error: () => {
          this.loadingCiclo = false;
        },
      });
  }

  getBloques(dia: number, hora: number, tipo: 'docente' | 'ambiente' | 'ciclo'): any[] {
    let bloques: any[];
    if (tipo === 'docente') {
      bloques = this.bloquesDocente;
    } else if (tipo === 'ambiente') {
      bloques = this.bloquesAmbiente;
    } else {
      bloques = this.bloquesCiclo;
    }

    return bloques.filter(b => 
      b.dia === dia && 
      Math.floor(b.horaInicio) === hora
    );
  }

  getColorForProfesor(docenteId: number | undefined): string {
    if (!docenteId) return this.profesorColors[0];
    
    if (!this.profesorColorMap.has(docenteId)) {
      const index = this.profesorColorMap.size % this.profesorColors.length;
      this.profesorColorMap.set(docenteId, this.profesorColors[index]);
    }
    
    return this.profesorColorMap.get(docenteId)!;
  }

  getAlturaBloque(bloque: any): string {
    const horas = bloque.horaFin - bloque.horaInicio;
    return `${horas * 80}px`;
  }

  loadConflictos(): void {
    this.loadingConflictos = true;
    this.api
      .get<
        ApiResponse<any>
      >(`/horarios/conflictos/${this.periodoService.periodo}`)
      .subscribe({
        next: (r) => {
          this.conflictos = r.data?.items ?? r.data ?? [];
          this.loadingConflictos = false;
        },
        error: () => {
          this.loadingConflictos = false;
        },
      });
  }

  resolverConflicto(c: ConflictoAsignacion): void {
    const motivo = window.prompt(
      'Ingrese el motivo de la resolución:',
      'Resuelto manualmente',
    );
    if (motivo === null) return;
    this.api
      .patch<
        ApiResponse<any>
      >(`/horarios/conflictos/${c.id}/resolver`, { motivo: motivo.trim() || 'Resuelto manualmente' })
      .subscribe({
        next: () => {
          this.notif.success('Conflicto resuelto');
          this.loadConflictos();
        },
        error: () => this.notif.error('Error al resolver conflicto'),
      });
  }

  generarHorario(): void {
    if (
      !confirm(
        `¿Generar horario automático para el período ${this.periodoService.periodo}? Puede tardar varios minutos.`,
      )
    )
      return;

    this.generando = true;
    this.api
      .post<any>('/horarios/generar', { periodo: this.periodoService.periodo })
      .subscribe({
        next: (r) => {
          this.generando = false;
          this.resultadoGeneracion = r.data;
          this.notif.success('Horario generado exitosamente');
          this.loadConflictos();
        },
        error: () => {
          this.generando = false;
          this.notif.error('Error al generar horario');
        },
      });
  }

  depurarHorarios(): void {
    this.loadingDebug = true;
    this.api
      .get<any>(`/horarios/debug/${this.periodoService.periodo}`)
      .subscribe({
        next: (r) => {
          this.loadingDebug = false;
          this.debugResult = r.data;
          console.log('Debug result:', r.data);
          this.notif.success(
            `Depuración completada: ${r.data.inconsistentes} horarios inconsistentes`,
          );
        },
        error: () => {
          this.loadingDebug = false;
          this.notif.error('Error al depurar horarios');
        },
      });
  }

  limpiarHorario(): void {
    const p = this.periodoService.periodo;
    if (
      !confirm(
        `¿Limpiar TODOS los horarios del período ${p}? Esta acción es IRREVERSIBLE.`,
      )
    )
      return;
    if (!confirm(`Confirmación final: eliminar todos los horarios de ${p}`))
      return;
    this.limpiando = true;
    this.api
      .delete<ApiResponse<any>>(`/horarios/limpiar?periodo=${p}`)
      .subscribe({
        next: () => {
          this.limpiando = false;
          this.asignacionesDocente = [];
          this.asignacionesAmbiente = [];
          this.conflictos = [];
          this.notif.success('Horarios eliminados');
        },
        error: () => {
          this.limpiando = false;
          this.notif.error('Error al limpiar horarios');
        },
      });
  }

  // ─── VISTA POR CICLO ────────────────────────────────────────────────────────

  getAsigCiclo(dia: number, hora: number): HorarioAsignado | null {
    const hDecimal = hora;
    return (
      this.asignacionesCiclo.find(
        (a) =>
          (a.dia_semana ?? a.dia) === dia &&
          this.horaToDecimal(a.hora_inicio) <= hDecimal &&
          this.horaToDecimal(a.hora_fin) > hDecimal,
      ) ?? null
    );
  }

  clsCiclo(dia: number, hora: number): string {
    const a = this.getAsigCiclo(dia, hora);
    if (!a) return 'celda-vacia';
    return a.tipo_clase === 'LABORATORIO' ? 'celda-lab' : 'celda-teoria';
  }

  getProfesoresYCursos(): any[] {
    const map = new Map<string, any>();
    
    this.asignacionesCiclo.forEach(a => {
      const key = a.docente?.id + '-' + a.curso?.id;
      if (!map.has(key)) {
        map.set(key, {
          docente: a.docente,
          curso: a.curso,
          horas: 0,
          ambiente: a.ambiente,
        });
      }
      const entry = map.get(key);
      const hInicio = this.horaToDecimal(a.hora_inicio);
      const hFin = this.horaToDecimal(a.hora_fin);
      entry.horas += (hFin - hInicio);
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.docente?.apellidos || '';
      const nameB = b.docente?.apellidos || '';
      return nameA.localeCompare(nameB);
    });
  }

  descargarPdfCiclo(): void {
    if (!this.cicloSeleccionado) return;
    this.descargandoCiclo = true;
    this.api
      .getBlob(`/reportes/ciclo/${this.cicloSeleccionado}/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoCiclo = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_ciclo_${this.cicloSeleccionado}_${this.periodoService.periodo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoCiclo = false;
          this.notif.error('Error al descargar PDF');
        },
      });
  }

  descargarTodoPdf(): void {
    this.descargandoTodo = true;
    this.descargandoTodoPdfStatus = true;
    this.api
      .getBlob(`/reportes/todos-ciclos/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoTodo = false;
          this.descargandoTodoPdfStatus = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horarios_todos_ciclos_${this.periodoService.periodo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.notif.success('PDF consolidado descargado');
        },
        error: () => {
          this.descargandoTodo = false;
          this.descargandoTodoPdfStatus = false;
          this.notif.error('Error al descargar PDF consolidado');
        },
      });
  }

  descargarTodoExcel(): void {
    this.descargandoTodo = true;
    this.descargandoTodoExcelStatus = true;
    this.api
      .getBlob(`/reportes/todos-ciclos/excel`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoTodo = false;
          this.descargandoTodoExcelStatus = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horarios_todos_ciclos_${this.periodoService.periodo}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          this.notif.success('Excel por ciclos descargado');
        },
        error: () => {
          this.descargandoTodo = false;
          this.descargandoTodoExcelStatus = false;
          this.notif.error('Error al descargar Excel');
        },
      });
  }
}
