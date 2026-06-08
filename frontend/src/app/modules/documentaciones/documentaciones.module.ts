import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DocumentacionesListComponent } from './documentaciones-list/documentaciones-list.component';
import { DocumentacionDetalleComponent } from './documentacion-detalle/documentacion-detalle.component';

const routes: Routes = [
  { path: '', component: DocumentacionesListComponent },
  { path: ':id', component: DocumentacionDetalleComponent },
];

@NgModule({
  declarations: [DocumentacionesListComponent, DocumentacionDetalleComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DocumentacionesModule {}
