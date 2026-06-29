import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { OfertaAcademicaListComponent } from './oferta-academica-list/oferta-academica-list.component';

const routes: Routes = [
  { path: '', component: OfertaAcademicaListComponent },
];

@NgModule({
  declarations: [OfertaAcademicaListComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class OfertaAcademicaModule {}
