import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
} from '@angular/core';
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
import { AuthService } from '../core/services/auth.service';
import { PeriodoService } from '../core/services/periodo.service';
import { ConfiguracionGeneralService } from '../core/services/configuracion-general.service';
import { RegistrarUsuarioDialogComponent } from './dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';
import { CambiarPasswordDialogComponent } from './dialogs/cambiar-password-dialog/cambiar-password-dialog.component';
import { PerfilDialogComponent } from './dialogs/perfil-dialog/perfil-dialog.component';
import { Subscription } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  roles?: string[];
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
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  isDark = false;
  sectionTitle = 'Dashboard';
  sidebarCollapsed = false;
  selectedPeriodoCodigo: string = '';

  // Cachear usuario y navGroups para evitar recálculos en change detection
  usuario = this.authService.getUsuarioActual();
  userPhoto: string | null = null;
  private _visibleNavGroups: NavGroup[] = [];
  private _routerSub!: Subscription;
  private _photoSub!: Subscription;
  private _resizeTimer: any;
  private _periodoSub!: Subscription;

  // Grupos de navegación para mejor organización visual
  navGroups: NavGroup[] = [
    {
      label: 'Principal',
      expanded: true,
      items: [
        { icon: 'dashboard', label: 'Dashboard', route: '/app/dashboard' },
      ],
    },
    {
      label: 'Gestión Académica',
      expanded: true,
      items: [
        {
          icon: 'people',
          label: 'Docentes',
          route: '/app/docentes',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'menu_book',
          label: 'Cursos',
          route: '/app/cursos',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'meeting_room',
          label: 'Ambientes',
          route: '/app/ambientes',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'assignment_ind',
          label: 'Asignaciones',
          route: '/app/asignaciones',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'link',
          label: 'Docente-Curso',
          route: '/app/docente-cursos',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'link',
          label: 'Curso-Ambiente',
          route: '/app/curso-ambientes',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'school',
          label: 'Docente-Facultad',
          route: '/app/docente-facultad',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'event_available',
          label: 'Disponibilidad',
          route: '/app/disponibilidad',
          roles: ['administradorsistema', 'coordinadoracademico', 'docente'],
        },
      ],
    },
    {
      label: 'Operaciones',
      expanded: true,
      items: [
        {
          icon: 'schedule',
          label: 'Horarios',
          route: '/app/horarios',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
        {
          icon: 'schedule',
          label: 'Mis Horarios',
          route: '/app/mis-horarios',
          roles: ['docente'],
        },
        {
          icon: 'support_agent',
          label: 'Secretaria',
          route: '/app/secretaria',
          roles: ['administradorsistema', 'coordinadoracademico', 'secretaria'],
        },
      ],
    },
    {
      label: 'Reportes y Análisis',
      expanded: true,
      items: [
        {
          icon: 'table_chart',
          label: 'Reportes',
          route: '/app/reportes',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
        {
          icon: 'analytics',
          label: 'Analytics',
          route: '/app/analytics',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
        {
          icon: 'insights',
          label: 'Análisis de Carga',
          route: '/app/analisis-carga',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
        {
          icon: 'description',
          label: 'Declaraciones',
          route: '/app/declaraciones',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'operadorhorarios',
            'docente',
          ],
        },
        {
          icon: 'fact_check',
          label: 'Documentaciones',
          route: '/app/documentaciones',
          roles: ['directorescuela'],
        },
      ],
    },
    {
      label: 'Sistema',
      expanded: true,
      items: [
        {
          icon: 'manage_accounts',
          label: 'Usuarios',
          route: '/app/usuarios',
          roles: ['administradorsistema'],
        },
        {
          icon: 'event_note',
          label: 'Periodos',
          route: '/app/periodos',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'campaign',
          label: 'Campañas',
          route: '/app/campaigns',
          roles: ['administradorsistema', 'coordinadoracademico'],
        },
        {
          icon: 'notifications',
          label: 'Notificaciones',
          route: '/app/notificaciones',
          roles: ['docente', 'administradorsistema'],
        },
        {
          icon: 'account_balance',
          label: 'Facultades',
          route: '/app/facultades',
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
        {
          icon: 'settings',
          label: 'Configuración',
          route: '/app/configuracion',
          roles: ['administradorsistema'],
        },
      ],
    },
  ];

  @HostListener('window:resize')
  onResize(): void {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (!wasMobile && this.isMobile) this.sidenav?.close();
      if (wasMobile && !this.isMobile) this.sidenav?.open();
    }, 150);
  }

  private titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    docentes: 'Gestión de Docentes',
    cursos: 'Gestión de Cursos',
    ambientes: 'Gestión de Ambientes',
    disponibilidad: 'Disponibilidad Docente',
    reportes: 'Reportes',
    horarios: 'Horarios — Vista de Asignaciones',
    asignaciones: 'Gestión de Asignaciones',
    analytics: 'Análisis Inteligente',
    'analisis-carga': 'Análisis de Carga Docente',
    secretaria: 'Secretaria — Sistema de Turnos',
    preasignaciones: 'Preasignaciones de Cursos',
    auditoria: 'Auditoría de Horarios',
    periodos: 'Períodos Académicos',
    campaigns: 'Campañas de Ventanas',
    usuarios: 'Usuarios del Sistema',
    configuracion: 'Configuración del Sistema',
    notificaciones: 'Notificaciones y Preferencias',
    declaraciones: 'Gestión de Declaraciones Normativas',
    documentaciones: 'Revisión de Documentaciones',
    'docente-facultad': 'Asignación Docente-Facultad',
  };

  private _rutasSinPeriodo = new Set([
    'docentes',
    'cursos',
    'ambientes',
    'configuracion',
    'periodos',
    'campaigns',
    'usuarios',
    'notificaciones',
    'analisis-carga',
    'declaraciones',
    'documentaciones',
    'docente-facultad',
  ]);
  showPeriodoSelector = true;
  notificacionesCount = 3; // Simulación de notificaciones no leídas

  constructor(
    public authService: AuthService,
    public periodoService: PeriodoService,
    private router: Router,
    private dialog: MatDialog,
    public configService: ConfiguracionGeneralService,
  ) {}

  ngOnInit(): void {
    this.configService.cargar();
    // Forzar modo claro al iniciar
    this.isDark = false;
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');

    // Cachear grupos de navegación filtrados por rol (solo una vez)
    this._computeVisibleNavGroups();

    // Cargar periodos desde la base de datos (no bloqueante)
    this.periodoService.cargarPeriodos();

    // Suscribirse a cambios en el período seleccionado
    this._periodoSub = this.periodoService.periodo$.subscribe((codigo) => {
      this.selectedPeriodoCodigo = codigo;
    });

    this._photoSub = this.authService.profilePhoto$.subscribe((photo) => {
      this.userPhoto = photo;
    });

    this._routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const seg = (e.urlAfterRedirects as string).split('/')[2] ?? '';
        this.sectionTitle = this.titleMap[seg] ?? 'Sistema de Horarios UNT';
        this.showPeriodoSelector = !this._rutasSinPeriodo.has(seg);
      });
  }

  ngOnDestroy(): void {
    if (this._routerSub) {
      this._routerSub.unsubscribe();
    }
    if (this._photoSub) {
      this._photoSub.unsubscribe();
    }
    if (this._periodoSub) {
      this._periodoSub.unsubscribe();
    }
    clearTimeout(this._resizeTimer);
  }

  private _computeVisibleNavGroups(): void {
    this._visibleNavGroups = this.navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.roles || item.roles.length === 0) return true;
          return this.authService.hasRole(...item.roles);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  get visibleNavGroups(): NavGroup[] {
    return this._visibleNavGroups;
  }

  toggleGroup(group: NavGroup): void {
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
      group.expanded = true;
      return;
    }
    group.expanded = !group.expanded;
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
  }

  onPeriodoChange(ev: MatSelectChange): void {
    this.periodoService.cambiarPeriodo(ev.value);
  }

  toggleDarkMode(): void {
    this.isDark = !this.isDark;
    if (this.isDark) {
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
    const dialogRef = this.dialog.open(PerfilDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'profile-dialog-panel',
      data: this.usuario,
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== 'logout') {
        this.router.navigate(['/app/dashboard']);
      }
    });
  }

  openCambiarPassword(): void {
    this.dialog.open(CambiarPasswordDialogComponent, {
      width: '440px',
      disableClose: true,
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
