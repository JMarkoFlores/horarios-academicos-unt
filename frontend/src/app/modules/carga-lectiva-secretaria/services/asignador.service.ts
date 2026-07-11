import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import {
  CursoPendiente,
  DocenteAsignador,
  BloqueHorario,
  AmbienteDisponible,
  HistorialAccion,
  ProgresoAsignacion,
  MiniFormularioData,
} from '../models/asignador.models';
import { CargaLectivaApiService } from './carga-lectiva-api.service';

@Injectable({ providedIn: 'root' })
export class AsignadorService {
  readonly cursosPendientes = signal<CursoPendiente[]>([]);
  readonly docentes = signal<DocenteAsignador[]>([]);
  readonly ambientes = signal<AmbienteDisponible[]>([]);
  readonly docenteSeleccionado = signal<DocenteAsignador | null>(null);
  readonly bloquesDocente = signal<BloqueHorario[]>([]);
  readonly progreso = signal<ProgresoAsignacion | null>(null);
  readonly cargando = signal(false);
  readonly historial = signal<HistorialAccion[]>([]);
  readonly undoDisponible = computed(() => this.historial().length > 0);

  readonly cursoArrastrando = signal<CursoPendiente | null>(null);
  readonly tipoClaseArrastrando = signal<string>('');

  readonly formularioVisible = signal(false);
  readonly formularioData = signal<MiniFormularioData | null>(null);

  private refresh$ = new Subject<void>();
  refresh$observable = this.refresh$.asObservable();

  constructor(private api: CargaLectivaApiService) {}

  async cargarDatos(periodoId: number, periodoCodigo: string): Promise<void> {
    this.cargando.set(true);
    try {
      const [cursos, docentes, ambientes, progreso] = await Promise.all([
        this.api.getCursosPendientes(periodoId).toPromise(),
        this.api.getDocentes(periodoId).toPromise(),
        this.api.getAmbientes(periodoCodigo).toPromise(),
        this.api.getProgreso(periodoId).toPromise(),
      ]);
      this.cursosPendientes.set(cursos || []);
      this.docentes.set(docentes || []);
      this.ambientes.set(ambientes || []);
      this.progreso.set(progreso || null);
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionarDocente(docente: DocenteAsignador, periodo: string): Promise<void> {
    this.docenteSeleccionado.set(docente);
    const bloques = await this.api.getHorarioDocente(docente.id, periodo).toPromise();
    this.bloquesDocente.set(bloques || []);
  }

  getBloquesAmbiente(ambienteId: number): BloqueHorario[] {
    const amb = this.ambientes().find(a => a.id === ambienteId);
    return amb?.bloquesOcupados || [];
  }

  iniciarArrastre(curso: CursoPendiente, tipoClase: string): void {
    this.cursoArrastrando.set(curso);
    this.tipoClaseArrastrando.set(tipoClase);
  }

  finalizarArrastre(): void {
    this.cursoArrastrando.set(null);
    this.tipoClaseArrastrando.set('');
  }

  abrirFormulario(data: MiniFormularioData): void {
    this.formularioData.set(data);
    this.formularioVisible.set(true);
  }

  cerrarFormulario(): void {
    this.formularioVisible.set(false);
    this.formularioData.set(null);
  }

  async asignarBloque(datos: any): Promise<boolean> {
    this.cargando.set(true);
    try {
      const resultado = await this.api.asignar(datos).toPromise();
      if (resultado) {
        this.historial.update(h => [...h, {
          tipo: 'asignar',
          timestamp: Date.now(),
          horarioId: resultado.id,
          datosAnteriores: null,
          datosNuevos: datos,
        }]);
        this.refresh$.next();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminarBloque(horarioId: number, datosAnteriores: any): Promise<boolean> {
    this.cargando.set(true);
    try {
      await this.api.eliminar(horarioId).toPromise();
      this.historial.update(h => [...h, {
        tipo: 'eliminar',
        timestamp: Date.now(),
        horarioId,
        datosAnteriores,
        datosNuevos: null,
      }]);
      this.refresh$.next();
      return true;
    } catch {
      return false;
    } finally {
      this.cargando.set(false);
    }
  }

  async recargarProgreso(periodoId: number): Promise<void> {
    const progreso = await this.api.getProgreso(periodoId).toPromise();
    this.progreso.set(progreso || null);
  }
}
