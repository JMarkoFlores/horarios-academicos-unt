import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CladListComponent } from './clad-list/clad-list.component';
import { CladFormComponent } from './clad-form/clad-form.component';
import { CladVerificacionComponent } from './clad-verificacion/clad-verificacion.component';

const routes: Routes = [
  { path: '', component: CladListComponent },
  { path: 'nuevo', component: CladFormComponent },
  { path: 'editar/:id', component: CladFormComponent },
  { path: 'verificar/:id', component: CladVerificacionComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CladRoutingModule { }
