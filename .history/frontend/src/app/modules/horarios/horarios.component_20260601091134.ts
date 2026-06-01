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
  descargandoDocExcel = false;

  // Tab 2 — Vista Ambiente
  todosAmbientes: Ambiente[] = [];
  ambienteSeleccionado: Ambiente | null = null;
  asignacionesAmbiente: HorarioAsignado[] = [];
  loadingAmbiente = false;
  descargandoAmbiente = false;
  descargandoAmbienteExcel = false;

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
  descargandoCicloExcel = false;
  descargandoTodo = false;
  descargandoTodoPdfStatus = false;
  descargandoTodoExcelStatus = false;

  // Tab 5 — Vista por Día
  diaSeleccionado: number | null = null;
  asignacionesDia: HorarioAsignado[] = [];
  loadingDia = false;

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
      if (this.diaSeleccionado) {
        this.selectDia(this.diaSeleccionado);
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

  descargarExcelDocente(): void {
    if (!this.docenteSeleccionado) return;
    this.descargandoDocExcel = true;
    this.api
      .getBlob(`/reportes/docente/${this.docenteSeleccionado.id}/excel`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoDocExcel = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_${this.docenteSeleccionado!.apellidos}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoDocExcel = false;
          this.notif.error('Error al descargar Excel');
        },
      });
  }

  descargarPdfAmbiente(): void {
    if (!this.ambienteSeleccionado) return;
    this.descargandoAmbiente = true;
    this.api
      .getBlob(`/reportes/ambiente/${this.ambienteSeleccionado.id}/pdf`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoAmbiente = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_ambiente_${this.ambienteSeleccionado!.codigo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoAmbiente = false;
          this.notif.error('Error al descargar PDF');
        },
      });
  }

  descargarExcelAmbiente(): void {
    if (!this.ambienteSeleccionado) return;
    this.descargandoAmbienteExcel = true;
    this.api
      .getBlob(`/reportes/ambiente/${this.ambienteSeleccionado.id}/excel`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoAmbienteExcel = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_ambiente_${this.ambienteSeleccionado!.codigo}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoAmbienteExcel = false;
          this.notif.error('Error al descargar Excel');
        },
      });
  }

  mostrarMensajeSinHorario(): void {
    this.notif.info('No hay horarios asignados para este elemento en el periodo actual.');
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
    const color = this.getColorForProfesorCurso(asignacion.docente?.id, asignacion.curso?.id);
    return {
      'background-color': color,
    };
  }

  private generarBloques(asignaciones: HorarioAsignado[]): any[] {
    const bloquesFinales: any[] = [];
    
    // Agrupar asignaciones por día
    const asignacionesPorDia: Map<number, HorarioAsignado[]> = new Map();
    asignaciones.forEach(a => {
      const dia = a.dia_semana ?? a.dia;
      if (!asignacionesPorDia.has(dia)) asignacionesPorDia.set(dia, []);
      asignacionesPorDia.get(dia)!.push(a);
    });

    asignacionesPorDia.forEach((asigs, dia) => {
      // Ordenar asignaciones del día por hora de inicio
      const sortedAsigs = [...asigs].sort((a, b) => {
        const hIniA = this.horaToDecimal(a.hora_inicio);
        const hIniB = this.horaToDecimal(b.hora_inicio);
        if (hIniA !== hIniB) return hIniA - hIniB;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      // Lane assignment algorithm (Interval Scheduling)
      const carriles: HorarioAsignado[][] = [];
      
      sortedAsigs.forEach(asig => {
        const hIni = this.horaToDecimal(asig.hora_inicio);
        
        let carrilIndex = -1;
        
        // 1. Prioridad: Buscar un carril que termine exactamente donde empieza este y sea del mismo curso
        for (let i = 0; i < carriles.length; i++) {
          const ultimoEnCarril = carriles[i][carriles[i].length - 1];
          const hFinUltimo = this.horaToDecimal(ultimoEnCarril.hora_fin);
          if (Math.abs(hFinUltimo - hIni) < 0.01 && ultimoEnCarril.curso?.id === asig.curso?.id) {
            carrilIndex = i;
            break;
          }
        }

        // 2. Segunda opción: Buscar cualquier carril libre
        if (carrilIndex === -1) {
          for (let i = 0; i < carriles.length; i++) {
            const ultimoEnCarril = carriles[i][carriles[i].length - 1];
            const hFinUltimo = this.horaToDecimal(ultimoEnCarril.hora_fin);
            if (hFinUltimo <= hIni) {
              carrilIndex = i;
              break;
            }
          }
        }

        if (carrilIndex === -1) {
          carriles.push([asig]);
        } else {
          carriles[carrilIndex].push(asig);
        }
      });

      const numCarriles = carriles.length;
      
      // Pre-procesar bloques para calcular anchos dinámicos
      const todosLosBloquesDelDia: any[] = [];

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        bloquesEnCarril.forEach(asig => {
          const hIni = this.horaToDecimal(asig.hora_inicio);
          const hFin = this.horaToDecimal(asig.hora_fin);
          todosLosBloquesDelDia.push({
            asig,
            carrilIdx,
            hIni,
            hFin
          });
        });
      });

      carriles.forEach((bloquesEnCarril, carrilIdx) => {
        // Fusión visual de bloques consecutivos del mismo curso
        const bloquesFusionados: any[] = [];
        
        bloquesEnCarril.forEach(asig => {
          const hIni = this.horaToDecimal(asig.hora_inicio);
          const hFin = this.horaToDecimal(asig.hora_fin);
          const dur = hFin - hIni;
          const labelPart = asig.tipo_clase === 'TEORIA' ? `${dur}T` : 
                           asig.tipo_clase === 'PRACTICA' ? `${dur}P` : 
                           `${dur}L-G${asig.grupo?.codigo?.match(/-G(\d+)$/)?.[1] || ''}`;

          // Calcular el número máximo de carriles ocupados durante este bloque
          let maxCarrilIdxEnIntervalo = 0;
          todosLosBloquesDelDia.forEach(otro => {
            // Si hay solapamiento temporal
            if (hIni < otro.hFin && otro.hIni < hFin) {
              if (otro.carrilIdx > maxCarrilIdxEnIntervalo) {
                maxCarrilIdxEnIntervalo = otro.carrilIdx;
              }
            }
          });
          
          const numCarrilesLocales = maxCarrilIdxEnIntervalo + 1;
          const widthPorBloque = 100 / numCarrilesLocales;

          if (bloquesFusionados.length > 0) {
            const ultimo = bloquesFusionados[bloquesFusionados.length - 1];
            // Si son del mismo curso y son consecutivos
            // REGLA: Solo fusionar si son TEORIA y PRACTICA (en cualquier orden) Y MISMO AMBIENTE
            const esTP = (ultimo.asignacion.tipo_clase === 'TEORIA' && asig.tipo_clase === 'PRACTICA') ||
                         (ultimo.asignacion.tipo_clase === 'PRACTICA' && asig.tipo_clase === 'TEORIA');
            
            const mismoAmbiente = ultimo.asignacion.ambiente?.id === asig.ambiente?.id;

            if (esTP && mismoAmbiente && ultimo.asignacion.curso?.id === asig.curso?.id && Math.abs(ultimo.horaFin - hIni) < 0.01) {
              ultimo.horaFin = hFin;
              ultimo.totalHoraFin = asig.hora_fin.substring(0, 5);
              ultimo.label = ultimo.label.split(' (')[0] + ' (' + ultimo.label.match(/\((.*)\)/)?.[1] + '+' + labelPart + ')';
              ultimo.tiposClase.push(asig.tipo_clase);
              ultimo.asignaciones.push(asig);
              // Actualizar el ancho si el nuevo bloque fusionado tiene más colisiones
              if (numCarrilesLocales > (100 / ultimo.width)) {
                ultimo.width = 100 / numCarrilesLocales;
                ultimo.left = carrilIdx * ultimo.width;
              }
              return;
            }
          }

          bloquesFusionados.push({
            key: `${asig.id}-${Date.now()}-${Math.random()}`,
            dia,
            horaInicio: hIni,
            horaFin: hFin,
            totalHoraInicio: asig.hora_inicio.substring(0, 5),
            totalHoraFin: asig.hora_fin.substring(0, 5),
            tiposClase: [asig.tipo_clase],
            asignacion: asig,
            asignaciones: [asig],
            left: carrilIdx * widthPorBloque,
            width: widthPorBloque,
            label: (asig.curso?.nombre || '') + ` (${labelPart})`
          });
        });

        bloquesFinales.push(...bloquesFusionados);
      });
    });

    return bloquesFinales.sort((a, b) => {
      if (a.dia !== b.dia) return a.dia - b.dia;
      return a.horaInicio - b.horaInicio;
    });
  }

  private bloquesDocente: any[] = [];
  private bloquesAmbiente: any[] = [];
  private bloquesCiclo: any[] = [];
  private profesorCursoColorMap = new Map<string, string>();
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
    this.profesorCursoColorMap.clear(); // Limpiar para recalculas colores por curso
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
    this.profesorCursoColorMap.clear();
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
    this.profesorCursoColorMap.clear();
    this.api
      .get<ApiResponse<any>>(`/horarios/periodo/${this.periodoService.periodo}`, {
        limit: 1000,
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

  selectDia(diaNum: number): void {
    this.diaSeleccionado = diaNum;
    this.loadingDia = true;
    this.api
      .get<ApiResponse<any>>(`/horarios/dia/${diaNum}`, {
        periodo: this.periodoService.periodo,
        limit: 1000,
      })
      .subscribe({
        next: (r) => {
          this.asignacionesDia = r.data?.items ?? r.data ?? [];
          this.loadingDia = false;
        },
        error: () => (this.loadingDia = false),
      });
  }

  getNombreDia(diaNum: number): string {
    const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return nombres[diaNum - 1] || 'Día';
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

  getColorForProfesorCurso(docenteId: number | undefined, cursoId: number | undefined): string {
    if (!docenteId || !cursoId) return this.profesorColors[0];
    
    const key = `${docenteId}-${cursoId}`;
    if (!this.profesorCursoColorMap.has(key)) {
      const index = this.profesorCursoColorMap.size % this.profesorColors.length;
      this.profesorCursoColorMap.set(key, this.profesorColors[index]);
    }
    
    return this.profesorCursoColorMap.get(key)!;
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
          hTeoria: 0,
          hPractica: 0,
          hLaboratorio: 0,
          ambiente: a.ambiente,
          gruposIds: new Set<number>(),
        });
      }
      const entry = map.get(key);
      const hInicio = this.horaToDecimal(a.hora_inicio);
      const hFin = this.horaToDecimal(a.hora_fin);
      const duration = (hFin - hInicio);
      entry.horas += duration;

      if (a.tipo_clase === 'TEORIA') entry.hTeoria += duration;
      else if (a.tipo_clase === 'PRACTICA') entry.hPractica += duration;
      else if (a.tipo_clase === 'LABORATORIO') {
        entry.hLaboratorio += duration;
        if (a.grupo?.id) entry.gruposIds.add(a.grupo.id);
      }
    });

    const hierarchy: { [key: string]: number } = {
      'PRINCIPAL': 1,
      'ASOCIADO': 2,
      'AUXILIAR': 3,
      'SIN_CATEGORIA': 4
    };

    return Array.from(map.values()).map(item => ({
      ...item,
      g: item.gruposIds.size || (item.curso?.tiene_laboratorio ? 1 : 0)
    })).sort((a, b) => {
      const docA = a.docente;
      const docB = b.docente;

      // 1. Priorizar Departamento de Ingeniería de Sistemas
      const isSistemasA = docA?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      const isSistemasB = docB?.departamento?.nombre === 'Ing. de Sistemas' ? 1 : 0;
      if (isSistemasA !== isSistemasB) return isSistemasB - isSistemasA;

      // 2. Jerarquía de mayor a menor (Principal > Asociado > Auxiliar)
      const rankA = hierarchy[docA?.categoria] || 99;
      const rankB = hierarchy[docB?.categoria] || 99;
      if (rankA !== rankB) return rankA - rankB;

      // 3. Alfabético por apellidos
      const nameA = docA?.apellidos || '';
      const nameB = docB?.apellidos || '';
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

  descargarExcelCiclo(): void {
    if (!this.cicloSeleccionado) return;
    this.descargandoCicloExcel = true;
    this.api
      .getBlob(`/reportes/ciclo/${this.cicloSeleccionado}/excel`, {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (blob) => {
          this.descargandoCicloExcel = false;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `horario_ciclo_${this.cicloSeleccionado}_${this.periodoService.periodo}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargandoCicloExcel = false;
          this.notif.error('Error al descargar Excel');
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
