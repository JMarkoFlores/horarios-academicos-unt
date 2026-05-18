import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PeriodosListComponent } from './periodos-list/periodos-list.component';
import { PeriodoFormComponent } from './periodo-form/periodo-form.component';

const routes: Routes = [
  { path: '', component: PeriodosListComponent },
  { path: 'nuevo', component: PeriodoFormComponent },
  { path: ':id/editar', component: PeriodoFormComponent },
];

@NgModule({
  declarations: [PeriodosListComponent, PeriodoFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PeriodosModule {}
