import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CeldaDialogComponent } from './celda-dialog/celda-dialog.component';
import { ColaAtencionComponent } from './cola-atencion/cola-atencion.component';
import { GrillaHorariosComponent } from './grilla-horarios/grilla-horarios.component';
import { VentanaListComponent } from './ventana-list/ventana-list.component';
import { VentanaDetalleComponent } from './ventana-detalle/ventana-detalle.component';

const routes: Routes = [
  { path: '', redirectTo: 'ventanas', pathMatch: 'full' },
  { path: 'ventanas', component: VentanaListComponent },
  { path: 'ventanas/:id', component: VentanaDetalleComponent }
];

@NgModule({
  declarations: [CeldaDialogComponent, ColaAtencionComponent, GrillaHorariosComponent, VentanaListComponent, VentanaDetalleComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class OperadorModule {}
