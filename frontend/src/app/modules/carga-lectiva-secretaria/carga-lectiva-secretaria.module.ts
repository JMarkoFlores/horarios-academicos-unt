import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CargaLectivaSecretariaRoutingModule } from './carga-lectiva-secretaria.routes';
import { AsignadorComponent } from './pages/asignador/asignador.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    TranslateModule.forChild(),
    CargaLectivaSecretariaRoutingModule,
    AsignadorComponent,
  ],
})
export class CargaLectivaSecretariaModule {}
