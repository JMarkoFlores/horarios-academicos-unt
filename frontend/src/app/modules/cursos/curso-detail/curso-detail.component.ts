import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { ApiResponse, Curso, Ambiente, Grupo } from '../../../core/interfaces/entities';
import { AsignarAmbientesDialogComponent } from '../dialogs/asignar-ambientes-dialog/asignar-ambientes-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

interface CursoPlanEntry {
  id: number;
  plan_estudios_id: number;
  ciclo: number;
  tipo_curso: string;
  horas_teoria: number;
  horas_practica: number;
  horas_laboratorio: number;
  creditos: number;
  plan_estudios?: { id: number; nombre: string; codigo: string; activo: boolean };
}

@Component({
  selector: 'app-curso-detail',
  templateUrl: './curso-detail.component.html',
  styleUrls: ['./curso-detail.component.scss'],
})
export class CursoDetailComponent implements OnInit {
  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;

  curso: Curso | null = null;
  entries: CursoPlanEntry[] = [];
  grupos: Grupo[] = [];
  loading = true;
  grupoEditando: Grupo | null = null;
  grupoFormVisible = false;
  grupoNuevo = { tipo: 'TEORIA' as string, codigo: '', nombre: '', ciclo: 0, cupo_maximo: 0 };
  selectedTabIndex = 0;
  selectedPlanIdx = 0;

