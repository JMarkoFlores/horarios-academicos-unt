import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ConfiguracionComponent } from './configuracion.component';

const routes: Routes = [
  { path: '', component: ConfiguracionComponent },
];

@NgModule({
  declarations: [ConfiguracionComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ConfiguracionModule {}
