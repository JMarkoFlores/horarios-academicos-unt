import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DocentesListComponent } from './docentes-list/docentes-list.component';
import { DocenteFormComponent } from './docente-form/docente-form.component';

const routes: Routes = [
  { path: '', component: DocentesListComponent },
  { path: 'nuevo', component: DocenteFormComponent },
  { path: ':id/editar', component: DocenteFormComponent },
];

@NgModule({
  declarations: [DocentesListComponent, DocenteFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DocentesModule {}
