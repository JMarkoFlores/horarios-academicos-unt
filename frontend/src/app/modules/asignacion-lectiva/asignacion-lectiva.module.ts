import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AsignacionLectivaComponent } from './asignacion-lectiva.component';
import { AsignarDocenteDialogComponent } from './dialogs/asignar-docente-dialog/asignar-docente-dialog.component';

const routes: Routes = [
  { path: '', component: AsignacionLectivaComponent },
];

@NgModule({
  declarations: [
    AsignacionLectivaComponent,
    AsignarDocenteDialogComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AsignacionLectivaModule {}
