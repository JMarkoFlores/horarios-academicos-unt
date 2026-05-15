import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DisponibilidadComponent } from './disponibilidad.component';

const routes: Routes = [{ path: '', component: DisponibilidadComponent }];

@NgModule({
  declarations: [DisponibilidadComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DisponibilidadModule {}
