import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { LandingComponent } from './auth/landing/landing.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';
import { LayoutComponent } from './layout/layout.component';
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
        data: { roles: ['administradorsistema'] },
      },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./modules/configuracion/configuracion.module').then(
            (m) => m.ConfiguracionModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema'] },
      },
      // Coordinador + Admin
      {
        path: 'docentes',
        loadChildren: () =>
          import('./modules/docentes/docentes.module').then(
            (m) => m.DocentesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./modules/cursos/cursos.module').then((m) => m.CursosModule),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
        path: 'ambientes',
        loadChildren: () =>
          import('./modules/ambientes/ambientes.module').then(
            (m) => m.AmbientesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
            path: 'periodos',
            loadChildren: () =>
              import('./modules/periodos/periodos.module').then(
                (m) => m.PeriodosModule,
              ),
            canActivate: [RolesGuard],
            data: { roles: ['administradorsistema', 'coordinadoracademico'] },
          },
          {
            path: 'campaigns',
            loadChildren: () =>
              import('./modules/campaigns/campaigns.module').then(
                (m) => m.CampaignsModule,
              ),
            canActivate: [RolesGuard],
            data: { roles: ['administradorsistema', 'coordinadoracademico'] },
          },
      // Secretaria
      {
        path: 'secretaria',
        loadChildren: () =>
          import('./modules/operador/operador.module').then(
            (m) => m.OperadorModule,
          ),
        canActivate: [RolesGuard],
        data: {
          roles: [
            'administradorsistema',
            'coordinadoracademico',
            'secretaria',
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
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
          ],
        },
      },
      {
        path: 'notificaciones',
        loadChildren: () =>
          import('./modules/notificaciones/notificaciones.module').then(
            (m) => m.NotificacionesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['docente', 'administradorsistema'] },
      },
      {
        path: 'asignaciones',
        loadChildren: () =>
          import('./modules/asignaciones/asignaciones.module').then(
            (m) => m.AsignacionesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
        path: 'docente-cursos',
        loadChildren: () =>
          import('./modules/docente-cursos-config/docente-cursos-config.module').then(
            (m) => m.DocenteCursosConfigModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
        path: 'curso-ambientes',
        loadChildren: () =>
          import('./modules/curso-ambientes-config/curso-ambientes-config.module').then(
            (m) => m.CursoAmbientesConfigModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
      },
      {
        path: 'disponibilidad',
        loadChildren: () =>
          import('./modules/disponibilidad/disponibilidad.module').then(
            (m) => m.DisponibilidadModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['administradorsistema', 'coordinadoracademico'] },
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
            'administradorsistema',
            'directorescuela',
            'coordinadoracademico',
            'operadorhorarios',
          ],
        },
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
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
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
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
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
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
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
            'administradorsistema',
            'coordinadoracademico',
            'directorescuela',
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
        data: { roles: ['docente', 'administradorsistema'] },
      },
      {
        path: 'notificaciones',
        loadChildren: () =>
          import('./modules/notificaciones/notificaciones.module').then(
            (m) => m.NotificacionesModule,
          ),
        canActivate: [RolesGuard],
        data: { roles: ['docente', 'administradorsistema'] },
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
