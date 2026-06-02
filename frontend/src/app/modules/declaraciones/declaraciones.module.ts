import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { DeclaracionesComponent } from './declaraciones.component';
import { VerificarDeclaracionComponent } from './verificar-declaracion/verificar-declaracion.component';

const routes: Routes = [
  { path: '', component: DeclaracionesComponent },
  { path: 'verificar/:id', component: VerificarDeclaracionComponent },
];

@NgModule({
  declarations: [DeclaracionesComponent, VerificarDeclaracionComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ],
})
export class DeclaracionesModule {}
