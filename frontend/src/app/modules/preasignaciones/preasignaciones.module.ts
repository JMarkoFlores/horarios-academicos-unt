import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PreasignacionesListComponent } from './preasignaciones-list/preasignaciones-list.component';
import { PreasignacionFormComponent } from './preasignacion-form/preasignacion-form.component';
import { RolesGuard } from '../../core/guards/roles.guard';

const routes: Routes = [
  { path: '', component: PreasignacionesListComponent },
  { path: 'nuevo', component: PreasignacionFormComponent },
  { path: 'editar/:id', component: PreasignacionFormComponent },
];

@NgModule({
  declarations: [PreasignacionesListComponent, PreasignacionFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PreasignacionesModule {}
