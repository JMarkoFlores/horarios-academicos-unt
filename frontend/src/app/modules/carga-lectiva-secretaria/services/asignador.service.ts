import { Injectable, signal, computed } from "@angular/core";
import { Subject } from "rxjs";
import {
  CursoPendiente,
  DocenteAsignador,
  BloqueHorario,
  AmbienteDisponible,
  HistorialAccion,
  ProgresoAsignacion,
  MiniFormularioData,
} from "../models/asignador.models";
import { CargaLectivaApiService } from "./carga-lectiva-api.service";
import { sanitizeBloqueHorario } from "@app/shared/utils/sanitize";
import { toSafeString, toSafeNumber } from "@app/shared/utils/sanitize";

@Injectable({ providedIn: "root" })
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
  readonly tipoClaseArrastrando = signal<string>("");
  readonly cursoSeleccionado = signal<CursoPendiente | null>(null);
  readonly tipoClaseSeleccionado = signal<string>("");

  readonly formularioVisible = signal(false);
  readonly formularioData = signal<MiniFormularioData | null>(null);

  private refresh$ = new Subject<void>();
  refresh$observable = this.refresh$.asObservable();

  constructor(private api: CargaLectivaApiService) {}

  async cargarDatos(periodoId: number, periodoCodigo: string): Promise<void> {
    this.cargando.set(true);
    try {
      const [cursos, docentes, ambientes, progreso] = await Promise.all([
        this.api.getCursosPendientes(periodoId).toPromise().catch(() => []),
        this.api.getDocentes(periodoId).toPromise().catch(() => []),
        this.api.getAmbientes(periodoId).toPromise().catch(() => []),
        this.api.getProgreso(periodoId).toPromise().catch(() => null),
      ]);

      this.cursosPendientes.set(this.sanitizarCursos(cursos ?? []));
      this.docentes.set(this.sanitizarDocentes(docentes ?? []));
      this.ambientes.set(this.sanitizarAmbientes(ambientes ?? []));
      this.progreso.set(progreso && typeof progreso === "object" ? progreso : null);
    } finally {
      this.cargando.set(false);
    }
  }

  private sanitizarCursos(cursos: any[]): CursoPendiente[] {
    if (!Array.isArray(cursos)) return [];
    return cursos.map((c) => ({
      cursoPlanId: toSafeNumber(c.cursoPlanId),
      cursoId: toSafeNumber(c.cursoId),
      codigo: toSafeString(c.codigo),
      nombre: toSafeString(c.nombre),
      ciclo: toSafeNumber(c.ciclo),
      tipoCurso: toSafeString(c.tipoCurso),
      horasTeoria: toSafeNumber(c.horasTeoria),
      horasPractica: toSafeNumber(c.horasPractica),
      horasLaboratorio: toSafeNumber(c.horasLaboratorio),
      horasAsignadasTeoria: toSafeNumber(c.horasAsignadasTeoria),
      horasAsignadasPractica: toSafeNumber(c.horasAsignadasPractica),
      horasAsignadasLaboratorio: toSafeNumber(c.horasAsignadasLaboratorio),
      tiposRequeridos: Array.isArray(c.tiposRequeridos) ? c.tiposRequeridos.map((t: any) => toSafeString(t)) : [],
      grupos: Array.isArray(c.grupos)
        ? c.grupos.map((g: any) => ({
            id: toSafeNumber(g.id),
            codigo: toSafeString(g.codigo),
            nombre: toSafeString(g.nombre),
            tipo: toSafeString(g.tipo),
            cupoMaximo: toSafeNumber(g.cupoMaximo, 30),
          }))
        : [],
      totalAlumnos: toSafeNumber(c.totalAlumnos),
      ambientesCompatibles: Array.isArray(c.ambientesCompatibles) ? c.ambientesCompatibles.map((a: any) => toSafeNumber(a)) : [],
      tieneLaboratorio: !!c.tieneLaboratorio,
      departamentoId: c.departamentoId != null ? toSafeNumber(c.departamentoId) : 0,
    }));
  }

  private sanitizarDocentes(docentes: any[]): DocenteAsignador[] {
    if (!Array.isArray(docentes)) return [];
    return docentes.map((d) => ({
      id: toSafeNumber(d.id),
      nombre: toSafeString(d.nombre),
      apellido: toSafeString(d.apellido),
      codigo: toSafeString(d.codigo),
      categoria: toSafeString(d.categoria),
      modalidad: toSafeString(d.modalidad),
      tipoDocente: toSafeString(d.tipoDocente),
      departamentoNombre: toSafeString(d.departamentoNombre),
      facultadId: d.facultadId != null ? toSafeNumber(d.facultadId) : 0,
      facultadNombre: toSafeString(d.facultadNombre),
      departamentoId: d.departamentoId != null ? toSafeNumber(d.departamentoId) : 0,
      horasLectivasAsignadas: toSafeNumber(d.horasLectivasAsignadas),
      horasLectivasMax: toSafeNumber(d.horasLectivasMax),
      horasNoLectivas: toSafeNumber(d.horasNoLectivas),
      horasRestantes: toSafeNumber(d.horasRestantes),
      enSuspension: !!d.enSuspension,
      bloquesExistentes: [],
    }));
  }

  private sanitizarAmbientes(ambientes: any[]): AmbienteDisponible[] {
    if (!Array.isArray(ambientes)) return [];
    return ambientes.map((a) => ({
      id: toSafeNumber(a.id),
      codigo: toSafeString(a.codigo),
      nombre: toSafeString(a.nombre),
      tipo: toSafeString(a.tipo),
      estado: toSafeString(a.estado),
      capacidad: toSafeNumber(a.capacidad),
      piso: toSafeNumber(a.piso),
      pabellon: toSafeString(a.pabellon),
      activo: !!a.activo,
      bloquesOcupados: Array.isArray(a.bloquesOcupados) ? this.sanitizarBloques(a.bloquesOcupados) : [],
      totalBloquesOcupados: toSafeNumber(a.totalBloquesOcupados),
    }));
  }

  async seleccionarDocente(docente: DocenteAsignador, periodoId: number): Promise<void> {
    const docenteSanitizado = this.docentes().find((d) => d.id === docente.id);
    if (docenteSanitizado) {
      this.docenteSeleccionado.set(docenteSanitizado);
    }

    const bloques = await this.api.getHorarioDocente(docente.id, periodoId).toPromise().catch(() => []);
    const bloquesSanitizados = this.sanitizarBloques(bloques ?? []);
    this.bloquesDocente.set(Array.isArray(bloquesSanitizados) ? bloquesSanitizados : []);
  }

  private sanitizarBloques(bloques: any[]): BloqueHorario[] {
    if (!Array.isArray(bloques)) return [];
    return bloques.map((b) => sanitizeBloqueHorario(b) as BloqueHorario);
  }

  getBloquesAmbiente(ambienteId: number): BloqueHorario[] {
    const amb = this.ambientes().find((a) => a.id === ambienteId);
    return amb?.bloquesOcupados || [];
  }

  iniciarArrastre(curso: CursoPendiente, tipoClase: string): void {
    this.cursoArrastrando.set(curso);
    this.tipoClaseArrastrando.set(tipoClase);
    this.cursoSeleccionado.set(curso);
    this.tipoClaseSeleccionado.set(tipoClase);
  }

  finalizarArrastre(): void {
    this.cursoArrastrando.set(null);
    this.tipoClaseArrastrando.set("");
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
        this.historial.update((h) => [
          ...h,
          {
            tipo: "asignar",
            timestamp: Date.now(),
            horarioId: resultado.id,
            datosAnteriores: null,
            datosNuevos: datos,
          },
        ]);
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
      this.historial.update((h) => [
        ...h,
        {
          tipo: "eliminar",
          timestamp: Date.now(),
          horarioId,
          datosAnteriores,
          datosNuevos: null,
        },
      ]);
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

  async deshacer(): Promise<boolean> {
    const historial = this.historial();
    if (historial.length === 0) return false;

    const ultimaAccion = historial[historial.length - 1];
    this.cargando.set(true);

    try {
      if (ultimaAccion.tipo === "asignar" && ultimaAccion.horarioId) {
        await this.api.eliminar(ultimaAccion.horarioId).toPromise();
      } else if (ultimaAccion.tipo === "eliminar" && ultimaAccion.datosAnteriores) {
        await this.api.asignar(ultimaAccion.datosAnteriores).toPromise();
      }
      this.historial.update((h) => h.slice(0, -1));
      this.refresh$.next();
      return true;
    } catch {
      return false;
    } finally {
      this.cargando.set(false);
    }
  }
}