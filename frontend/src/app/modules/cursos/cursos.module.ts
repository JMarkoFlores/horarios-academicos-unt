import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CursosListComponent } from './cursos-list/cursos-list.component';
import { CursoFormComponent } from './curso-form/curso-form.component';
import { AsignarAmbientesDialogComponent } from './dialogs/asignar-ambientes-dialog/asignar-ambientes-dialog.component';
import { GestionarGruposDialogComponent } from './dialogs/gestionar-grupos-dialog/gestionar-grupos-dialog.component';

const routes: Routes = [
  { path: '', component: CursosListComponent },
  { path: 'nuevo', component: CursoFormComponent },
  { path: ':id/editar', component: CursoFormComponent },
];

@NgModule({
  declarations: [
    CursosListComponent,
    CursoFormComponent,
    AsignarAmbientesDialogComponent,
    GestionarGruposDialogComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CursosModule {}
