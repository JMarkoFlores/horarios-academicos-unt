import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutComponent } from './layout.component';
import { SharedModule } from '../shared/shared.module';
import { SharedDialogsModule } from '../shared/shared-dialogs.module';
import { ChatbotModule } from '../modules/chatbot/chatbot.module';

@NgModule({
  declarations: [LayoutComponent],
  imports: [
    BrowserAnimationsModule,
    SharedModule,
    SharedDialogsModule,
    ChatbotModule,
    TranslateModule.forChild()
  ],
  exports: [LayoutComponent],
})
export class LayoutModule {}
