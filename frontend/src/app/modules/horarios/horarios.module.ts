import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HorariosComponent } from './horarios.component';
import { AsignarHorarioDialogComponent } from './dialogs/asignar-horario-dialog/asignar-horario-dialog.component';

const routes: Routes = [{ path: '', component: HorariosComponent }];

@NgModule({
  declarations: [HorariosComponent, AsignarHorarioDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class HorariosModule {}
