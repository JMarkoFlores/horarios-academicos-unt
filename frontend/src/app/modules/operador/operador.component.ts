import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { VentanaAtencion, ApiResponse, Curso, Ambiente } from '../../core/interfaces/entities';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GrillaHorariosComponent } from './grilla-horarios/grilla-horarios.component';

function generarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Component({
  selector: 'app-operador',
  templateUrl: './operador.component.html',
  styleUrls: ['./operador.component.scss']
})
export class OperadorComponent implements OnInit, OnDestroy {
  @ViewChild('grillaRef') grillaRef!: GrillaHorariosComponent;

  ventanaForm: FormGroup;
  ventanas: VentanaAtencion[] = [];
  ventanasFiltradas: VentanaAtencion[] = [];
  ventanaActiva: VentanaAtencion | null = null;
  loading = false;
  creandoVentana = false;
  mostrarFormulario = false;
  private periodSub?: Subscription;

  // Paginación
  paginaActual = 1;
  elementosPorPagina = 6;

  // Filtros
  filtroEstado = '';
  filtroProposito = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  // Sugerencias de capacidad
  mostrarSugerencias = false;
  sugerenciasCapacidad: string[] = [];
  errorOriginal: string = '';
  distribucionSugerida: any = null;
  mostrandoDistribucion = false;
  creandoVentanasMultiples = false;

  propositos = [
    { value: '', label: 'Todos los propósitos' },
    { value: 'DECLARACION', label: 'Declaración Inicial' },
    { value: 'SUBSANACION', label: 'Subsanación' },
    { value: 'CAMBIO', label: 'Cambio de Horario' },
    { value: 'CONTINGENCIA', label: 'Contingencia' },
  ];