  private breadcrumb = inject(BreadcrumbService);
  private location = inject(Location);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private periodoService: PeriodoService,
  ) {}

  private tabLabels = ['informacion', 'ambientes', 'grupos'];
  private tabSuffixes = ['', 'Ambientes', 'Grupos'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/app/cursos']); return; }
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam) {
      const idx = this.tabLabels.indexOf(tabParam.toLowerCase());
      if (idx >= 0) {
        this.selectedTabIndex = idx;
        this.breadcrumb.setTabSuffix(this.tabSuffixes[idx]);
      }
    }
    this.loadData(id);
  }

  get currentEntry(): CursoPlanEntry | null {
    return this.entries[this.selectedPlanIdx] ?? this.entries[0] ?? null;
  }

  readonly tiposAmbiente = [
    { clave: 'TEORIA' as const, label: 'Teoría', icon: 'meeting_room',
      obtenerHoras: (e: CursoPlanEntry | null) => e?.horas_teoria ?? 0,
      obtenerAmbientes: (ctx: CursoDetailComponent) => ctx.ambientesTeoria() },
    { clave: 'TEORIA' as const, label: 'Práctica', icon: 'build',
      obtenerHoras: (e: CursoPlanEntry | null) => e?.horas_practica ?? 0,
      obtenerAmbientes: (ctx: CursoDetailComponent) => ctx.ambientesTeoria() },
    { clave: 'LABORATORIO' as const, label: 'Laboratorio', icon: 'biotech',
      obtenerHoras: (e: CursoPlanEntry | null) => e?.horas_laboratorio ?? 0,
      obtenerAmbientes: (ctx: CursoDetailComponent) => ctx.ambientesLaboratorio() },
  ];

  readonly tiposGrupo = [
    { clave: 'TEORIA', label: 'Teoría', icon: 'menu_book', emptyText: 'grupos de teoría' },
    { clave: 'PRACTICA', label: 'Práctica', icon: 'build', emptyText: 'grupos de práctica' },
    { clave: 'LABORATORIO', label: 'Laboratorio', icon: 'biotech', emptyText: 'laboratorios' },
  ];

  private loadData(id: number): void {
    this.loading = true;
    this.api.get<ApiResponse<Curso>>(`/cursos/${id}`).subscribe({
      next: (res) => {
        this.curso = res.data;
        this.loadEntries(id);
        this.loadGrupos(id);
      },
      error: () => {
        this.snackBar.open('Error al cargar el curso', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/app/cursos']);
      },
    });
  }

  private loadEntries(cursoId: number): void {
    this.api.get<ApiResponse<any>>('/plan-estudios', {}).subscribe({
      next: (res) => {
        const planes = Array.isArray(res.data) ? res.data : [];
        const allEntries: CursoPlanEntry[] = [];
        let loaded = 0;
        if (planes.length === 0) { this.loading = false; return; }
        for (const plan of planes) {
          this.api.get<ApiResponse<any[]>>(`/plan-estudios/${plan.id}/cursos`).subscribe({
            next: (resp) => {
              const items = Array.isArray(resp.data) ? resp.data : [];
              const entry = items.find((c: any) => c.curso_id === cursoId);
              if (entry) {
                allEntries.push({ ...entry, plan_estudios: { id: plan.id, nombre: plan.nombre, codigo: plan.codigo, activo: plan.activo } });
              }
            },
            complete: () => {
              loaded++;
              if (loaded === planes.length) {
                this.entries = allEntries;
                this.loading = false;
              }
            },
          });
        }
      },
      error: () => { this.loading = false; },
    });
  }

  private loadGrupos(cursoId: number): void {
    const periodo = this.periodoService.periodo;
    this.api.get<ApiResponse<Grupo[]>>('/grupos', { curso_id: cursoId, periodo, limit: 100 }).subscribe({
      next: (res) => {
        this.grupos = Array.isArray(res.data) ? res.data : (res.data as any)?.items ?? [];
      },
    });
  }

  get tipoCursoLabel(): string {
    return this.entryTipoLabel(this.entries[0]);
  }

  entryTipoLabel(e: CursoPlanEntry | undefined): string {
    if (!e) return '—';
    const map: Record<string, string> = { ESPECIALIDAD: 'Especialidad', OBLIGATORIO_GENERAL: 'Obl. General', OBLIGATORIO_PROFESIONAL: 'Obl. Profesional', ELECTIVO: 'Electivo' };
    return map[e.tipo_curso] || e.tipo_curso;
  }

  ambientesTeoria(): Ambiente[] {
    return (this.curso?.ambientes ?? []).filter(a => a.tipo === 'AULA' || a.tipo === 'TALLER');
  }

  ambientesLaboratorio(): Ambiente[] {
    return (this.curso?.ambientes ?? []).filter(a => a.tipo === 'LABORATORIO');
  }

  asignarAmbientes(tipo: 'TEORIA' | 'LABORATORIO'): void {
    if (!this.curso) return;
    this.dialog.open(AsignarAmbientesDialogComponent, {
      width: '540px', maxWidth: '95vw', data: { curso: this.curso, tipo_clase: tipo },
    }).afterClosed().subscribe((r: boolean) => {
      if (r) this.loadData(this.curso!.id);
    });
  }

  removerAmbiente(ambiente: Ambiente): void {
    if (!this.curso) return;
    const tipoClase = ambiente.tipo === 'LABORATORIO' ? 'LABORATORIO' : 'TEORIA';
    const ids = (tipoClase === 'LABORATORIO' ? this.ambientesLaboratorio() : this.ambientesTeoria())
      .filter(a => a.id !== ambiente.id).map(a => a.id);
    this.api.post<ApiResponse<any>>(`/cursos/${this.curso.id}/ambientes`, { ambiente_ids: ids, tipo_clase: tipoClase }).subscribe({
      next: () => {
        this.snackBar.open('Ambiente removido', 'OK', { duration: 2000 });
        this.loadData(this.curso!.id);
      },
      error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
    });
  }

  gruposPorTipo(tipo: string): Grupo[] {
    return this.grupos.filter(g => g.tipo === tipo);
  }

  mostrarFormGrupo(): void {
    this.grupoEditando = null;
    this.grupoNuevo = { tipo: 'TEORIA', codigo: '', nombre: '', ciclo: this.entries[0]?.ciclo || 1, cupo_maximo: 30 };
    this.grupoFormVisible = true;
  }

  editarGrupo(g: Grupo): void {
    this.grupoEditando = g;
    this.grupoNuevo = { tipo: g.tipo, codigo: g.codigo, nombre: g.nombre, ciclo: g.ciclo, cupo_maximo: g.cupo_maximo };
    this.grupoFormVisible = true;
  }

  cancelarGrupoForm(): void {
    this.grupoEditando = null;
    this.grupoFormVisible = false;
  }

  guardarGrupo(): void {
    if (!this.curso) return;
    const periodo = this.periodoService.periodo;
    const body = { ...this.grupoNuevo, curso_id: this.curso.id, periodo };

    if (this.grupoEditando) {
      this.api.patch<ApiResponse<any>>(`/grupos/${this.grupoEditando.id}`, body).subscribe({
        next: () => {
          this.snackBar.open('Grupo actualizado', 'OK', { duration: 2000 });
          this.cancelarGrupoForm();
          this.loadGrupos(this.curso!.id);
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    } else {
      this.api.post<ApiResponse<any>>('/grupos', body).subscribe({
        next: () => {
          this.snackBar.open('Grupo creado', 'OK', { duration: 2000 });
          this.cancelarGrupoForm();
          this.loadGrupos(this.curso!.id);
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    }
  }

  eliminarGrupo(grupo: Grupo): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar Grupo',
        message: `¿Eliminar "${grupo.nombre}"?`,
        confirmText: 'Eliminar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.api.delete(`/grupos/${grupo.id}`).subscribe({
        next: () => {
          this.snackBar.open('Grupo eliminado', 'OK', { duration: 2000 });
          this.loadGrupos(this.curso!.id);
        },
        error: (err) => this.snackBar.open(err?.error?.message ?? 'Error', 'Cerrar', { duration: 4000 }),
      });
    });
  }

  onTabChange(index: number): void {
    this.breadcrumb.setTabSuffix(this.tabSuffixes[index]);
    this.router.navigate([], { queryParams: { tab: this.tabLabels[index] }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  volver(): void {
    this.location.back();
  }
}
