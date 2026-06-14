import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { VentanaAtencion, ApiResponse, Ambiente } from '../../../core/interfaces/entities';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { GrillaHorariosComponent } from '../grilla-horarios/grilla-horarios.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

function generarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Component({
  selector: 'app-ventana-detalle',
  templateUrl: './ventana-detalle.component.html',
  styleUrls: ['./ventana-detalle.component.scss']
})
export class VentanaDetalleComponent implements OnInit, OnDestroy {
  @ViewChild('grillaRef') grillaRef!: GrillaHorariosComponent;

  ventanaActiva: VentanaAtencion | null = null;
  loading = false;
  ventanaId: string | null = null;

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

  // Estado de modo edición
  modoEdicion = false;
  asignacionEnEdicion: any = null;
  horarioOriginalId: number | null = null;

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ventanaId = this.route.snapshot.paramMap.get('id');

    // Limpiar sesión anterior
    const sesionAnterior = localStorage.getItem('sesionId');
    const vId = localStorage.getItem('ventanaActivaId');
    if (sesionAnterior && vId) {
      this.api.post(`/ventanas/${vId}/limpiar-sesion`, { sesionId: sesionAnterior }).subscribe();
    }
    this.sesionId = generarUUID();
    localStorage.setItem('sesionId', this.sesionId);
  }

  ngOnInit(): void {
    if (!this.ventanaId) {
      this.router.navigate(['/app/secretaria/ventanas']);
      return;
    }
    this.checkVentanaActiva();
  }

  ngOnDestroy(): void {
    if (this.sesionId && this.ventanaActiva) {
      this.api.post(`/ventanas/${this.ventanaActiva.id}/limpiar-sesion`, { sesionId: this.sesionId }).subscribe();
    }
  }

  checkVentanaActiva(): void {
    this.api.get<ApiResponse<VentanaAtencion>>('/ventanas/activa').subscribe({
      next: (r) => {
        this.ventanaActiva = r.data || null;
        if (this.ventanaActiva && this.ventanaActiva.id === this.ventanaId) {
          localStorage.setItem('ventanaActivaId', this.ventanaActiva.id);
        } else {
          // If the active window is not this one, maybe it's not active anymore.
          this.snack.open('Esta ventana no está activa actualmente.', 'Volver', { duration: 5000 }).onAction().subscribe(() => {
            this.router.navigate(['/app/secretaria/ventanas']);
          });
        }
      },
      error: () => {
        this.ventanaActiva = null;
        this.snack.open('Error verificando estado de ventana', 'OK', { duration: 3000 });
        this.router.navigate(['/app/secretaria/ventanas']);
      }
    });
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

  finalizarSesion(): void {
    if (!this.ventanaActiva) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Finalizar Sesión',
        message: '¿Está seguro de finalizar la sesión de atención?',
        detail: 'Los docentes pendientes quedarán registrados como no atendidos.',
        confirmLabel: 'Finalizar',
        confirmColor: 'warn',
        icon: 'logout',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.loading = true;
      this.api.post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva!.id}/finalizar`, {}).subscribe({
        next: (r) => {
          this.ventanaActiva = null;
          this.docenteActual = null;
          this.loading = false;
          const data = r.data || {};
          const lines = [
            `Total docentes: ${data.total_docentes || 0}`,
            `Atendidos: ${data.atendidos?.length || 0}`,
            `Ausentes: ${data.ausentes?.length || 0}`
          ];
          this.snack.open(lines.join(' | '), 'OK', { duration: 5000 });
          this.router.navigate(['/app/secretaria/ventanas']);
        },
        error: () => {
          this.loading = false;
          this.snack.open('Error al finalizar sesión', 'Error', { duration: 3000 });
        }
      });
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
      
      // Auto-selección de ambiente para lab/práctica si ya hay confirmados
      if ((this.tipoClase === 'LABORATORIO' || this.tipoClase === 'PRACTICA') && this.grupoSeleccionado && this.cursoSeleccionado) {
        const horariosGrupo = this.horariosDocente.filter(h => 
          h.curso_id === this.cursoSeleccionado.cursoId && 
          (h.tipo_clase === 'LABORATORIO' || h.tipo_clase === 'PRACTICA')
        );
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
          }
        }
      }
    });
  }

  seleccionarCurso(curso: any): void {
    this.cursoSeleccionado = curso;
    this.ambienteSeleccionado = null;
    if (curso.tiposClase && curso.tiposClase.length > 0) {
      this.tipoClase = curso.tiposClase[0].tipo;
      const tipoInfo = curso.tiposClase[0];
      this.gruposDisponibles = tipoInfo ? tipoInfo.grupos : 1;
      this.grupoSeleccionado = 1;
      this.cargarAmbientesCompatibles(curso.cursoId, this.tipoClase);
    }
    this.limpiarSeleccionesTemporales();
    // Buscar asignaciones existentes para cargar automáticamente
    this.buscarAsignacionExistente();
  }

  seleccionarTipoClase(curso: any, tipo: string): void {
    this.tipoClase = tipo;
    this.ambienteSeleccionado = null;
    const tipoInfo = curso.tiposClase.find((t: any) => t.tipo === tipo);
    this.gruposDisponibles = tipoInfo ? tipoInfo.grupos : 1;
    this.grupoSeleccionado = 1;
    this.cargarAmbientesCompatibles(curso.cursoId, tipo);
    this.limpiarSeleccionesTemporales();
    // Buscar asignaciones existentes para cargar automáticamente
    this.buscarAsignacionExistente();
  }

  onGrupoChange(value: number): void {
    this.ambienteSeleccionado = null;
    this.limpiarSeleccionesTemporales();
    if (this.docenteActual) {
      this.cargarHorariosDocente(this.docenteActual.id);
    }
    // Buscar asignaciones existentes para cargar automáticamente
    this.buscarAsignacionExistente();
  }

  limpiarSeleccionesTemporales(): void {
    if (this.sesionId && this.ventanaActiva) {
      this.api.post(`/ventanas/${this.ventanaActiva.id}/limpiar-sesion`, { sesionId: this.sesionId }).subscribe({
        next: () => {
          if (this.grillaRef) this.grillaRef.cargarMatriz();
        }
      });
    }
  }

  buscarAsignacionExistente(): void {
    if (!this.docenteActual || !this.cursoSeleccionado || !this.tipoClase) {
      return;
    }
    // Limpiar modo edición previo al buscar, para evitar que
    // una edición de otro tipo de clase/grupo se herede incorrectamente
    if (this.modoEdicion && this.grillaRef) {
      this.grillaRef.setModoEdicion(false, null);
    }
    this.modoEdicion = false;
    this.asignacionEnEdicion = null;
    this.horarioOriginalId = null;

    const cursoId = this.cursoSeleccionado.cursoId;
    const tipoClase = this.tipoClase;
    const grupoId = this.grupoSeleccionado;

    let grupoIdBusqueda = grupoId;
    if (tipoClase === 'LABORATORIO' && grupoId) {
      const grupoMap: Record<number, number> = { 1: 76, 2: 77, 3: 78 };
      grupoIdBusqueda = grupoMap[grupoId] || grupoId;
    }

    const asignacionExistente = this.horariosDocente.find(h => 
      h.curso_id === cursoId && 
      h.tipo_clase === tipoClase &&
      (tipoClase === 'LABORATORIO' ? h.grupo_id === grupoIdBusqueda : true)
    );

    if (asignacionExistente) {
      if (tipoClase !== 'LABORATORIO' && asignacionExistente.grupo_id) {
        this.grupoSeleccionado = asignacionExistente.grupo_id;
      }
      
      this.ambienteSeleccionado = asignacionExistente.ambiente;
      
      setTimeout(() => {
        this.entrarModoEdicion(asignacionExistente);
      }, 100);
      
      setTimeout(() => {
        const grillaElement = document.querySelector('.tabla-wrapper');
        if (grillaElement) {
          grillaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
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
      h.curso_id === cursoId && h.tipo_clase === tipoClase
    );
    
    if ((tipoClase === 'LABORATORIO' || tipoClase === 'PRACTICA') && grupo) {
      const horariosGrupo = horariosFiltrados.filter(h => {
        if (!h.grupo) return false;
        const grupoMatch = h.grupo.codigo?.match(/-G(\d+)$/);
        if (!grupoMatch) return false;
        return parseInt(grupoMatch[1], 10) === grupo;
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
    if (!f) return this.cursosDocente;
    return this.cursosDocente.filter((c: any) =>
      c.curso?.nombre.toLowerCase().includes(f) ||
      c.curso?.codigo.toLowerCase().includes(f)
    );
  }

  seleccionarAmbienteRapido(ambiente: Ambiente): void {
    this.ambienteSeleccionado = ambiente;
  }

  confirmarHorario(): void {
    if (!this.ventanaActiva) return;
    const periodoId = this.periodoService.periodoActivo?.id;
    if (!periodoId) {
      this.snack.open('No se pudo determinar el período activo. Intente recargar la página.', 'Error', { duration: 4000 });
      return;
    }
    this.loading = true;
    
    const body: any = {
      sesionId: this.sesionId,
      periodoId
    };

    // Si estamos en modo edición, detectar tipo de cambio
    if (this.modoEdicion && this.asignacionEnEdicion) {
      const cambioAmbiente = this.ambienteSeleccionado?.id !== this.asignacionEnEdicion.ambiente_id;
      
      // Obtener las casillas originales
      const asignacionesRelacionadas = this.horariosDocente.filter(h =>
        h.curso_id === this.asignacionEnEdicion.curso_id &&
        h.tipo_clase === this.asignacionEnEdicion.tipo_clase &&
        h.grupo_id === this.asignacionEnEdicion.grupo_id
      );
      
      const celdasOriginales = new Set(asignacionesRelacionadas.map(h => `${h.dia}-${h.hora_inicio}`));
      
      // Obtener las selecciones temporales actuales
      // Necesitamos obtener las selecciones temporales del backend para comparar
      // Por ahora, asumiremos que si hay selecciones temporales, hay cambio de horas/días
      
      body.edicionDto = {
        modoEdicion: true,
        docenteId: this.docenteActual.id,
        originalCursoId: this.asignacionEnEdicion.curso_id,
        originalTipoClase: this.asignacionEnEdicion.tipo_clase,
        originalGrupoId: this.asignacionEnEdicion.grupo_id,
        cambioAmbiente: cambioAmbiente,
        celdasOriginales: Array.from(celdasOriginales)
      };
    }

    this.api.post<ApiResponse<any>>(`/ventanas/${this.ventanaActiva.id}/confirmar`, body).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.data?.confirmados > 0) {
          this.snack.open(`${r.data.confirmados} horario(s) confirmado(s)`, 'OK', { duration: 3000 });
          this.cargarHorariosDocente(this.docenteActual.id);
          if (this.tipoClase === 'LABORATORIO' || this.tipoClase === 'PRACTICA') {
            this.ambienteSeleccionado = null;
          }
          if (this.grillaRef) {
            this.grillaRef.cargarMatriz();
          }
          // Salir del modo edición después de confirmar
          if (this.modoEdicion) {
            this.salirModoEdicion();
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

  entrarModoEdicion(horario: any): void {
    this.modoEdicion = true;
    this.asignacionEnEdicion = horario;
    this.horarioOriginalId = horario.id;
    
    // Cargar el curso y tipo de clase del horario
    this.cursoSeleccionado = {
      cursoId: horario.curso_id,
      curso: horario.curso,
      tiposClase: [{ tipo: horario.tipo_clase, grupos: 1 }]
    };
    this.tipoClase = horario.tipo_clase;
    
    // Para LABORATORIO, mantener el grupo seleccionado del UI (1,2,3)
    // Para TEORIA/PRACTICA, actualizar al grupo_id de la asignación
    if (horario.tipo_clase !== 'LABORATORIO') {
      this.grupoSeleccionado = horario.grupo_id;
    }
    // Para LABORATORIO, no cambiar grupoSeleccionado (mantener valor actual del UI)
    
    this.ambienteSeleccionado = horario.ambiente;
    
    // Cargar ambientes compatibles
    this.cargarAmbientesCompatibles(horario.curso_id, horario.tipo_clase);
    
    const asignacionesRelacionadas = this.horariosDocente.filter(h =>
      h.curso_id === horario.curso_id &&
      h.tipo_clase === horario.tipo_clase &&
      h.grupo_id === horario.grupo_id
    );
    
    if (this.grillaRef) {
      this.grillaRef.setModoEdicion(true, horario, asignacionesRelacionadas);
    }
    
    this.snack.open('Modo edición activado. Las casillas originales están marcadas para eliminación.', 'OK', { duration: 4000 });
  }

  salirModoEdicion(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Salir de Modo Edición',
        message: '¿Salir del modo edición?',
        detail: 'Los cambios no guardados se perderán.',
        confirmLabel: 'Salir',
        confirmColor: 'warn',
        icon: 'edit_off',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.modoEdicion = false;
      this.asignacionEnEdicion = null;
      this.horarioOriginalId = null;
      this.cursoSeleccionado = null;
      this.ambienteSeleccionado = null;
      if (this.grillaRef) {
        this.grillaRef.setModoEdicion(false, null);
      }
      this.limpiarSeleccionesTemporales();
      this.snack.open('Modo edición desactivado', 'OK', { duration: 2000 });
    });
  }
}
