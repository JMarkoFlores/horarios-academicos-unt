import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { VentanaAtencion, ApiResponse, Curso, Ambiente } from '../../core/interfaces/entities';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  ventanaForm: FormGroup;
  ventanas: VentanaAtencion[] = [];
  ventanasFiltradas: VentanaAtencion[] = [];
  ventanaActiva: VentanaAtencion | null = null;
  loading = false;
  creandoVentana = false;
  mostrarFormulario = false;
  private periodSub?: Subscription;

  // Filtros
  filtroEstado = '';
  filtroCategoria = '';

  categorias = [
    { value: '', label: 'Todas' },
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'ASOCIADO', label: 'Asociado' },
    { value: 'AUXILIAR', label: 'Auxiliar' },
    { value: 'JEFE_PRACTICA', label: 'Jefe de Práctica' },
  ];

  estados = [
    { value: '', label: 'Todos' },
    { value: 'PROGRAMADA', label: 'Programada' },
    { value: 'EN_CURSO', label: 'En curso' },
    { value: 'COMPLETADA', label: 'Completada' },
    { value: 'CANCELADA', label: 'Cancelada' },
  ];

  // Estado de atención activa
  sesionId = generarUUID();
  docenteActual: any = null;
  cursosDocente: any[] = [];
  ambientesDocente: Ambiente[] = [];
  horariosDocente: any[] = [];

  cursoSeleccionado: any = null;
  tipoClase = 'TEORIA';
  ambienteSeleccionado: Ambiente | null = null;
  filtroAmbiente = '';

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    public periodoService: PeriodoService,
    private snack: MatSnackBar
  ) {
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
    this.ventanasFiltradas = this.ventanas;
  }

  onFiltroChange(): void {
    this.cargarVentanas();
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
      ASOCIADO: 'Asociado',
      AUXILIAR: 'Auxiliar',
      JEFE_PRACTICA: 'Jefe de Práctica',
    };
    return map[cat] || cat;
  }

  checkVentanaActiva(): void {
    this.api.get<ApiResponse<VentanaAtencion>>('/ventanas/activa').subscribe({
      next: (r) => {
        this.ventanaActiva = r.data || null;
        console.log('[Operador] ventanaActiva =', this.ventanaActiva);
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
      this.cursosDocente = r.data || [];
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
    });
  }

  seleccionarCurso(curso: any): void {
    const req = this.getHorasRequeridas(curso, curso.tipo_clase);
    const asig = this.getHorasAsignadasCurso(curso.cursoId, curso.tipo_clase);
    if (asig >= req) {
      this.snack.open(`El curso ${curso.curso?.nombre} (${curso.tipo_clase}) ya tiene completas las ${req}h requeridas.`, 'OK', { duration: 4000 });
      return;
    }
    this.cursoSeleccionado = curso;
    this.ambienteSeleccionado = null;
  }

  cursoEstaCompleto(curso: any): boolean {
    const req = this.getHorasRequeridas(curso, curso.tipo_clase);
    const asig = this.getHorasAsignadasCurso(curso.cursoId, curso.tipo_clase);
    return asig >= req;
  }

  getHorasAsignadasCurso(cursoId: number, tipoClase: string): number {
    return this.horariosDocente
      .filter(h => h.curso_id === cursoId && h.tipo_clase === tipoClase)
      .reduce((sum, h) => {
        const ini = parseInt(h.hora_inicio.split(':')[0], 10);
        const fin = parseInt(h.hora_fin.split(':')[0], 10);
        return sum + (fin - ini);
      }, 0);
  }

  getHorasRequeridas(curso: any, tipo: string): number {
    if (!curso?.curso) return 0;
    return tipo === 'TEORIA' ? (curso.curso.horas_teoria || 0) : (curso.curso.horas_laboratorio || 0);
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
