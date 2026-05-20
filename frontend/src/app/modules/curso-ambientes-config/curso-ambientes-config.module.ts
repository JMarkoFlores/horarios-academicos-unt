import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CursoAmbientesListComponent } from './curso-ambientes-list/curso-ambientes-list.component';

const routes: Routes = [
  { path: '', component: CursoAmbientesListComponent },
];

@NgModule({
  declarations: [CursoAmbientesListComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CursoAmbientesConfigModule {}
