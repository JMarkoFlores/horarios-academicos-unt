import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuditoriaListComponent } from './auditoria-list/auditoria-list.component';
import { RolesGuard } from '../../core/guards/roles.guard';

const routes: Routes = [
  { path: '', component: AuditoriaListComponent },
];

@NgModule({
  declarations: [AuditoriaListComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AuditoriaModule {}
