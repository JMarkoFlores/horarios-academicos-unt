import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CampaignsListComponent } from './campaigns-list/campaigns-list.component';
import { CampaignFormComponent } from './campaign-form/campaign-form.component';

const routes: Routes = [
  { path: '', component: CampaignsListComponent },
  { path: 'nuevo', component: CampaignFormComponent },
  { path: ':id/editar', component: CampaignFormComponent },
];

@NgModule({
  declarations: [CampaignsListComponent, CampaignFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CampaignsModule {}
