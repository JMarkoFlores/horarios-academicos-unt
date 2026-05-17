import { NgModule } from '@angular/core';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [LoginComponent, LandingComponent],
  imports: [SharedModule],
  exports: [LoginComponent, LandingComponent],
})
export class AuthModule {}
