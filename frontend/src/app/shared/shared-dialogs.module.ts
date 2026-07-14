import { NgModule } from '@angular/core';
import { SharedModule } from './shared.module';
import { RegistrarUsuarioDialogComponent } from '../layout/dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';

@NgModule({
  declarations: [
    RegistrarUsuarioDialogComponent
  ],
  imports: [SharedModule],
  exports: [
    RegistrarUsuarioDialogComponent
  ],
})
export class SharedDialogsModule {}

