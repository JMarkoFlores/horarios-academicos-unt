import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from '../../shared/shared.module';
import { DeclaracionesComponent } from './declaraciones.component';
import { VerificarDeclaracionComponent } from './verificar-declaracion/verificar-declaracion.component';
import { VerificarFirmaComponent } from './verificar-firma/verificar-firma.component';
import { VerificarAprobacionComponent } from './verificar-aprobacion/verificar-aprobacion.component';
import { AprobacionFacultadComponent } from './aprobacion-facultad/aprobacion-facultad.component';
import { HorarioGraficoPanelComponent } from './horario-grafico-panel/horario-grafico-panel.component';

const routes: Routes = [
  { path: '', component: DeclaracionesComponent },
  { path: 'verificar/:id', component: VerificarDeclaracionComponent },
  { path: 'verificar-firma/:id', component: VerificarFirmaComponent },
  {
    path: 'verificar-aprobacion/:id',
    component: VerificarAprobacionComponent,
  },
  {
    path: 'aprobacion-facultad',
    component: AprobacionFacultadComponent,
  },
];

@NgModule({
  declarations: [
    DeclaracionesComponent,
    VerificarDeclaracionComponent,
    VerificarFirmaComponent,
    VerificarAprobacionComponent,
    AprobacionFacultadComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    DragDropModule,
    HorarioGraficoPanelComponent,
    RouterModule.forChild(routes),
  ],
})
export class DeclaracionesModule {}
