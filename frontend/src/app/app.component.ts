import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private themeService = inject(ThemeService);

  constructor(
    private router: Router,
    private translate: TranslateService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
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
