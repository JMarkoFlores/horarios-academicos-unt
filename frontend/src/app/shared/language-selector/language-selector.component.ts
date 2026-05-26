import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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

  constructor(private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || 'es';
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
    // Send to backend to update user preference
    this.updateBackendLanguage(lang);
  }

  getFlag(langCode: string): string {
    const lang = this.languages.find(l => l.code === langCode);
    return lang ? lang.flag : '🌐';
  }

  getLanguageName(langCode: string): string {
    const lang = this.languages.find(l => l.code === langCode);
    return lang ? lang.name : langCode;
  }

  private updateBackendLanguage(lang: string): void {
    // TODO: Call backend endpoint to update user language preference
    // This requires the API service to be injected and the endpoint to be implemented
  }
}
