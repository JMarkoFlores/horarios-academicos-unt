import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AsignacionesComponent } from './asignaciones.component';

import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  { path: '', component: AsignacionesComponent }
];

@NgModule({
  declarations: [AsignacionesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class AsignacionesModule { }
