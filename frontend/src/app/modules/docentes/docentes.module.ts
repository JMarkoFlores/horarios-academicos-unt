import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DocentesListComponent } from './docentes-list/docentes-list.component';
import { DocenteFormComponent } from './docente-form/docente-form.component';
import { DetalleDocenteComponent } from './detalle-docente/detalle-docente.component';
import { VerHorarioDocenteDialogComponent } from './dialogs/ver-horario-docente-dialog/ver-horario-docente-dialog.component';
import { DetalleDocenteDialogComponent } from './dialogs/detalle-docente-dialog/detalle-docente-dialog.component';

const routes: Routes = [
  { path: '', component: DocentesListComponent },
  { path: 'nuevo', component: DocenteFormComponent },
  { path: ':id/editar', component: DocenteFormComponent },
  { path: ':id', component: DetalleDocenteComponent },
];

@NgModule({
  declarations: [
    DocentesListComponent,
    DocenteFormComponent,
    DetalleDocenteComponent,
    VerHorarioDocenteDialogComponent,
    DetalleDocenteDialogComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class DocentesModule {}
