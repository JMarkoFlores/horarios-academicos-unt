import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsignadorComponent } from './pages/asignador/asignador.component';

const routes: Routes = [
  { path: '', component: AsignadorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CargaLectivaSecretariaRoutingModule {}
