import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AnalyticsComponent } from './analytics.component';
import { SharedModule } from '../../shared/shared.module';
import { NgChartsModule } from 'ng2-charts';

const routes: Routes = [
  { path: '', component: AnalyticsComponent }
];

@NgModule({
  declarations: [AnalyticsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule,
    NgChartsModule
  ]
})
export class AnalyticsModule { }
