import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { LandingComponent } from './auth/landing/landing.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './core/guards/auth.guard';

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
      {
        path: 'docentes',
        loadChildren: () =>
          import('./modules/docentes/docentes.module').then(
            (m) => m.DocentesModule,
          ),
      },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./modules/cursos/cursos.module').then((m) => m.CursosModule),
      },
      {
        path: 'ambientes',
        loadChildren: () =>
          import('./modules/ambientes/ambientes.module').then(
            (m) => m.AmbientesModule,
          ),
      },
      {
        path: 'disponibilidad',
        loadChildren: () =>
          import('./modules/disponibilidad/disponibilidad.module').then(
            (m) => m.DisponibilidadModule,
          ),
      },
      {
        path: 'reportes',
        loadChildren: () =>
          import('./modules/reportes/reportes.module').then(
            (m) => m.ReportesModule,
          ),
      },
      {
        path: 'horarios',
        loadChildren: () =>
          import('./modules/horarios/horarios.module').then(
            (m) => m.HorariosModule,
          ),
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./modules/analytics/analytics.module').then(
            (m) => m.AnalyticsModule,
          ),
      },
      {
        path: 'operador',
        loadChildren: () =>
          import('./modules/operador/operador.module').then(
            (m) => m.OperadorModule,
          ),
      },
      {
        path: 'periodos',
        loadChildren: () =>
          import('./modules/periodos/periodos.module').then(
            (m) => m.PeriodosModule,
          ),
      },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./modules/usuarios/usuarios.module').then(
            (m) => m.UsuariosModule,
          ),
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
