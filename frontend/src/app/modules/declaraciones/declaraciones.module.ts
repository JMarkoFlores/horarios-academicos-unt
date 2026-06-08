import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { DeclaracionesComponent } from './declaraciones.component';
import { VerificarDeclaracionComponent } from './verificar-declaracion/verificar-declaracion.component';
import { VerificarFirmaComponent } from './verificar-firma/verificar-firma.component';
import { VerificarAprobacionComponent } from './verificar-aprobacion/verificar-aprobacion.component';

const routes: Routes = [
  { path: '', component: DeclaracionesComponent },
  { path: 'verificar/:id', component: VerificarDeclaracionComponent },
  { path: 'verificar-firma/:id', component: VerificarFirmaComponent },
  {
    path: 'verificar-aprobacion/:id',
    component: VerificarAprobacionComponent,
  },
];

@NgModule({
  declarations: [
    DeclaracionesComponent,
    VerificarDeclaracionComponent,
    VerificarFirmaComponent,
    VerificarAprobacionComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ],
})
export class DeclaracionesModule {}
