import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { FacultadesPageComponent } from './facultades-page/facultades-page.component';
import { FacultadFormDialogComponent } from './dialogs/facultad-form-dialog/facultad-form-dialog.component';
import { EscuelaFormDialogComponent } from './dialogs/escuela-form-dialog/escuela-form-dialog.component';
import { DepartamentoFormDialogComponent } from './dialogs/departamento-form-dialog/departamento-form-dialog.component';

const routes: Routes = [
  { path: '', component: FacultadesPageComponent },
];

@NgModule({
  declarations: [
    FacultadesPageComponent,
    FacultadFormDialogComponent,
    EscuelaFormDialogComponent,
    DepartamentoFormDialogComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class FacultadesModule {}
