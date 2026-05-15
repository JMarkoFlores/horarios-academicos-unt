import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { NotFoundComponent } from './shared/not-found/not-found.component';
import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { AuthModule } from './auth/auth.module';

@NgModule({
  declarations: [AppComponent, NotFoundComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    CoreModule,
    LayoutModule,
    AuthModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
