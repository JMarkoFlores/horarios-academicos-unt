import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DocenteCursosListComponent } from './docente-cursos-list/docente-cursos-list.component';

const routes: Routes = [
  { path: '', component: DocenteCursosListComponent },
];

@NgModule({
  declarations: [DocenteCursosListComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DocenteCursosConfigModule {}
