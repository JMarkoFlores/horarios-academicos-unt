import {
  Component,
  OnInit,
  ViewChild,
  HostListener,
  signal,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectChange } from '@angular/material/select';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { ROLES } from '../core/constants/roles';
import { AuthService } from '../core/services/auth.service';
import { PeriodoService } from '../core/services/periodo.service';
import { ConfiguracionGeneralService } from '../core/services/configuracion-general.service';
import { ApiService } from '../core/services/api.service';
import { SocketService } from '../core/services/socket.service';
import { RegistrarUsuarioDialogComponent } from './dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';

import { fromEvent } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route?: string;
  roles?: string[];
  action?: () => void;
}

interface NavGroup {
  label: string;
  expanded: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  animations: [
    trigger('groupExpand', [
      state(
        'collapsed',
        style({ height: '0px', overflow: 'hidden', opacity: 0 }),
      ),
      state('expanded', style({ height: '*', overflow: 'hidden', opacity: 1 })),
      transition(
        'collapsed <=> expanded',
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'),
      ),
    ]),
  ],
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  isDark = signal(false);
  sidebarCollapsed = signal(false);
  selectedPeriodoCodigo = signal('');

  usuario = this.authService.getUsuarioActual();
  userPhoto = signal<string | null>(null);
  readonly ROLES = ROLES;
  private _visibleNavGroups: NavGroup[] = [];
  private _resizeTimer: any;
  private destroyRef = inject(DestroyRef);

