import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
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
  filtroCategoria = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  categorias = [
    { value: '', label: 'Todas' },
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'CONTINGENCIA', label: 'Contingencia' },
  ];

  estados = [
    { value: '', label: 'Todos' },
    { value: 'PROGRAMADA', label: 'Programada' },
    { value: 'EN_CURSO', label: 'En curso' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

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
      hora_inicio: ['08:00', Validators.required],
      hora_fin: ['12:00', Validators.required],
      categoria: ['PRINCIPAL', Validators.required],
      modalidad: ['NOMBRADO', Validators.required]
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
    if (this.filtroCategoria) params.categoria = this.filtroCategoria;
    this.api.get<ApiResponse<VentanaAtencion[]>>('/ventanas', params).subscribe(r => {
      this.ventanas = r.data || [];
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    let filtradas = [...this.ventanas];

    // Filtrar por estado
    if (this.filtroEstado) {
      filtradas = filtradas.filter(v => v.estado === this.filtroEstado);
    }

    // Filtrar por categoría
    if (this.filtroCategoria) {
      filtradas = filtradas.filter(v => v.categoria === this.filtroCategoria);
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

    // Ordenar por fecha ascendente (menor a mayor)
    filtradas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    this.ventanasFiltradas = filtradas;
    this.paginaActual = 1; // Resetear a primera página
  }

  onFiltroChange(): void {
    this.cargarVentanas();
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroCategoria = '';
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
    return ventana.estado === 'PROGRAMADA' || ventana.estado === 'CANCELADA';
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
    if (!confirm(`¿Eliminar ventana del ${new Date(ventana.fecha).toLocaleDateString()} (${ventana.categoria})?`)) return;
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

  getCategoriaLabel(cat: string): string {
    const map: Record<string, string> = {
      PRINCIPAL: 'Principal',
      CONTINGENCIA: 'Contingencia',
    };
    return map[cat] || cat;
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
    this.api.get<ApiResponse<any[]>>(`/docentes/${docenteId}/cursos`).subscribe(r => {
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
  }

  seleccionarTipoClase(curso: any, tipo: string): void {
    this.tipoClase = tipo;
    this.ambienteSeleccionado = null;
    // Obtener el número de grupos para este tipo de clase
    const tipoInfo = curso.tiposClase.find((t: any) => t.tipo === tipo);
    this.gruposDisponibles = tipoInfo ? tipoInfo.grupos : 1;
    this.grupoSeleccionado = 1;
    this.cargarAmbientesCompatibles(curso.cursoId, tipo);
  }

  onGrupoChange(value: number): void {
    console.log('[Operador] onGrupoChange llamado con valor:', value, 'grupoSeleccionado actual:', this.grupoSeleccionado);
    // Deseleccionar el ambiente cuando cambia el grupo
    this.ambienteSeleccionado = null;
    // Limpiar selecciones temporales para evitar conflictos con el grupo anterior
    if (this.sesionId && this.ventanaActiva) {
      this.api.post(`/ventanas/${this.ventanaActiva.id}/limpiar-sesion`, { sesionId: this.sesionId }).subscribe({
        next: () => {
          console.log('[Operador] Sesión limpiada al cambiar grupo');
        },
        error: (err) => {
          console.error('[Operador] Error limpiando sesión:', err);
        }
      });
    }
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
          lines.push(`Nueva ventana: ${new Date(data.nueva_ventana.fecha).toLocaleDateString()} (${data.nueva_ventana.categoria})`);
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
        },
        error: (err) => {
            this.creandoVentana = false;
            const msg = err?.error?.message || err?.message || 'Error al crear ventana';
            console.error('[Operador] crearVentana error:', err);
            this.snack.open(Array.isArray(msg) ? msg.join(', ') : msg, 'Error', { duration: 5000 });
        }
    });
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
}
