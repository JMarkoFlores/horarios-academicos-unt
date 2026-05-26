import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutComponent } from './layout.component';
import { SharedModule } from '../shared/shared.module';
import { SharedDialogsModule } from '../shared/shared-dialogs.module';

@NgModule({
  declarations: [LayoutComponent],
  imports: [SharedModule, SharedDialogsModule, TranslateModule],
  exports: [LayoutComponent],
})
export class LayoutModule {}