  navGroups: NavGroup[] = [
    {
      label: 'nav.groups.main',
      expanded: true,
      items: [
        { icon: 'dashboard', label: 'sidebar.dashboard', route: '/app/dashboard' },
        { 
          icon: 'smart_toy', 
          label: 'sidebar.aiAssistant', 
          action: () => this.showChatbot(),
          roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE, ROLES.DIRECTOR_ESCUELA, ROLES.DECANO, ROLES.SECRETARIA, ROLES.OPERADOR_HORARIOS]
        },
      ],
    },
    {
      label: 'nav.groups.academic',
      expanded: true,
      items: [
        { icon: 'people', label: 'sidebar.teachers', route: '/app/docentes', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
        { icon: 'menu_book', label: 'sidebar.courses', route: '/app/cursos', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
        { icon: 'meeting_room', label: 'sidebar.environments', route: '/app/ambientes', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
        { icon: 'auto_stories', label: 'sidebar.planEstudios', route: '/app/plan-estudios', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
        { icon: 'assignment', label: 'sidebar.asignacionLectiva', route: '/app/asignacion-lectiva', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.SECRETARIA] },
        { icon: 'event_available', label: 'sidebar.availability', route: '/app/disponibilidad', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE] },
        { icon: 'school', label: 'sidebar.teacherFaculty', route: '/app/docente-facultad', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
      ],
    },
    {
      label: 'nav.groups.operations',
      expanded: true,
      items: [
        { icon: 'schedule', label: 'sidebar.schedules', route: '/app/horarios', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
      ],
    },
    {
      label: 'nav.groups.windows',
      expanded: true,
      items: [
        { icon: 'event', label: 'sidebar.myWindows', route: '/app/mis-ventanas', roles: [ROLES.DOCENTE] },
        { icon: 'support_agent', label: 'Ventanas de Atención', route: '/app/secretaria', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.SECRETARIA] },
      ],
    },
    {
      label: 'nav.groups.declarations',
      expanded: true,
      items: [
        { icon: 'description', label: 'sidebar.declarations', route: '/app/declaraciones', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.OPERADOR_HORARIOS, ROLES.DOCENTE, ROLES.DECANO, ROLES.DIRECTOR_DEPARTAMENTO, ROLES.DIRECTOR_ESCUELA] },
        { icon: 'approval', label: 'Aprobación Facultad', route: '/app/declaraciones/aprobacion-facultad', roles: [ROLES.DECANO, ROLES.ADMINISTRADOR_SISTEMA] },
        { icon: 'post_add', label: 'CLAD', route: '/app/clad', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE, ROLES.DECANO, ROLES.DIRECTOR_DEPARTAMENTO] },
        { icon: 'fact_check', label: 'sidebar.documentations', route: '/app/documentaciones', roles: [ROLES.DIRECTOR_ESCUELA, ROLES.DIRECTOR_DEPARTAMENTO] },
        { icon: 'insights', label: 'sidebar.loadAnalysis', route: '/app/analisis-carga', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
      ],
    },
    {
      label: 'nav.groups.reports',
      expanded: true,
      items: [
        { icon: 'table_chart', label: 'sidebar.reports', route: '/app/reportes', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
        { icon: 'analytics', label: 'sidebar.analytics', route: '/app/analytics', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
      ],
    },
    {
      label: 'nav.groups.system',
      expanded: true,
      items: [
        { icon: 'manage_accounts', label: 'sidebar.users', route: '/app/usuarios', roles: [ROLES.ADMINISTRADOR_SISTEMA] },
        { icon: 'event_note', label: 'sidebar.periods', route: '/app/periodos', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
        { icon: 'tune', label: 'sidebar.loadParams', route: '/app/parametros-carga', roles: [ROLES.ADMINISTRADOR_SISTEMA] },
        { icon: 'account_balance', label: 'sidebar.faculties', route: '/app/facultades', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
        { icon: 'campaign', label: 'sidebar.campaigns', route: '/app/campaigns', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
        { icon: 'history', label: 'sidebar.audit', route: '/app/auditoria', roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_DEPARTAMENTO, ROLES.DIRECTOR_ESCUELA] },
        { icon: 'notifications', label: 'sidebar.notifications', route: '/app/notificaciones', roles: [ROLES.DOCENTE, ROLES.ADMINISTRADOR_SISTEMA] },
        { icon: 'settings', label: 'sidebar.settings', route: '/app/configuracion', roles: [ROLES.ADMINISTRADOR_SISTEMA] },
      ],
    },
  ];

  @HostListener('window:resize')
  onResize(): void {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      const wasMobile = this.isMobile();
      this.isMobile.set(window.innerWidth < 768);
      if (!wasMobile && this.isMobile()) this.sidenav?.close();
      if (wasMobile && !this.isMobile()) this.sidenav?.open();
    }, 150);
  }

  private _rutasSinPeriodo = new Set([
    'docentes', 'cursos', 'ambientes', 'plan-estudios', 'asignacion-lectiva',
    'configuracion', 'periodos', 'campaigns',
    'usuarios', 'notificaciones', 'analisis-carga',
    'declaraciones', 'documentaciones', 'docente-facultad',
    'auditoria',
  ]);
  showPeriodoSelector = signal(true);
  notificacionesCount = signal(0);
  alertasData = signal<any>(null);

  constructor(
    public authService: AuthService,
    public periodoService: PeriodoService,
    private router: Router,
    private dialog: MatDialog,
    public configService: ConfiguracionGeneralService,
    public socketService: SocketService,
    private api: ApiService,
  ) {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((e) => {
      const seg = e.urlAfterRedirects.split('/')[2] ?? '';
      this.showPeriodoSelector.set(!this._rutasSinPeriodo.has(seg));
    });

    this.periodoService.periodo$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((codigo) => this.selectedPeriodoCodigo.set(codigo));

    this.authService.profilePhoto$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((photo) => this.userPhoto.set(photo));

    fromEvent(window, 'chatbotVisibilityChanged').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this._computeVisibleNavGroups());
  }

  ngOnInit(): void {
    this.configService.cargar();
    this.isDark.set(false);
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    this._computeVisibleNavGroups();
    this.periodoService.cargarPeriodos();
    this._loadNotificacionesCount();
  }

  private _loadNotificacionesCount(): void {
    // Only load admin alerts if user is not a docente
    if (this.authService.hasRole(ROLES.DOCENTE) && !this.authService.hasRole(
      ROLES.ADMINISTRADOR_SISTEMA, 
      ROLES.COORDINADOR_ACADEMICO, 
      ROLES.DIRECTOR_ESCUELA, 
      ROLES.DIRECTOR_DEPARTAMENTO,
      ROLES.DECANO,
      ROLES.SECRETARIA,
      ROLES.OPERADOR_HORARIOS
    )) {
      this.notificacionesCount.set(0);
      this.alertasData.set(null);
      return;
    }

    const fetchCount = () => {
      this.api.get<any>('/dashboard/alerts', { periodo: this.periodoService.periodo })
        .subscribe({
          next: (res) => {
            const alerts = res.data ?? res;
            const total = (alerts.conflictos_activos ?? 0) + (alerts.docentes_pendientes ?? 0) + (alerts.cursos_sin_asignar ?? 0);
            this.notificacionesCount.set(Math.min(total, 9));
            this.alertasData.set(alerts);
          },
          error: () => {
            this.notificacionesCount.set(0);
            this.alertasData.set(null);
          },
        });
    };

    fetchCount();
    this.periodoService.periodo$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => fetchCount());
  }

  irA(section: string): void {
    const routes: Record<string, string> = {
      horarios: '/app/horarios',
      docentes: '/app/docentes',
      cursos: '/app/cursos',
      dashboard: '/app/dashboard',
    };
    this.router.navigate([routes[section]]);
  }

  private _computeVisibleNavGroups(): void {
    const isChatbotHidden = localStorage.getItem('chatbot_visible') === 'false';

    this._visibleNavGroups = this.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // Si es el ítem del chatbot y ya es visible en la pantalla, no lo mostramos en el menú
          if (item.label === 'Asistente IA' && !isChatbotHidden) return false;

          if (!item.roles || item.roles.length === 0) return true;
          return this.authService.hasRole(...item.roles);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  showChatbot(): void {
    localStorage.setItem('chatbot_visible', 'true');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'chatbot_visible',
      newValue: 'true'
    }));
    this._computeVisibleNavGroups();
  }

  get visibleNavGroups(): NavGroup[] {
    return this._visibleNavGroups;
  }

  toggleGroup(group: NavGroup): void {
    if (this.sidebarCollapsed()) {
      this.sidebarCollapsed.set(false);
      group.expanded = true;
      return;
    }
    group.expanded = !group.expanded;
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }

  onPeriodoChange(ev: MatSelectChange): void {
    this.periodoService.cambiarPeriodo(ev.value);
  }

  toggleDarkMode(): void {
    this.isDark.update(v => !v);
    if (this.isDark()) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }

  openRegistrarUsuario(): void {
    this.dialog.open(RegistrarUsuarioDialogComponent, {
      width: '480px',
      disableClose: true,
    });
  }

  openVerPerfil(): void {
    this.router.navigate(['/app/perfil']);
  }

  openCambiarPassword(): void {
    this.router.navigate(['/app/perfil'], { queryParams: { tab: 'password' } });
  }

  logout(): void {
    this.authService.logout();
  }

  getSelectedPeriodoNombre(): string {
    const periodos = this.periodoService.periodos;
    const codigo = this.selectedPeriodoCodigo();
    const found = periodos.find(p => p.codigo === codigo);
    return found?.nombre || codigo || 'Seleccionar Período';
  }
}
