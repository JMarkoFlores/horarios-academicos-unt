import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { PeriodoService } from '../core/services/periodo.service';
import { RegistrarUsuarioDialogComponent } from './dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';
import { CambiarPasswordDialogComponent } from './dialogs/cambiar-password-dialog/cambiar-password-dialog.component';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  isDark = false;
  sectionTitle = 'Dashboard';

  navLinks: {
    icon: string;
    label: string;
    route: string;
    adminOnly?: boolean;
  }[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/app/dashboard' },
    {
      icon: 'manage_accounts',
      label: 'Usuarios',
      route: '/app/usuarios',
      adminOnly: true,
    },
    { icon: 'people', label: 'Docentes', route: '/app/docentes' },
    { icon: 'menu_book', label: 'Cursos', route: '/app/cursos' },
    { icon: 'meeting_room', label: 'Ambientes', route: '/app/ambientes' },
    { icon: 'assignment_ind', label: 'Asignaciones', route: '/app/asignaciones' },
    {
      icon: 'event_available',
      label: 'Disponibilidad',
      route: '/app/disponibilidad',
    },
    { icon: 'table_chart', label: 'Reportes', route: '/app/reportes' },
    { icon: 'schedule', label: 'Horarios', route: '/app/horarios' },
    { icon: 'analytics', label: 'Analytics', route: '/app/analytics' },
    { icon: 'support_agent', label: 'Operador', route: '/app/operador' },
    {
      icon: 'event_note',
      label: 'Periodos',
      route: '/app/periodos',
      adminOnly: true,
    },
    {
      icon: 'settings',
      label: 'Configuración',
      route: '/app/configuracion',
      adminOnly: true,
    },
  ];

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (!wasMobile && this.isMobile) this.sidenav?.close();
    if (wasMobile && !this.isMobile) this.sidenav?.open();
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
    operador: 'Operador — Sistema de Turnos',
    periodos: 'Períodos Académicos',
    usuarios: 'Usuarios del Sistema',
    configuracion: 'Configuración del Sistema',
  };

  constructor(
    public authService: AuthService,
    public periodoService: PeriodoService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.isMobile = window.innerWidth < 768;
    this.isDark = document.body.classList.contains('dark-theme');

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const seg = (e.urlAfterRedirects as string).split('/')[2] ?? '';
        this.sectionTitle = this.titleMap[seg] ?? 'Sistema de Horarios UNT';
      });
  }

  get usuario() {
    return this.authService.getUsuarioActual();
  }

  get visibleNavLinks() {
    const isAdmin = this.authService.hasRole('administradorsistema');
    return this.navLinks.filter((l) => !l.adminOnly || isAdmin);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
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
