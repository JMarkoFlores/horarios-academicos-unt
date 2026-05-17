import { NgModule } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SharedModule } from '../../shared/shared.module';
import { SharedDialogsModule } from '../../shared/shared-dialogs.module';
import { UsuariosRoutingModule } from './usuarios-routing.module';
import { UsuariosListComponent } from './usuarios-list/usuarios-list.component';
import { EditarUsuarioDialogComponent } from './dialogs/editar-usuario-dialog/editar-usuario-dialog.component';

@NgModule({
  declarations: [UsuariosListComponent, EditarUsuarioDialogComponent],
  imports: [
    SharedModule,
    MatSlideToggleModule,
    SharedDialogsModule,
    UsuariosRoutingModule,
  ],
})
export class UsuariosModule {}
