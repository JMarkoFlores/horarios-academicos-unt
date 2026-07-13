import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { HorariosComponent } from './horarios.component';
import { AsignarHorarioDialogComponent } from './dialogs/asignar-horario-dialog/asignar-horario-dialog.component';
import { MatrizHorariosComponent } from './components/matriz-horarios/matriz-horarios.component';
import { CargaLectivaComponent } from './carga-lectiva/carga-lectiva.component';
import { AsignarHorarioCargaLectivaDialogComponent } from './carga-lectiva/dialogs/asignar-horario-carga-lectiva-dialog/asignar-horario-carga-lectiva-dialog.component';
import { DiaNombrePipe } from './carga-lectiva/dia-nombre.pipe';

const routes: Routes = [
  { path: '', component: HorariosComponent },
  { path: 'carga-lectiva', component: CargaLectivaComponent },
];

@NgModule({
  declarations: [
    HorariosComponent,
    AsignarHorarioDialogComponent,
    MatrizHorariosComponent,
    CargaLectivaComponent,
    // DiaNombrePipe es standalone, no se declara aquí
    // AsignarHorarioCargaLectivaDialogComponent es standalone, no se declara aquí
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class HorariosModule {}
