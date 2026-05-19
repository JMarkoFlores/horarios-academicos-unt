import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { OperadorComponent } from './operador.component';
import { CeldaDialogComponent } from './celda-dialog/celda-dialog.component';
import { ColaAtencionComponent } from './cola-atencion/cola-atencion.component';
import { GrillaHorariosComponent } from './grilla-horarios/grilla-horarios.component';

const routes: Routes = [{ path: '', component: OperadorComponent }];

@NgModule({
  declarations: [OperadorComponent, CeldaDialogComponent, ColaAtencionComponent, GrillaHorariosComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class OperadorModule {}
