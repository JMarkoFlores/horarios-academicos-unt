import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HorariosComponent } from './horarios.component';
import { AsignarHorarioDialogComponent } from './dialogs/asignar-horario-dialog/asignar-horario-dialog.component';
import { MatrizHorariosComponent } from './components/matriz-horarios/matriz-horarios.component';

const routes: Routes = [{ path: '', component: HorariosComponent }];

@NgModule({
  declarations: [HorariosComponent, AsignarHorarioDialogComponent, MatrizHorariosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class HorariosModule {}