  estados = [
    { value: '', label: 'Todos' },
    { value: 'PROGRAMADA', label: 'Programada' },
    { value: 'EN_CURSO', label: 'En curso' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

  // Información detallada por categoría de ventana
  propositosInfo = {
    'DECLARACION': {
      titulo: 'Declaración Inicial',
      descripcion: 'Para docentes que NO tienen horario asignado en el período.',
      usos: [
        'Convocatoria inicial de docentes al inicio del período académico',
        'Atender docentes sin horario previo',
        'Distribución equitativa de cursos'
      ],
      recomendaciones: 'Ideal para períodos nuevos con muchos docentes pendientes'
    },
    'SUBSANACION': {
      titulo: 'Subsanación',
      descripcion: 'Para docentes que YA TIENEN horario y necesitan correcciones puntuales.',
      usos: [
        'Corregir errores en horarios ya asignados',
        'Resolver conflictos detectados',
        'Ajustes puntuales en asignaciones'
      ],
      recomendaciones: 'Selecciona solo los docentes con problemas reales. Pre-asigna desde conflictos.'
    },
    'CAMBIO': {
      titulo: 'Cambio de Horario',
      descripcion: 'Para docentes con horario que solicitan cambios de horario o ambiente.',
      usos: [
        'Atender solicitudes de cambio de horario',
        'Reasignación de docentes con horario existente',
        'Cambios por ajustes de oferta académica'
      ],
      recomendaciones: 'Asigna solo docentes que solicitaron cambio formal'
    },
    'PRINCIPAL': {
      titulo: 'Principal',
      descripcion: 'Para atender docentes de categoría académica Principal.',
      usos: [
        'Ventanas exclusivas para docentes Principal',
        'Atención prioritaria por jerarquía',
        'Casos especiales de docentes principales'
      ],
      recomendaciones: 'Filtra automáticamente por categoría de docente'
    },
    'CONTINGENCIA': {
      titulo: 'Contingencia',
      descripcion: 'Para casos excepcionales o incidencias no programadas.',
      usos: [
        'Manejo de emergencias académicas',
        'Reasignaciones de última hora',
        'Casos especiales o excepciones'
      ],
      recomendaciones: 'Usa bajo demanda cuando surjan situaciones excepcionales'
    }
  };

  // Estado de pre-asignación
  mostrandoSeleccionDocentes = false;
  docentesDisponibles: any[] = [];
  docentesSeleccionados: Set<number> = new Set();
  cargandoDocentes = false;
  ventanaActualParaAsignar: VentanaAtencion | null = null;

  // Estado de atención activa
  sesionId!: string;
  docenteActual: any = null;
  cursosDocente: any[] = [];
  ambientesDocente: Ambiente[] = [];
  horariosDocente: any[] = [];

  cursoSeleccionado: any = null;
  tipoClase = 'TEORIA';
  grupoSeleccionado = 1;
  gruposDisponibles = 1;
  ambienteSeleccionado: Ambiente | null = null;
  filtroAmbiente = '';
  filtroCurso = '';

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    public periodoService: PeriodoService,
    private snack: MatSnackBar
  ) {
    // Limpiar sesión anterior antes de generar nuevo sessionId
    const sesionAnterior = localStorage.getItem('sesionId');
    const ventanaId = localStorage.getItem('ventanaActivaId');
    
    if (sesionAnterior && ventanaId) {
      this.api.post(`/ventanas/${ventanaId}/limpiar-sesion`, { sesionId: sesionAnterior }).subscribe({
        next: () => {
          console.log('Sesión anterior limpiada:', sesionAnterior);
        },
        error: (err) => console.error('Error limpiando sesión anterior:', err)
      });
    }
    
    // Generar nuevo sessionId después de limpiar la anterior
    this.sesionId = generarUUID();
    
    const today = new Date();
    const localDate = today.getFullYear() + '-' +
      ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
      ('0' + today.getDate()).slice(-2);

    this.ventanaForm = this.fb.group({
      periodo: [this.periodoService.periodo, Validators.required],
      fecha: [localDate, Validators.required],
      hora_inicio: ["09:00", Validators.required],
      hora_fin: ["17:00", Validators.required],
      proposito: ["DECLARACION", Validators.required],
      filtro_categorias_docente: [[]],
      modalidad: [null],
      intervalo_minutos: [30, [Validators.min(5), Validators.max(60)]],
      sinAsignarDocentes: [false]
    });
    
    // Guardar sessionId actual para limpieza futura
    localStorage.setItem('sesionId', this.sesionId);
  }

  ngOnInit(): void {
    this.cargarVentanas();
    this.checkVentanaActiva();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarVentanas();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  cargarVentanas(): void {
    const params: any = { periodo: this.periodoService.periodo };
    if (this.filtroEstado) params.estado = this.filtroEstado;
    if (this.filtroProposito) params.proposito = this.filtroProposito;
    this.api.get<ApiResponse<VentanaAtencion[]>>('/ventanas', params).subscribe(r => {
      this.ventanas = (r.data || []).slice().sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora_inicio}`).getTime();
        const fechaB = new Date(`${b.fecha}T${b.hora_inicio}`).getTime();
        return fechaA - fechaB;
      });
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    let filtradas = [...this.ventanas];

    // Filtrar por estado
    if (this.filtroEstado) {
      filtradas = filtradas.filter(v => v.estado === this.filtroEstado);
    }

    // Filtrar por propósito
    if (this.filtroProposito) {
      filtradas = filtradas.filter(v => v.proposito === this.filtroProposito);
    }

    // Filtrar por rango de fechas
    if (this.filtroFechaInicio) {
      const fechaInicio = new Date(this.filtroFechaInicio);
      filtradas = filtradas.filter(v => new Date(v.fecha) >= fechaInicio);
    }

    if (this.filtroFechaFin) {
      const fechaFin = new Date(this.filtroFechaFin);
      filtradas = filtradas.filter(v => new Date(v.fecha) <= fechaFin);
    }

    // Ordenar por fecha ascendente (más antiguo a más reciente)
    filtradas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora_inicio}`).getTime();
      const fechaB = new Date(`${b.fecha}T${b.hora_inicio}`).getTime();
      return fechaA - fechaB;
    });

    this.ventanasFiltradas = filtradas;
    this.paginaActual = 1; // Resetear a primera página
  }

