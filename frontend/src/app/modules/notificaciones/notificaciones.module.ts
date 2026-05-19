import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { NotificacionesComponent } from './notificaciones.component';

const routes: Routes = [
  { path: '', component: NotificacionesComponent },
];

@NgModule({
  declarations: [NotificacionesComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class NotificacionesModule {}
