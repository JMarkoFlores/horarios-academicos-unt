import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ParametrosCargaRoutingModule } from './parametros-carga-routing.module';
import { ParametrosCargaComponent } from './parametros-carga.component';

@NgModule({
  declarations: [ParametrosCargaComponent],
  imports: [SharedModule, ParametrosCargaRoutingModule],
})
export class ParametrosCargaModule {}