  onFiltroChange(): void {
    this.cargarVentanas();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroProposito = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  // Paginación
  get totalPaginas(): number {
    return Math.ceil(this.ventanasFiltradas.length / this.elementosPorPagina);
  }

  get ventanasPaginadas(): VentanaAtencion[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.ventanasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  get ventanasProgramadas(): VentanaAtencion[] {
    return this.ventanasFiltradas.filter(v => v.estado === 'PROGRAMADA');
  }

  get ventanasCompletadas(): VentanaAtencion[] {
    return this.ventanasFiltradas.filter(v => v.estado === 'COMPLETADA');
  }

  get ventanasCanceladas(): VentanaAtencion[] {
    return this.ventanasFiltradas.filter(v => v.estado === 'CANCELADA');
  }

  puedeEliminar(ventana: VentanaAtencion): boolean {
    return ventana.estado === 'PROGRAMADA' || ventana.estado === 'CANCELADA' || ventana.estado === 'COMPLETADA';
  }

  puedeIniciar(ventana: VentanaAtencion): boolean {
    return ventana.estado === 'PROGRAMADA';
  }

  eliminarTodasVentanas(): void {
    if (!confirm('¿Seguro que desea eliminar TODAS las ventanas? Esta acción no se puede deshacer.')) return;
    this.api.delete<ApiResponse<any>>('/ventanas/all').subscribe({
      next: () => {
        this.snack.open('Todas las ventanas eliminadas', 'OK', { duration: 3000 });
        this.cargarVentanas();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar ventanas';
        this.snack.open(Array.isArray(msg) ? msg.join(', ') : msg, 'Error', { duration: 5000 });
      }
    });
  }

  eliminarVentana(ventana: VentanaAtencion): void {
    if (!confirm(`¿Eliminar ventana del ${new Date(ventana.fecha).toLocaleDateString()} (${ventana.proposito})?`)) return;
    this.api.delete<ApiResponse<any>>(`/ventanas/${ventana.id}`).subscribe({
      next: () => {
        this.snack.open('Ventana eliminada', 'OK', { duration: 3000 });
        this.cargarVentanas();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar ventana';
        this.snack.open(Array.isArray(msg) ? msg.join(', ') : msg, 'Error', { duration: 5000 });
      }
    });
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      EN_CURSO: 'En curso',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return map[estado] || estado;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'programada',
      EN_CURSO: 'en-curso',
      COMPLETADA: 'completada',
      CANCELADA: 'cancelada',
    };
    return map[estado] || '';
  }

  getPropositoLabel(cat: string): string {
    const labels: Record<string, string> = {
      DECLARACION: 'Declaración Inicial',
      SUBSANACION: 'Subsanación',
      CAMBIO: 'Cambio de Horario',
      PRINCIPAL: 'Principal',
      CONTINGENCIA: 'Contingencia'
    };
    return labels[cat] || cat;
  }

  checkVentanaActiva(): void {
    this.api.get<ApiResponse<VentanaAtencion>>('/ventanas/activa').subscribe({
      next: (r) => {
        this.ventanaActiva = r.data || null;
        console.log('[Operador] ventanaActiva =', this.ventanaActiva);
        if (this.ventanaActiva) {
          localStorage.setItem('ventanaActivaId', this.ventanaActiva.id);
        }
      },
      error: (err) => {
        console.error('[Operador] checkVentanaActiva error:', err);
        this.ventanaActiva = null;
      }
    });
  }

  onDocenteEnAtencion(docente: any): void {
    this.docenteActual = docente;
    this.cursoSeleccionado = null;
    this.ambienteSeleccionado = null;
    if (docente) {
      this.cargarCursosDocente(docente.id);
      this.cargarAmbientesDocente(docente.id);
      this.cargarHorariosDocente(docente.id);
    }
  }

  cargarCursosDocente(docenteId: number): void {
    this.api.get<ApiResponse<any[]>>(`/docentes/${docenteId}/cursos`, { periodo: this.periodoService.periodo }).subscribe(r => {
      const cursos = r.data || [];
      // Agrupar cursos por cursoId para no repetir por tipo de clase
      const cursosUnicos = new Map<number, any>();
      cursos.forEach(c => {
        if (!cursosUnicos.has(c.cursoId)) {
          cursosUnicos.set(c.cursoId, {
            cursoId: c.cursoId,
            curso: c.curso,
            tiposClase: []
          });
        }
        cursosUnicos.get(c.cursoId).tiposClase.push({
          tipo: c.tipo_clase,
          grupos: c.grupos || 1
        });
      });
      this.cursosDocente = Array.from(cursosUnicos.values());
    });
  }

  cargarAmbientesDocente(docenteId: number): void {
    this.api.get<ApiResponse<Ambiente[]>>(`/docentes/${docenteId}/ambientes`).subscribe(r => {
      this.ambientesDocente = r.data || [];
    });
  }

  cargarHorariosDocente(docenteId: number): void {
    this.api.get<ApiResponse<any>>(`/horarios/docente/${docenteId}`, { periodo: this.periodoService.periodo }).subscribe(r => {
      this.horariosDocente = r.data?.items || [];
      
      // Si es laboratorio o práctica y hay horarios confirmados para el grupo seleccionado, seleccionar automáticamente el ambiente
      if ((this.tipoClase === 'LABORATORIO' || this.tipoClase === 'PRACTICA') && this.grupoSeleccionado && this.cursoSeleccionado) {
        const horariosGrupo = this.horariosDocente.filter(h => 
          h.curso_id === this.cursoSeleccionado.cursoId && 
          (h.tipo_clase === 'LABORATORIO' || h.tipo_clase === 'PRACTICA')
        );
        // Filtrar por grupo específico
        const horariosGrupoEspecifico = horariosGrupo.filter(h => {
          if (!h.grupo) return false;
          const grupoMatch = h.grupo.codigo?.match(/-G(\d+)$/);
          return grupoMatch && parseInt(grupoMatch[1], 10) === this.grupoSeleccionado;
        });
        if (horariosGrupoEspecifico.length > 0) {
          const ambienteId = horariosGrupoEspecifico[0].ambiente_id;
          const ambiente = this.ambientesDocente.find(a => a.id === ambienteId);
          if (ambiente && !this.ambienteSeleccionado) {
            this.ambienteSeleccionado = ambiente;
            console.log('[Operador] Ambiente seleccionado automáticamente para grupo:', this.grupoSeleccionado, ambiente.codigo);
          }
        }
      }
    });
  }

  seleccionarCurso(curso: any): void {
    this.cursoSeleccionado = curso;
    this.ambienteSeleccionado = null;
    // Seleccionar el primer tipo de clase disponible por defecto
    if (curso.tiposClase && curso.tiposClase.length > 0) {
      this.tipoClase = curso.tiposClase[0].tipo;
      const tipoInfo = curso.tiposClase[0];
      this.gruposDisponibles = tipoInfo ? tipoInfo.grupos : 1;
      this.grupoSeleccionado = 1;
      this.cargarAmbientesCompatibles(curso.cursoId, this.tipoClase);
    }
    // Limpiar selecciones temporales cuando cambie el curso
    this.limpiarSeleccionesTemporales();
  }

  seleccionarTipoClase(curso: any, tipo: string): void {
    this.tipoClase = tipo;
    this.ambienteSeleccionado = null;
    // Obtener el número de grupos para este tipo de clase
    const tipoInfo = curso.tiposClase.find((t: any) => t.tipo === tipo);
    this.gruposDisponibles = tipoInfo ? tipoInfo.grupos : 1;
    this.grupoSeleccionado = 1;
    this.cargarAmbientesCompatibles(curso.cursoId, tipo);
    // Limpiar selecciones temporales cuando cambie el tipo de clase
    this.limpiarSeleccionesTemporales();
  }

  limpiarSeleccionesTemporales(): void {
    if (this.sesionId && this.ventanaActiva) {
      this.api.post(`/ventanas/${this.ventanaActiva.id}/limpiar-sesion`, { sesionId: this.sesionId }).subscribe({
        next: () => {
          console.log('Selecciones temporales limpiadas');
          // Recargar la grilla para reflejar los cambios
          if (this.grillaRef) {
            this.grillaRef.cargarMatriz();
          }
        },
        error: (err) => console.error('Error al limpiar selecciones:', err)
      });
    }
  }

  onGrupoChange(value: number): void {
    console.log('[Operador] onGrupoChange llamado con valor:', value, 'grupoSeleccionado actual:', this.grupoSeleccionado);
    // Deseleccionar el ambiente cuando cambia el grupo
    this.ambienteSeleccionado = null;
    // Limpiar selecciones temporales para evitar conflictos con el grupo anterior
    this.limpiarSeleccionesTemporales();
    // Recargar horarios del docente para ver si el grupo tiene horarios confirmados
    if (this.docenteActual) {
      this.cargarHorariosDocente(this.docenteActual.id);
    }
  }

  cargarAmbientesCompatibles(cursoId: number, tipoClase: string): void {
    if (!this.docenteActual) return;
    this.api.get<ApiResponse<Ambiente[]>>(`/docentes/${this.docenteActual.id}/ambientes-compatibles`, {
      cursoId,
      tipoClase
    }).subscribe(r => {
      this.ambientesDocente = r.data || [];
    });
  }

  cursoEstaCompleto(curso: any): boolean {
    const req = this.getHorasRequeridas(curso, curso.tipo_clase);
    const asig = this.getHorasAsignadasCurso(curso.cursoId, curso.tipo_clase);
    return asig >= req;
  }

  getHorasAsignadasCurso(cursoId: number, tipoClase: string, grupo?: number): number {
    const horariosFiltrados = this.horariosDocente.filter(h => 
      h.curso_id === cursoId && 
      h.tipo_clase === tipoClase
    );
    
    // Si es laboratorio o práctica y se especifica grupo, filtrar por número de grupo del código
    if ((tipoClase === 'LABORATORIO' || tipoClase === 'PRACTICA') && grupo) {
      const horariosGrupo = horariosFiltrados.filter(h => {
        if (!h.grupo) return false;
        // Extraer el número de grupo del código (ej: "INT101-G1" -> 1)
        const grupoMatch = h.grupo.codigo?.match(/-G(\d+)$/);
        if (!grupoMatch) return false;
        const grupoNumero = parseInt(grupoMatch[1], 10);
        return grupoNumero === grupo;
      });
      return horariosGrupo.reduce((sum, h) => {
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        return sum + (fin - ini);
      }, 0);
    }
    
    return horariosFiltrados.reduce((sum, h) => {
      const ini = parseInt(h.hora_inicio.split(':')[0], 10);
      const fin = parseInt(h.hora_fin.split(':')[0], 10);
      return sum + (fin - ini);
    }, 0);
  }

  getHorasRequeridas(curso: any, tipo: string): number {
    if (!curso?.curso) return 0;
    if (tipo === 'TEORIA') return curso.curso.horas_teoria || 0;
    if (tipo === 'PRACTICA') return curso.curso.horas_practica || 0;
    if (tipo === 'LABORATORIO') {
      // Cada grupo debe tener las horas completas requeridas, no divididas
      return curso.curso.horas_laboratorio || 0;
    }
    return curso.curso.horas_laboratorio || 0;
  }

  get ambientesFiltrados(): Ambiente[] {
    const f = this.filtroAmbiente.trim().toLowerCase();
    if (!f) return this.ambientesDocente;
    return this.ambientesDocente.filter((a: any) =>
      a.nombre.toLowerCase().includes(f) ||
      a.codigo.toLowerCase().includes(f) ||
      (a.pabellon || '').toLowerCase().includes(f)
    );
  }

  get cursosFiltrados(): any[] {
    const f = this.filtroCurso.trim().toLowerCase();
    if (!f) {
      return this.cursosDocente;
    }
    return this.cursosDocente.filter((c: any) =>
      c.curso?.nombre.toLowerCase().includes(f) ||
      c.curso?.codigo.toLowerCase().includes(f)
    );
  }

  seleccionarAmbienteRapido(ambiente: Ambiente): void {
    this.ambienteSeleccionado = ambiente;
  }

  finalizarSesion(): void {
    if (!this.ventanaActiva) return;
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva.id}/finalizar`, {}).subscribe({
      next: (r) => {
        this.ventanaActiva = null;
        this.docenteActual = null;
        this.loading = false;
        const data = r.data || {};
        const lines = [
          `Total docentes: ${data.total_docentes || 0}`,
          `Atendidos: ${data.atendidos?.length || 0}`,
          `Ausentes: ${data.ausentes?.length || 0}`,
          `No show: ${data.no_show?.length || 0}`,
          `Horarios confirmados: ${data.horarios_confirmados || 0}`,
        ];
        if (data.nueva_ventana) {
          lines.push(`Nueva ventana: ${new Date(data.nueva_ventana.fecha).toLocaleDateString()} (${data.nueva_ventana.proposito})`);
        }
        this.snack.open(lines.join(' | '), 'OK', { duration: 10000 });
        this.cargarVentanas();
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al finalizar sesión', 'Error', { duration: 3000 });
      }
    });
  }

  iniciarAtencion(ventanaId: string): void {
    console.log('[Operador] iniciarAtencion ventanaId =', ventanaId);
    if (!ventanaId) {
      this.snack.open('ID de ventana no válido', 'Error', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/ventanas/${ventanaId}/iniciar`, {}).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Ventana iniciada', 'OK', { duration: 3000 });
        // Esperar 500ms para que la DB refleje el cambio antes de consultar /activa
        setTimeout(() => this.checkVentanaActiva(), 500);
      },
      error: (err) => {
        console.error('[Operador] iniciarAtencion error:', err);
        this.loading = false;
        this.snack.open('Error al iniciar ventana', 'Error', { duration: 3000 });
      }
    });
  }

  crearVentana(): void {
    if (this.ventanaForm.invalid) return;
    this.creandoVentana = true;
    const body = this.ventanaForm.value;
    console.log('[Operador] crearVentana body:', body);
    this.api.post<ApiResponse<VentanaAtencion>>('/ventanas', body).subscribe({
        next: () => {
            this.creandoVentana = false;
            this.snack.open('Ventana creada exitosamente', 'OK', { duration: 3000 });
            this.cargarVentanas();
            this.mostrarFormulario = false;
        },
        error: (err) => {
            this.creandoVentana = false;
            const msg = err?.error?.message || err?.message || 'Error al crear ventana';
            console.error('[Operador] crearVentana error:', err);
            
            // Verificar si es un error de capacidad insuficiente
            if (msg.includes('Capacidad insuficiente') && msg.includes('Sugerencias:')) {
                this.errorOriginal = msg;
                this.sugerenciasCapacidad = this.parsearSugerencias(msg);
                this.mostrarSugerencias = true;
            } else {
                this.snack.open(Array.isArray(msg) ? msg.join(', ') : msg, 'Error', { duration: 5000 });
            }
        }
    });
  }

  private parsearSugerencias(mensaje: string): string[] {
    const sugerenciasLine = mensaje.split('Sugerencias:')[1];
    if (!sugerenciasLine) return [];
    return sugerenciasLine.trim().split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim());
  }

  obtenerDistribucion(): void {
    const body = this.ventanaForm.value;
    this.creandoVentanasMultiples = true;
    this.api.post<ApiResponse<any>>('/ventanas/sugerir-distribucion', body).subscribe({
        next: (r) => {
            this.creandoVentanasMultiples = false;
            this.distribucionSugerida = r.data;
            this.mostrandoDistribucion = true;
            this.mostrarSugerencias = false;
        },
        error: (err) => {
            this.creandoVentanasMultiples = false;
            this.snack.open('Error al obtener distribución sugerida', 'Error', { duration: 3000 });
        }
    });
  }

  crearVentanasAutomaticamente(): void {
    if (!this.distribucionSugerida) return;
    this.creandoVentanasMultiples = true;
    
    const bodyBase = this.ventanaForm.value;
    const promises = this.distribucionSugerida.sugerencias.map((sugerencia: any) => {
        const ventanaBody = {
            ...bodyBase,
            fecha: sugerencia.fecha,
            hora_inicio: sugerencia.hora_inicio,
            hora_fin: sugerencia.hora_fin,
            intervalo_minutos: bodyBase.intervalo_minutos,
            saltarValidacionCapacidad: true,
            sinAsignarDocentes: true,
        };
        return this.api.post<ApiResponse<VentanaAtencion>>('/ventanas', ventanaBody).toPromise();
    });

    Promise.all(promises).then((results) => {
        this.creandoVentanasMultiples = false;
        this.mostrandoDistribucion = false;
        this.mostrarFormulario = false;
        this.snack.open(`${this.distribucionSugerida.ventanasNecesarias} ventanas creadas. Distribuyendo docentes...`, 'OK', { duration: 3000 });
        
        // Distribuir docentes entre las ventanas creadas
        const ventanasIds = results.map(r => r.data.id);
        this.distribuirDocentesEntreVentanas(ventanasIds);
    }).catch((err) => {
        this.creandoVentanasMultiples = false;
        const msg = err?.error?.message || err?.message || 'Error al crear ventanas automáticamente';
        this.snack.open(msg, 'Error', { duration: 5000 });
    });
  }

  distribuirDocentesEntreVentanas(ventanasIds: string[]): void {
    const bodyBase = this.ventanaForm.value;
    this.api.post('/ventanas/distribuir-docentes', {
      ventanas_ids: ventanasIds,
      periodo: bodyBase.periodo,
      proposito: bodyBase.proposito,
      modalidad: bodyBase.modalidad,
    }).subscribe({
      next: () => {
        this.snack.open('Docentes distribuidos exitosamente entre ventanas', 'OK', { duration: 3000 });
        this.cargarVentanas();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error al distribuir docentes';
        this.snack.open(msg, 'Error', { duration: 5000 });
      }
    });
  }

  cancelarSugerencias(): void {
    this.mostrarSugerencias = false;
    this.sugerenciasCapacidad = [];
    this.errorOriginal = '';
  }

  cancelarDistribucion(): void {
    this.mostrandoDistribucion = false;
    this.distribucionSugerida = null;
  }

  ajustarIntervalo(): void {
    // Calcular el intervalo mínimo necesario (5 minutos)
    this.ventanaForm.patchValue({ intervalo_minutos: 5 });
    this.cancelarSugerencias();
    this.snack.open('Intervalo ajustado a 5 minutos. Intenta crear la ventana nuevamente.', 'OK', { duration: 3000 });
  }

  ajustarDuracion(): void {
    // Extraer la duración sugerida del mensaje
    const duracionMatch = this.errorOriginal.match(/Aumenta la duración a (\d+)h (\d+)min/);
    if (duracionMatch) {
      const horas = parseInt(duracionMatch[1]);
      const minutos = parseInt(duracionMatch[2]);
      
      // Calcular nueva hora fin basada en hora inicio actual
      const horaInicio = this.ventanaForm.get('hora_inicio')?.value;
      if (horaInicio) {
        const [hInicio, mInicio] = horaInicio.split(':').map(Number);
        const totalMinutos = (hInicio * 60 + mInicio) + (horas * 60 + minutos);
        const hFin = Math.floor(totalMinutos / 60) % 24;
        const mFin = totalMinutos % 60;
        
        this.ventanaForm.patchValue({
          hora_fin: `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`
        });
      }
    }
    this.cancelarSugerencias();
    this.snack.open('Duración ajustada. Intenta crear la ventana nuevamente.', 'OK', { duration: 3000 });
  }

  confirmarHorario(): void {
    if (!this.ventanaActiva) return;
    const periodoId = this.periodoService.periodoActivo?.id;
    if (!periodoId) {
      this.snack.open('No se pudo determinar el período activo. Intente recargar la página.', 'Error', { duration: 4000 });
      return;
    }
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva.id}/confirmar`, {
      sesionId: this.sesionId,
      periodoId
    }).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.data?.confirmados > 0) {
          this.snack.open(`${r.data.confirmados} horario(s) confirmado(s)`, 'OK', { duration: 3000 });
          this.cargarHorariosDocente(this.docenteActual.id);
          // Deseleccionar ambiente solo para laboratorio o práctica, no para teoría
          if (this.tipoClase === 'LABORATORIO' || this.tipoClase === 'PRACTICA') {
            this.ambienteSeleccionado = null;
          }
          // Recargar la grilla de horarios
          if (this.grillaRef) {
            this.grillaRef.cargarMatriz();
          }
        } else if (r.data?.errores?.length) {
          this.snack.open(`Errores: ${r.data.errores.map((e: any) => e.motivo || JSON.stringify(e)).join(', ')}`, 'Cerrar', { duration: 6000 });
        } else {
          this.snack.open('No hay selecciones para confirmar', 'OK', { duration: 3000 });
        }
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error al confirmar horario', 'Error', { duration: 3000 });
      }
    });
  }

  // Métodos para pre-asignación de docentes (SUBSANACION)
  abrirSeleccionDocentes(ventana: VentanaAtencion): void {
    if (ventana.proposito !== 'SUBSANACION') {
      this.snack.open('La pre-asignación está disponible solo para SUBSANACION', 'OK', { duration: 3000 });
      return;
    }

    this.ventanaActualParaAsignar = ventana;
    this.docentesSeleccionados.clear();
    this.mostrandoSeleccionDocentes = true;
    this.cargarDocentesParaSubsanacion(ventana.id);
  }

  cargarDocentesParaSubsanacion(ventanaId: string): void {
    this.cargandoDocentes = true;

    forkJoin([
      this.api.get<ApiResponse<any>>('/ventanas/candidatos-docentes', {
        proposito: 'SUBSANACION',
        periodo: this.periodoService.periodoActivo?.codigo ?? this.periodoService.periodo,
      }),
      this.api.get<ApiResponse<any>>(`/ventanas/${ventanaId}/cola`)
    ]).subscribe({
      next: ([candidatosRes, colaRes]) => {
        const docentes = Array.isArray(candidatosRes.data) ? candidatosRes.data : [];
        const cola = colaRes.data || {};

        const esperando = Array.isArray(cola.esperando) ? cola.esperando : [];
        const enAtencion = cola.en_atencion ? [cola.en_atencion] : [];
        const selectedIds = new Set<number>(
          [...enAtencion, ...esperando]
            .map((item: any) => item?.docente_id ?? item?.docente?.id)
            .filter((id: any) => id != null)
            .map(Number)
        );

        this.docentesSeleccionados.clear();
        selectedIds.forEach(id => this.docentesSeleccionados.add(id));

        this.docentesDisponibles = docentes.map((doc: any) => ({
          id: Number(doc.id),
          nombre: `${doc.apellidos}, ${doc.nombres}`,
          categoria: doc.categoria,
          tipo_contrato: doc.tipo_contrato,
          selected: selectedIds.has(Number(doc.id)),
        }));

        this.cargandoDocentes = false;

        if (this.docentesDisponibles.length === 0) {
          this.snack.open('No se encontraron docentes elegibles para SUBSANACION en este período', 'OK', { duration: 3000 });
          this.cerrarSeleccionDocentes();
        }
      },
      error: (err) => {
        this.cargandoDocentes = false;
        console.error('Error cargando docentes para subsanación:', err);
        this.snack.open('Error al cargar docentes para subsanación', 'Error', { duration: 3000 });
        this.cerrarSeleccionDocentes();
      }
    });
  }

  toggleDocente(doc: any): void {
    const docenteId = Number(doc.id);
    if (this.docentesSeleccionados.has(docenteId)) {
      this.docentesSeleccionados.delete(docenteId);
      doc.selected = false;
    } else {
      this.docentesSeleccionados.add(docenteId);
      doc.selected = true;
    }
  }

  preAsignarDocentes(): void {
    if (!this.ventanaActualParaAsignar || this.docentesSeleccionados.size === 0) {
      this.snack.open('Selecciona al menos un docente', 'OK', { duration: 3000 });
      return;
    }

    this.cargandoDocentes = true;
    const docentesIds = Array.from(this.docentesSeleccionados);

    this.api.post(`/ventanas/${this.ventanaActualParaAsignar.id}/pre-asignar-docentes`, {
      docentes_ids: docentesIds
    }).subscribe({
      next: (r) => {
        this.cargandoDocentes = false;
        this.snack.open(`${docentesIds.length} docentes pre-asignados exitosamente`, 'OK', { duration: 3000 });
        this.cerrarSeleccionDocentes();
        this.cargarVentanas();
      },
      error: (err) => {
        this.cargandoDocentes = false;
        const msg = err?.error?.message || 'Error al pre-asignar docentes';
        this.snack.open(msg, 'Error', { duration: 5000 });
      }
    });
  }

  cerrarSeleccionDocentes(): void {
    this.mostrandoSeleccionDocentes = false;
    this.ventanaActualParaAsignar = null;
    this.docentesDisponibles = [];
    this.docentesSeleccionados.clear();
  }

  getPropositoInfo(proposito: string): any {
    return (this.propositosInfo as any)[proposito] || null;
  }
}
