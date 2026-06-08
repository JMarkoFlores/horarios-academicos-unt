import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DocenteFacultadListComponent } from './docente-facultad-list/docente-facultad-list.component';
import { DocenteFacultadFormComponent } from './docente-facultad-form/docente-facultad-form.component';

const routes: Routes = [
  { path: '', component: DocenteFacultadListComponent },
  { path: ':id/editar', component: DocenteFacultadFormComponent },
];

@NgModule({
  declarations: [DocenteFacultadListComponent, DocenteFacultadFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DocenteFacultadModule {}
