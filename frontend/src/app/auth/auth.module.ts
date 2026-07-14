import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';
import { RecuperarPasswordComponent } from './recuperar-password/recuperar-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [LoginComponent, LandingComponent, RecuperarPasswordComponent, ResetPasswordComponent],
  imports: [
    BrowserAnimationsModule,
    SharedModule,
    TranslateModule.forChild()
  ],
  exports: [LoginComponent, LandingComponent, RecuperarPasswordComponent, ResetPasswordComponent],
})
export class AuthModule {}
