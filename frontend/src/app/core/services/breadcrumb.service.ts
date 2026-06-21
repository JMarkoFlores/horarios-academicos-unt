import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface Breadcrumb {
  label: string;
  translationKey?: string;
  icon?: string;
  url: string;
}

interface RouteLabel {
  label: string;
  icon?: string;
  translationKey?: string;
}

const ROUTE_LABELS: Record<string, RouteLabel> = {
  dashboard: { label: 'Dashboard', icon: 'dashboard', translationKey: 'breadcrumb.dashboard' },
  usuarios: { label: 'Usuarios', icon: 'manage_accounts', translationKey: 'breadcrumb.usuarios' },
  configuracion: { label: 'Configuración', icon: 'settings', translationKey: 'breadcrumb.configuracion' },
  docentes: { label: 'Docentes', icon: 'people', translationKey: 'breadcrumb.docentes' },
  'docentes/nuevo': { label: 'Nuevo', translationKey: 'breadcrumb.docentes_nuevo' },
  'docentes/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.docentes_editar' },
  cursos: { label: 'Cursos', icon: 'menu_book', translationKey: 'breadcrumb.cursos' },
  'cursos/nuevo': { label: 'Nuevo', translationKey: 'breadcrumb.cursos_nuevo' },
  'cursos/:id': { label: 'Detalle', icon: 'info' },
  'cursos/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.cursos_editar' },
  ambientes: { label: 'Ambientes', icon: 'meeting_room', translationKey: 'breadcrumb.ambientes' },
  'ambientes/mapa': { label: 'Mapa', icon: 'map', translationKey: 'breadcrumb.ambientes_mapa' },
  'ambientes/nuevo': { label: 'Nuevo', translationKey: 'breadcrumb.ambientes_nuevo' },
  'ambientes/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.ambientes_editar' },
  disponibilidad: { label: 'Disponibilidad', icon: 'event_available', translationKey: 'breadcrumb.disponibilidad' },
  horarios: { label: 'Horarios', icon: 'schedule', translationKey: 'breadcrumb.horarios' },
  'mis-horarios': { label: 'Mis Horarios', icon: 'schedule', translationKey: 'breadcrumb.misHorarios' },
  'docente-facultad': { label: 'Docente-Facultad', icon: 'school', translationKey: 'breadcrumb.docenteFacultad' },
  'docente-facultad/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.docenteFacultad_editar' },
  reportes: { label: 'Reportes', icon: 'table_chart', translationKey: 'breadcrumb.reportes' },
  analytics: { label: 'Analytics', icon: 'analytics', translationKey: 'breadcrumb.analytics' },
  'analisis-carga': { label: 'Análisis de Carga', icon: 'insights', translationKey: 'breadcrumb.analisisCarga' },
  secretaria: { label: 'Secretaría', icon: 'support_agent', translationKey: 'breadcrumb.secretaria' },
  'secretaria/ventanas': { label: 'Ventanas', translationKey: 'breadcrumb.secretariaVentanas' },
  'secretaria/ventanas/:id': { label: 'Detalle', translationKey: 'breadcrumb.secretariaVentanasDetalle' },
  declaraciones: { label: 'Declaraciones', icon: 'description', translationKey: 'breadcrumb.declaraciones' },
  'declaraciones/verificar/:id': { label: 'Verificar', translationKey: 'breadcrumb.declaracionesVerificar' },
  'declaraciones/verificar-firma/:id': { label: 'Verificar Firma', translationKey: 'breadcrumb.declaracionesVerificarFirma' },
  'declaraciones/verificar-aprobacion/:id': { label: 'Verificar Aprobación', translationKey: 'breadcrumb.declaracionesVerificarAprobacion' },
  documentaciones: { label: 'Documentaciones', icon: 'fact_check', translationKey: 'breadcrumb.documentaciones' },
  'documentaciones/:id': { label: 'Detalle', translationKey: 'breadcrumb.documentacionesDetalle' },
  notificaciones: { label: 'Notificaciones', icon: 'notifications', translationKey: 'breadcrumb.notificaciones' },
  periodos: { label: 'Períodos', icon: 'event_note', translationKey: 'breadcrumb.periodos' },
  'periodos/nuevo': { label: 'Nuevo', translationKey: 'breadcrumb.periodos_nuevo' },
  'periodos/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.periodos_editar' },
  campaigns: { label: 'Campañas', icon: 'campaign', translationKey: 'breadcrumb.campaigns' },
  'campaigns/nuevo': { label: 'Nueva', translationKey: 'breadcrumb.campaigns_nuevo' },
  'campaigns/:id/editar': { label: 'Editar', translationKey: 'breadcrumb.campaigns_editar' },
  facultades: { label: 'Facultades', icon: 'account_balance', translationKey: 'breadcrumb.facultades' },
};

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly breadcrumbs = signal<Breadcrumb[]>([]);
  private tabSuffix = '';

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((e) => {
      const base = this.resolve(e.urlAfterRedirects);
      if (base.length > 0 && this.tabSuffix) {
        const last = base[base.length - 1];
        last.label = `${last.label} › ${this.tabSuffix}`;
      }
      this.breadcrumbs.set(base);
    });
  }

  setTabSuffix(suffix: string): void {
    this.tabSuffix = suffix;
    const current = this.breadcrumbs();
    if (current.length > 0) {
      const updated = [...current];
      const last = { ...updated[updated.length - 1] };
      const baseLabel = last.label.split(' ›')[0];
      last.label = suffix ? `${baseLabel} › ${suffix}` : baseLabel;
      updated[updated.length - 1] = last;
      this.breadcrumbs.set(updated);
    }
  }

  private resolve(url: string): Breadcrumb[] {
    const withoutQuery = url.split('?')[0];
    const segments = withoutQuery.replace(/\/+$/, '').split('/').filter(s => s && s !== 'app');
    if (segments.length === 0) return [];

    const result: Breadcrumb[] = [];
    let accumulated = '';

    for (let i = 0; i < segments.length; i++) {
      accumulated = accumulated ? `${accumulated}/${segments[i]}` : segments[i];
      const config = this.matchRoute(accumulated);
      if (config) {
        result.push({
          label: config.label,
          translationKey: config.translationKey,
          icon: config.icon,
          url: `/app/${accumulated}`,
        });
      }
    }

    return result;
  }

  private matchRoute(path: string): RouteLabel | null {
    if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
    const pattern = path.split('/').map(s => (/^\d+$/.test(s) ? ':id' : s)).join('/');
    return ROUTE_LABELS[pattern] ?? null;
  }
}
