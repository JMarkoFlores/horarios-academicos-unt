import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AmbientesListComponent } from './ambientes-list/ambientes-list.component';
import { AmbienteFormComponent } from './ambiente-form/ambiente-form.component';
import { VerDisponibilidadDialogComponent } from './dialogs/ver-disponibilidad-dialog/ver-disponibilidad-dialog.component';
import { MapaCampusComponent } from './mapa-campus/mapa-campus.component';

const routes: Routes = [
  { path: '', component: AmbientesListComponent },
  { path: 'mapa', component: MapaCampusComponent },
  { path: 'nuevo', component: AmbienteFormComponent },
  { path: ':id/editar', component: AmbienteFormComponent },
];

@NgModule({
  declarations: [
    AmbientesListComponent,
    AmbienteFormComponent,
    VerDisponibilidadDialogComponent,
    MapaCampusComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AmbientesModule {}
