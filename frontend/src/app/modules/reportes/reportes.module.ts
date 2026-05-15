import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ReportesComponent } from './reportes.component';

const routes: Routes = [{ path: '', component: ReportesComponent }];

@NgModule({
  declarations: [ReportesComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ReportesModule {}
