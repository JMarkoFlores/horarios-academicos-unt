import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { VentanaAtencion, ApiResponse } from '../../../core/interfaces/entities';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ventana-list',
  templateUrl: './ventana-list.component.html',
  styleUrls: ['./ventana-list.component.scss']
})
export class VentanaListComponent implements OnInit, OnDestroy {
  ventanaForm: FormGroup;
  ventanas: VentanaAtencion[] = [];
  ventanasFiltradas: VentanaAtencion[] = [];
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

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    public periodoService: PeriodoService,
    private snack: MatSnackBar,
    private router: Router
  ) {
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
  }

  ngOnInit(): void {
    this.checkVentanaActiva();
    this.cargarVentanas();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarVentanas();
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  checkVentanaActiva(): void {
    this.api.get<ApiResponse<VentanaAtencion>>('/ventanas/activa').subscribe({
      next: (r) => {
        if (r.data) {
          // Redirigir al detalle de la ventana activa si existe
          this.router.navigate(['/app/secretaria/ventanas', r.data.id]);
        }
      },
      error: () => {
        // No hay ventana activa, se queda aquí
      }
    });
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

    if (this.filtroEstado) filtradas = filtradas.filter(v => v.estado === this.filtroEstado);
    if (this.filtroProposito) filtradas = filtradas.filter(v => v.proposito === this.filtroProposito);
    if (this.filtroFechaInicio) {
      const fechaInicio = new Date(this.filtroFechaInicio);
      filtradas = filtradas.filter(v => new Date(v.fecha) >= fechaInicio);
    }
    if (this.filtroFechaFin) {
      const fechaFin = new Date(this.filtroFechaFin);
      filtradas = filtradas.filter(v => new Date(v.fecha) <= fechaFin);
    }

    filtradas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora_inicio}`).getTime();
      const fechaB = new Date(`${b.fecha}T${b.hora_inicio}`).getTime();
      return fechaA - fechaB;
    });

    this.ventanasFiltradas = filtradas;
    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroProposito = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  get totalPaginas(): number {
    return Math.ceil(this.ventanasFiltradas.length / this.elementosPorPagina);
  }

  get ventanasPaginadas(): VentanaAtencion[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.ventanasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void { this.paginaActual = pagina; }
  paginaAnterior(): void { if (this.paginaActual > 1) this.paginaActual--; }
  paginaSiguiente(): void { if (this.paginaActual < this.totalPaginas) this.paginaActual++; }

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

  getPropositoInfo(proposito: string): any {
    return (this.propositosInfo as any)[proposito] || null;
  }

  iniciarAtencion(ventanaId: string): void {
    this.loading = true;
    this.api.post<ApiResponse<any>>(`/ventanas/${ventanaId}/iniciar`, {}).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Ventana iniciada', 'OK', { duration: 3000 });
        this.router.navigate(['/app/secretaria/ventanas', ventanaId]);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open('Error al iniciar ventana', 'Error', { duration: 3000 });
      }
    });
  }

  crearVentana(): void {
    if (this.ventanaForm.invalid) return;
    this.creandoVentana = true;
    const body = this.ventanaForm.value;
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
        error: () => {
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
    this.ventanaForm.patchValue({ intervalo_minutos: 5 });
    this.cancelarSugerencias();
    this.snack.open('Intervalo ajustado a 5 minutos. Intenta crear la ventana nuevamente.', 'OK', { duration: 3000 });
  }

  ajustarDuracion(): void {
    const duracionMatch = this.errorOriginal.match(/Aumenta la duración a (\d+)h (\d+)min/);
    if (duracionMatch) {
      const horas = parseInt(duracionMatch[1]);
      const minutos = parseInt(duracionMatch[2]);
      
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
}
