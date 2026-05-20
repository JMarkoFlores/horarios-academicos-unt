import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, of } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Docente, Curso, Ambiente } from '../../core/interfaces/entities';

@Component({
  selector: 'app-asignaciones',
  templateUrl: './asignaciones.component.html',
  styleUrls: ['./asignaciones.component.scss']
})
export class AsignacionesComponent implements OnInit, OnDestroy {
  private periodSub?: Subscription;
  docentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  
  cursosAsignados: Curso[] = [];
  ambientesAsignados: Ambiente[] = [];
  
  todosCursos: Curso[] = [];
  todosAmbientes: Ambiente[] = [];
  filtroCursos = '';
  filtroAmbientes = '';

  loadingDocentes = false;
  loadingData = false;
  guardando = false;
  generando = false;
  publicando = false;
  limpiando = false;
  limpiandoTodo = false;

  modoAsignacion: 'AUTOMATICA' | 'VENTANAS' | 'MIXTA' | null = null;
  periodoId: number | null = null;
  resumenGeneracion: any = null;

  serviciosDisponibles = {
    docentes: true,
    cursos: true,
    ambientes: true
  };

  diagnostico = {
    cargaHoraria: {
      titulo: 'Carga Horaria Semanal',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      horasAsignadas: 0,
      horasMaximas: 0,
      porcentaje: 0,
      mensaje: ''
    },
    preparaciones: {
      titulo: 'Preparaciones de Clase',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      cantidad: 0,
      limite: 3,
      mensaje: ''
    },
    compatibilidadLab: {
      titulo: 'Aulas y Laboratorios',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      mensaje: ''
    },
    disponibilidad: {
      titulo: 'Disponibilidad Horaria',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      horasDisponibles: 0,
      mensaje: ''
    },
    afinidadAcademica: {
      titulo: 'Afinidad y Nivel Académico',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      mensaje: ''
    }
  };

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarDocentes();
    this.cargarCatalogos();
    this.cargarModoPeriodo();
    this.periodSub = this.periodoService.periodo$.subscribe(() => {
      this.cargarModoPeriodo();
      if (this.docenteSeleccionado) {
        this.cargarCursosAsignados(this.docenteSeleccionado.id);
      }
    });
  }

  ngOnDestroy(): void {
    this.periodSub?.unsubscribe();
  }

  cargarDocentes(): void {
    this.loadingDocentes = true;
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (res) => {
        this.docentes = res?.data?.items ?? [];
        this.loadingDocentes = false;
      },
      error: () => {
        this.serviciosDisponibles.docentes = false;
        this.loadingDocentes = false;
      }
    });
  }

  cargarCatalogos(): void {
    // Cargar Cursos
    this.api.get<any>('/cursos', { limit: 100 }).subscribe({
      next: (res) => {
        this.todosCursos = res?.data?.items ?? [];
      },
      error: () => {
        this.serviciosDisponibles.cursos = false;
      }
    });

    // Cargar Ambientes
    this.api.get<any>('/ambientes', { limit: 100 }).subscribe({
      next: (res) => {
        this.todosAmbientes = res?.data?.items ?? [];
      },
      error: () => {
        this.serviciosDisponibles.ambientes = false;
      }
    });
  }

  seleccionarDocente(docente: Docente): void {
    this.docenteSeleccionado = docente;
    this.cursosAsignados = [];
    this.ambientesAsignados = [];
    this.cargarCursosAsignados(docente.id);
  }

  cargarCursosAsignados(docenteId: number): void {
    this.loadingData = true;
    this.api.get<any>(`/docentes/${docenteId}/cursos`, { periodo: this.periodoService.periodo }).pipe(
      concatMap((res: any) => {
        const items = res?.data ?? [];
        const uniqueCursos: Curso[] = [];
        const seenIds = new Set<number>();
        for (const item of items) {
          if (item.curso && !seenIds.has(item.curso.id)) {
            seenIds.add(item.curso.id);
            uniqueCursos.push(item.curso);
          }
        }
        this.cursosAsignados = uniqueCursos;
        return this.api.get<any>(`/docentes/${docenteId}/ambientes`, { periodo: this.periodoService.periodo }).pipe(
          catchError(() => of({ data: [] }))
        );
      }),
      catchError(() => {
        this.snackBar.open('Error al cargar cursos asignados', 'Cerrar', { duration: 3000 });
        return of({ data: [] });
      })
    ).subscribe({
      next: (ambRes: any) => {
        this.ambientesAsignados = ambRes?.data ?? [];
        this.loadingData = false;
        this.ejecutarDiagnostico();
      },
      error: () => {
        this.loadingData = false;
        this.ejecutarDiagnostico();
      }
    });
  }

  guardarAsignaciones(): void {
    if (!this.docenteSeleccionado) return;
    this.guardando = true;

    const cursosPayload: any[] = [];
    for (const curso of this.cursosAsignados) {
      cursosPayload.push({ cursoId: curso.id, tipo_clase: 'TEORIA' });
      if (curso.tiene_laboratorio) {
        cursosPayload.push({ cursoId: curso.id, tipo_clase: 'LABORATORIO' });
      }
    }

    const ambienteIds = this.ambientesAsignados.map(a => a.id);

    this.api.post<any>(`/docentes/${this.docenteSeleccionado.id}/cursos`, {
      cursos: cursosPayload,
      periodo: this.periodoService.periodo,
    }).pipe(
      concatMap(() => this.api.post<any>(`/docentes/${this.docenteSeleccionado!.id}/ambientes`, {
        ambienteIds,
        periodo: this.periodoService.periodo,
      }).pipe(
        catchError((err) => {
          const msg = err?.error?.message ?? 'Error al guardar ambientes asignados';
          this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
          return of(null);
        })
      )),
      catchError((err) => {
        this.guardando = false;
        const msg = err?.error?.message ?? 'Error al guardar cursos asignados';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (res !== null) {
          this.guardando = false;
          this.snackBar.open('Asignaciones y ambientes guardados correctamente', 'OK', { duration: 3000 });
          this.ejecutarDiagnostico();
        }
      },
      error: () => { this.guardando = false; }
    });
  }

  agregarCurso(curso: Curso): void {
    if (!this.cursosAsignados.find(c => c.id === curso.id)) {
      this.cursosAsignados.push(curso);
      this.ejecutarDiagnostico();
    }
  }

  quitarCurso(id: number): void {
    this.cursosAsignados = this.cursosAsignados.filter(c => c.id !== id);
    this.ejecutarDiagnostico();
  }

  agregarAmbiente(ambiente: Ambiente): void {
    if (!this.ambientesAsignados.find(a => a.id === ambiente.id)) {
      this.ambientesAsignados.push(ambiente);
      this.ejecutarDiagnostico();
    }
  }

  quitarAmbiente(id: number): void {
    this.ambientesAsignados = this.ambientesAsignados.filter(a => a.id !== id);
    this.ejecutarDiagnostico();
  }

  ejecutarDiagnostico(): void {
    if (!this.docenteSeleccionado) return;

    const docente = this.docenteSeleccionado;

    // 1. Carga Horaria Semanal
    let totalHoras = 0;
    for (const curso of this.cursosAsignados) {
      totalHoras += (curso.horas_teoria || 0) + (curso.horas_laboratorio || 0);
    }
    
    let maxHoras = 16;
    if (docente.tipo_contrato === 'NOMBRADO') {
      if (docente.categoria === 'PRINCIPAL' || docente.categoria === 'ASOCIADO') {
        maxHoras = 40;
      } else {
        maxHoras = 20;
      }
    }

    const cargaPorcentaje = Math.min(Math.round((totalHoras / maxHoras) * 100), 100);
    this.diagnostico.cargaHoraria = {
      titulo: 'Carga Horaria Semanal',
      horasAsignadas: totalHoras,
      horasMaximas: maxHoras,
      porcentaje: cargaPorcentaje,
      estado: totalHoras > maxHoras ? 'ERROR' : totalHoras === 0 ? 'WARNING' : 'OK',
      mensaje: totalHoras > maxHoras 
        ? `Excede la carga máxima permitida de ${maxHoras} hrs.`
        : totalHoras === 0 
          ? `Sin carga académica asignada.`
          : `${totalHoras} hrs asignadas de ${maxHoras} hrs máx.`
    };

    // 2. Preparaciones de Clase
    const cantCursos = this.cursosAsignados.length;
    const limiteCursos = 3;
    this.diagnostico.preparaciones = {
      titulo: 'Preparaciones de Clase',
      cantidad: cantCursos,
      limite: limiteCursos,
      estado: cantCursos > limiteCursos ? 'WARNING' : cantCursos === 0 ? 'WARNING' : 'OK',
      mensaje: cantCursos > limiteCursos
        ? `Dicta ${cantCursos} asignaturas (Recomendado máx: ${limiteCursos}).`
        : cantCursos === 0
          ? `Ningún curso asignado.`
          : `${cantCursos} cursos distintos asignados.`
    };

    // 3. Aulas y Laboratorios (Compatibilidad exacta con la ficha del curso)
    let conflictoCompatibilidad = false;
    let mensajeCompatibilidad = '';
    const requiereLab = this.cursosAsignados.some(c => c.tiene_laboratorio);
    const tieneLabAsignado = this.ambientesAsignados.some(a => a.tipo === 'LABORATORIO');

    if (requiereLab && !tieneLabAsignado) {
      conflictoCompatibilidad = true;
      mensajeCompatibilidad = 'Tiene cursos de laboratorio asignados pero no se ha asignado ningún ambiente tipo LABORATORIO.';
    } else {
      // Verificación detallada por curso (solo si la ficha tiene ambientes definidos)
      for (const curso of this.cursosAsignados) {
        const ambientesCurso = curso.ambientes;
        if (!ambientesCurso || ambientesCurso.length === 0) continue;

        const labsCompatibles = ambientesCurso.filter(a => a.tipo === 'LABORATORIO');
        const aulasCompatibles = ambientesCurso.filter(a => a.tipo === 'AULA');

        if (curso.tiene_laboratorio && labsCompatibles.length > 0) {
          const tieneLabValido = this.ambientesAsignados.some(a => labsCompatibles.some(lc => lc.id === a.id));
          if (!tieneLabValido) {
            conflictoCompatibilidad = true;
            const codigosLabs = labsCompatibles.map(l => l.codigo).join(', ');
            mensajeCompatibilidad = `Conflicto: ${curso.nombre} requiere uno de los laboratorios compatibles de su ficha: [${codigosLabs}].`;
            break;
          }
        }

        if (aulasCompatibles.length > 0) {
          const tieneAulaValida = this.ambientesAsignados.some(a => aulasCompatibles.some(ac => ac.id === a.id));
          if (!tieneAulaValida && this.ambientesAsignados.length > 0) {
            conflictoCompatibilidad = true;
            const codigosAulas = aulasCompatibles.map(ac => ac.codigo).join(', ');
            mensajeCompatibilidad = `Conflicto: ${curso.nombre} requiere una de las aulas de teoría compatibles de su ficha: [${codigosAulas}].`;
            break;
          }
        }
      }
    }

    if (conflictoCompatibilidad) {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'ERROR',
        mensaje: mensajeCompatibilidad
      };
    } else if (this.cursosAsignados.length > 0 && this.ambientesAsignados.length === 0) {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'WARNING',
        mensaje: 'Sin aulas de teoría o laboratorios asignados.'
      };
    } else {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'OK',
        mensaje: 'Ambientes asignados compatibles con los cursos dictados.'
      };
    }


    // 4. Disponibilidad Horaria
    let horasDisponibles = 0;
    if (docente.disponibilidades && docente.disponibilidades.length > 0) {
      for (const d of docente.disponibilidades) {
        if (d.disponible) {
          const hInicio = parseInt(d.hora_inicio.split(':')[0], 10);
          const hFin = parseInt(d.hora_fin.split(':')[0], 10);
          horasDisponibles += (hFin - hInicio);
        }
      }
    } else {
      horasDisponibles = 60; // Sin restricciones
    }

    if (horasDisponibles < totalHoras) {
      this.diagnostico.disponibilidad = {
        titulo: 'Disponibilidad Horaria',
        estado: 'ERROR',
        horasDisponibles,
        mensaje: `Horas de cursos (${totalHoras} hrs) superan sus horas disponibles semanales (${horasDisponibles} hrs).`
      };
    } else {
      this.diagnostico.disponibilidad = {
        titulo: 'Disponibilidad Horaria',
        estado: 'OK',
        horasDisponibles,
        mensaje: `Disponibilidad semanal de ${horasDisponibles} hrs es apta para los cursos asignados.`
      };
    }

    // 5. Afinidad y Nivel Académico
    const tieneCursosSuperiores = this.cursosAsignados.some(c => c.ciclo > 8);
    const esJunior = docente.categoria === 'JEFE_PRACTICA' || docente.categoria === 'AUXILIAR';

    if (esJunior && tieneCursosSuperiores) {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'WARNING',
        mensaje: `Docente ${docente.categoria} asignado a cursos de últimos ciclos (Ciclo > 8). Requiere supervisión.`
      };
    } else if (this.cursosAsignados.length > 0) {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'OK',
        mensaje: `Jerarquía docente (${docente.categoria}) adecuada para el nivel de asignaturas asignado.`
      };
    } else {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'WARNING',
        mensaje: 'Sin asignaturas para validar nivel académico.'
      };
    }
  }

  get cursosFiltrados(): Curso[] {
    const f = this.filtroCursos.trim().toLowerCase();
    if (!f) return this.todosCursos;
    return this.todosCursos.filter(c =>
      c.nombre.toLowerCase().includes(f) || c.codigo.toLowerCase().includes(f)
    );
  }

  get ambientesFiltrados(): Ambiente[] {
    const f = this.filtroAmbientes.trim().toLowerCase();
    if (!f) return this.todosAmbientes;
    return this.todosAmbientes.filter(a =>
      a.nombre.toLowerCase().includes(f) || a.codigo.toLowerCase().includes(f)
    );
  }

  getStatusIcon(estado: string): string {
    switch (estado) {
      case 'OK': return 'check_circle';
      case 'WARNING': return 'warning';
      case 'ERROR': return 'cancel';
      default: return 'hourglass_empty';
    }
  }

  get docentesPendientesCount(): number {
    if (!this.resumenGeneracion?.detallePorDocente) return 0;
    return this.resumenGeneracion.detallePorDocente.filter((d: any) => d.horariosPendientes > 0).length;
  }

  getGlobalStatus(): string {
    if (!this.docenteSeleccionado) return 'SIN SELECCIÓN';
    const states = [
      this.diagnostico.cargaHoraria.estado,
      this.diagnostico.preparaciones.estado,
      this.diagnostico.compatibilidadLab.estado,
      this.diagnostico.disponibilidad.estado,
      this.diagnostico.afinidadAcademica.estado
    ];
    if (states.includes('ERROR')) return 'INCOMPATIBLE';
    if (states.includes('WARNING')) return 'ADVERTENCIA';
    return 'APTO';
  }

  getAvatarColor(name: string): string {
    const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ─── Acciones del Período ───

  cargarModoPeriodo(): void {
    this.api.get<any>(`/periodos`, { codigo: this.periodoService.periodo }).subscribe({
      next: (res) => {
        const periodo = res?.data?.items?.[0];
        if (periodo) {
          this.modoAsignacion = periodo.modo_asignacion?.toUpperCase() || 'VENTANAS';
          this.periodoId = periodo.id;
        }
      },
      error: () => {
        this.modoAsignacion = 'VENTANAS';
      }
    });
  }

  cambiarModoAsignacion(nuevoModo: 'AUTOMATICA' | 'VENTANAS' | 'MIXTA'): void {
    if (!this.periodoId) return;
    this.api.patch<any>(`/periodos/${this.periodoId}/modo-asignacion`, {
      modo_asignacion: nuevoModo.toLowerCase()
    }).subscribe({
      next: () => {
        this.modoAsignacion = nuevoModo;
        this.snackBar.open(`Modo cambiado a ${this.getModoLabel()}`, 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al cambiar modo de asignación';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  generarHorariosAutomaticos(): void {
    if (!this.periodoId) {
      this.snackBar.open('No se pudo identificar el período actual', 'Cerrar', { duration: 3000 });
      return;
    }
    this.generando = true;
    this.resumenGeneracion = null;
    this.api.post<any>(`/periodos/${this.periodoId}/generar-automatico`, {}).subscribe({
      next: (res) => {
        this.generando = false;
        this.resumenGeneracion = res?.data;
        this.snackBar.open(
          `Generados ${res?.data?.horarios_creados} horarios automáticamente`,
          'OK',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.generando = false;
        const msg = err?.error?.message || 'Error al generar horarios automáticamente';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }

  publicarHorariosAuto(): void {
    if (!this.periodoId) {
      this.snackBar.open('No se pudo identificar el período actual', 'Cerrar', { duration: 3000 });
      return;
    }
    this.publicando = true;
    this.api.post<any>(`/periodos/${this.periodoId}/publicar`, {}).subscribe({
      next: (res) => {
        this.publicando = false;
        this.snackBar.open(
          `${res?.data?.horarios_publicados || 0} horarios publicados correctamente`,
          'OK',
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.publicando = false;
        const msg = err?.error?.message || 'Error al publicar horarios';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  irAVentanas(): void {
    window.location.href = '/app/operador';
  }

  async crearVentanasPendientes(): Promise<void> {
    if (!this.periodoId) {
      this.snackBar.open('No se pudo identificar el período actual', 'Cerrar', { duration: 3000 });
      return;
    }
    this.api.post<any>(`/periodos/${this.periodoId}/crear-ventanas-pendientes`, {}).subscribe({
      next: (res) => {
        this.snackBar.open(
          `${res?.data?.message}`,
          'OK',
          { duration: 3000 }
        );
        this.irAVentanas();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al crear ventanas pendientes';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  limpiarHorariosInconsistentes(): void {
    if (!this.periodoId) {
      this.snackBar.open('No se pudo identificar el período actual', 'Cerrar', { duration: 3000 });
      return;
    }
    this.limpiando = true;
    this.api.post<any>(`/periodos/${this.periodoId}/limpiar-inconsistentes`, {}).subscribe({
      next: (res) => {
        this.limpiando = false;
        const msg = res?.data?.message || 'Horarios inconsistentes eliminados';
        const count = res?.data?.horarios_eliminados?.length || 0;
        this.snackBar.open(`${msg} (${count} horarios)`, 'OK', { duration: 5000 });
      },
      error: (err) => {
        this.limpiando = false;
        const msg = err?.error?.message || 'Error al limpiar horarios inconsistentes';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  limpiarHorariosPeriodo(): void {
    if (!this.periodoId) {
      this.snackBar.open('No se pudo identificar el período actual', 'Cerrar', { duration: 3000 });
      return;
    }
    const periodo = this.periodoService.periodo;
    if (!periodo) {
      this.snackBar.open('No se pudo identificar el código del período', 'Cerrar', { duration: 3000 });
      return;
    }
    
    if (confirm(`¿Estás seguro de eliminar TODOS los horarios del período ${periodo}? Esta acción no se puede deshacer.`)) {
      this.limpiandoTodo = true;
      this.api.delete<any>(`/horarios/limpiar?periodo=${periodo}`).subscribe({
        next: (res) => {
          this.limpiandoTodo = false;
          const msg = res?.data?.message || 'Horarios eliminados';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
          this.resumenGeneracion = null;
        },
        error: (err) => {
          this.limpiandoTodo = false;
          const msg = err?.error?.message || 'Error al limpiar horarios del período';
          this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  getModoLabel(): string {
    switch (this.modoAsignacion) {
      case 'AUTOMATICA': return 'Generación Automática';
      case 'VENTANAS': return 'Ventanas de Atención';
      case 'MIXTA': return 'Mixta (Auto + Ventanas)';
      default: return 'Ventanas de Atención';
    }
  }

  getModoDescripcion(): string {
    switch (this.modoAsignacion) {
      case 'AUTOMATICA':
        return 'Los horarios se generan automáticamente sin intervención del operador.';
      case 'VENTANAS':
        return 'Los docentes son atendidos uno por uno en ventanas programadas por jerarquía.';
      case 'MIXTA':
        return 'Primero se genera automáticamente, luego se atienden docentes pendientes en ventanas.';
      default:
        return '';
    }
  }
}
