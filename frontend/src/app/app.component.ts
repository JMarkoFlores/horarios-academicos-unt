import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router, 
    private translate: TranslateService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Asegurar que el sistema inicie en modo claro
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    
    // Initialize language
    this.translate.setDefaultLang('es');
    
    // Check user's preferred language first
    const currentUser = this.authService.getUsuarioActual();
    let langToUse = 'es';
    
    if (currentUser && currentUser.idiomaPreferido) {
      langToUse = currentUser.idiomaPreferido;
    } else {
      // Fallback to localStorage or default
      const storedLang = localStorage.getItem('preferredLanguage');
      if (storedLang) {
        langToUse = storedLang;
      }
    }
    
    this.translate.use(langToUse);
  }
}
