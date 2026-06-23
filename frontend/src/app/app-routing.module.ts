import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { LandingComponent } from './auth/landing/landing.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';
import { LayoutComponent } from './layout/layout.component';
import { ROLES } from './core/constants/roles';
import { AuthGuard } from './core/guards/auth.guard';
import { RolesGuard } from './core/guards/roles.guard';

const routes: Routes = [
  { path: '', component: LandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'welcome', component: LandingComponent },
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard/dashboard.module').then(
            (m) => m.DashboardModule,
          ),
      },

      // Admin only
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./modules/usuarios/usuarios.module').then(
            (m) => m.UsuariosModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA] },
      },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./modules/configuracion/configuracion.module').then(
            (m) => m.ConfiguracionModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA] },
      },
      // Coordinador + Admin
      {
        path: 'docentes',
        loadChildren: () =>
          import('./modules/docentes/docentes.module').then(
            (m) => m.DocentesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
      },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./modules/cursos/cursos.module').then((m) => m.CursosModule),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
      },
      {
        path: 'ambientes',
        loadChildren: () =>
          import('./modules/ambientes/ambientes.module').then(
            (m) => m.AmbientesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
      },
      {
        path: 'plan-estudios',
        loadChildren: () =>
          import('./modules/plan-estudios/plan-estudios.module').then(
            (m) => m.PlanEstudiosModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DIRECTOR_ESCUELA] },
      },
      {
        path: 'asignacion-lectiva',
        loadChildren: () =>
          import('./modules/asignacion-lectiva/asignacion-lectiva.module').then(
            (m) => m.AsignacionLectivaModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.SECRETARIA] },
      },
      {
            path: 'periodos',
            loadChildren: () =>
              import('./modules/periodos/periodos.module').then(
                (m) => m.PeriodosModule,
              ),
            canActivate: [RolesGuard],
            data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
          },
      {
        path: 'parametros-carga',
        loadChildren: () =>
          import('./modules/parametros-carga/parametros-carga.module').then(
            (m) => m.ParametrosCargaModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA] },
      },
      {
        path: 'campaigns',
            loadChildren: () =>
              import('./modules/campaigns/campaigns.module').then(
                (m) => m.CampaignsModule,
              ),
            canActivate: [RolesGuard],
            data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
          },
      // Secretaria
      {
        path: ROLES.SECRETARIA,
        loadChildren: () =>
          import('./modules/operador/operador.module').then(
            (m) => m.OperadorModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.SECRETARIA,
          ],
        },
      },
      {
        path: 'horarios',
        loadChildren: () =>
          import('./modules/horarios/horarios.module').then(
            (m) => m.HorariosModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      {
        path: 'disponibilidad',
        loadChildren: () =>
          import('./modules/disponibilidad/disponibilidad.module').then(
            (m) => m.DisponibilidadModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE] },
      },
      {
        path: 'declaraciones',
        loadChildren: () =>
          import('./modules/declaraciones/declaraciones.module').then(
            (m) => m.DeclaracionesModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.OPERADOR_HORARIOS,
            ROLES.DOCENTE,
            ROLES.DECANO,
            ROLES.DIRECTOR_DEPARTAMENTO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      {
        path: 'clad',
        loadChildren: () =>
          import('./modules/clad/clad.module').then(
            (m) => m.CladModule,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./modules/perfil/perfil.component').then(
            (m) => m.PerfilComponent,
          ),
      },
      {
        path: 'docente-facultad',
        loadChildren: () =>
          import('./modules/docente-facultad/docente-facultad.module').then(
            (m) => m.DocenteFacultadModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.ADMINISTRADOR_SISTEMA, ROLES.COORDINADOR_ACADEMICO] },
      },
      {
        path: 'documentaciones',
        loadChildren: () =>
          import('./modules/documentaciones/documentaciones.module').then(
            (m) => m.DocumentacionesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.DIRECTOR_ESCUELA, ROLES.DIRECTOR_DEPARTAMENTO] },
      },
      {
        path: 'facultades',
        loadChildren: () =>
          import('./modules/facultades/facultades.module').then(
            (m) => m.FacultadesModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      // Reportes (Director, Admin, Coord)
      {
        path: 'reportes',
        loadChildren: () =>
          import('./modules/reportes/reportes.module').then(
            (m) => m.ReportesModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      {
        path: 'auditoria',
        loadChildren: () =>
          import('./modules/auditoria/auditoria.module').then(
            (m) => m.AuditoriaModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_DEPARTAMENTO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./modules/analytics/analytics.module').then(
            (m) => m.AnalyticsModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      {
        path: 'analisis-carga',
        loadComponent: () =>
          import('./modules/analisis-carga/analisis-carga.component').then(
            (m) => m.AnalisisCargaComponent,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            ROLES.ADMINISTRADOR_SISTEMA,
            ROLES.COORDINADOR_ACADEMICO,
            ROLES.DIRECTOR_ESCUELA,
          ],
        },
      },
      // Docente (acceso propio) — admin puede verlo para soporte
      {
        path: 'mis-horarios',
        loadChildren: () =>
          import('./modules/docente-horario/docente-horario.module').then(
            (m) => m.DocenteHorarioModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.DOCENTE, ROLES.ADMINISTRADOR_SISTEMA] },
      },
      {
        path: 'mis-ventanas',
        loadComponent: () =>
          import('./modules/operador/mis-ventanas/mis-ventanas.component').then(
            (m) => m.MisVentanasComponent,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.DOCENTE, ROLES.ADMINISTRADOR_SISTEMA] },
      },
      {
        path: 'notificaciones',
        loadChildren: () =>
          import('./modules/notificaciones/notificaciones.module').then(
            (m) => m.NotificacionesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: [ROLES.DOCENTE, ROLES.ADMINISTRADOR_SISTEMA] },
      },
      { path: '**', component: NotFoundComponent },
    ],
  },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
