import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { OperadorComponent } from './operador.component';
import { CeldaDialogComponent } from './celda-dialog/celda-dialog.component';

const routes: Routes = [{ path: '', component: OperadorComponent }];

@NgModule({
  declarations: [OperadorComponent, CeldaDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class OperadorModule {}
