import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [LoginComponent, LandingComponent],
  imports: [
    BrowserAnimationsModule,
    SharedModule,
    TranslateModule.forChild()
  ],
  exports: [LoginComponent, LandingComponent],
})
export class AuthModule {}
