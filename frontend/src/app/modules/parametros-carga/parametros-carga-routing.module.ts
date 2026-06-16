import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ParametrosCargaComponent } from './parametros-carga.component';

const routes: Routes = [
  { path: '', component: ParametrosCargaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ParametrosCargaRoutingModule {}
