import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PlanEstudiosListComponent } from './plan-estudios-list/plan-estudios-list.component';
import { PlanEstudiosDetailComponent } from './plan-estudios-detail/plan-estudios-detail.component';
import { PlanFormDialogComponent } from './dialogs/plan-form-dialog/plan-form-dialog.component';
import { CursoPlanDialogComponent } from './dialogs/curso-plan-dialog/curso-plan-dialog.component';

const routes: Routes = [
  { path: '', component: PlanEstudiosListComponent },
  { path: ':id', component: PlanEstudiosDetailComponent },
];

@NgModule({
  declarations: [
    PlanEstudiosListComponent,
    PlanEstudiosDetailComponent,
    PlanFormDialogComponent,
    CursoPlanDialogComponent,
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class PlanEstudiosModule {}
