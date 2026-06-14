import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss']
})
export class LanguageSelectorComponent {
  currentLang: string;
  languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' }
  ];

  constructor(
    private translate: TranslateService,
    private api: ApiService,
    private authService: AuthService,
  ) {
    this.currentLang = this.translate.currentLang || 'es';
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    localStorage.setItem('preferredLanguage', lang);
    
    // Update the stored user with new preferred language
    const currentUser = this.authService.getUsuarioActual();
    if (currentUser) {
      currentUser.idiomaPreferido = lang;
      localStorage.setItem('unt_user', JSON.stringify(currentUser));
    }
    
    this.api.patch('/usuarios/mi-idioma', { idioma: lang }).subscribe();
  }

  getFlag(langCode: string): string {
    const lang = this.languages.find(l => l.code === langCode);
    return lang ? lang.flag : '🌐';
  }

  getLanguageName(langCode: string): string {
    const lang = this.languages.find(l => l.code === langCode);
    return lang ? lang.name : langCode;
  }
}
