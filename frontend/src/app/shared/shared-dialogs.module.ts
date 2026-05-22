import { NgModule } from '@angular/core';
import { SharedModule } from './shared.module';
import { RegistrarUsuarioDialogComponent } from '../layout/dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';
import { CambiarPasswordDialogComponent } from '../layout/dialogs/cambiar-password-dialog/cambiar-password-dialog.component';
import { PerfilDialogComponent } from '../layout/dialogs/perfil-dialog/perfil-dialog.component';

@NgModule({
  declarations: [
    RegistrarUsuarioDialogComponent,
    CambiarPasswordDialogComponent,
    PerfilDialogComponent,
  ],
  imports: [SharedModule],
  exports: [
    RegistrarUsuarioDialogComponent,
    CambiarPasswordDialogComponent,
    PerfilDialogComponent,
  ],
})
export class SharedDialogsModule {}
