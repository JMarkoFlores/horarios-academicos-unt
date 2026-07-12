import { Component, Inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

interface ErrorConfig {
  code: string;
  titleKey: string;
  messageKey: string;
  showHelp: boolean;
}

const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  '404': { code: '404', titleKey: 'error.pageNotFound', messageKey: 'error.pageNotFoundMsg', showHelp: true },
  '403': { code: '403', titleKey: 'error.accessDenied', messageKey: 'error.accessDeniedMsg', showHelp: true },
  '500': { code: '500', titleKey: 'error.serverError', messageKey: 'error.serverErrorMsg', showHelp: false },
  '401': { code: '401', titleKey: 'error.sessionExpired', messageKey: 'error.sessionExpiredMsg', showHelp: true },
};

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent {
  errorCode = '404';
  errorTitle = '';
  errorMessage = '';
  showHelp = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
  ) {
    this.route.data.subscribe(data => {
      const code = data['errorCode'] || '404';
      this.errorCode = code;
      const config = ERROR_CONFIGS[code] || ERROR_CONFIGS['404'];
      this.errorCode = config.code;
      this.errorTitle = this.translate.instant(config.titleKey);
      this.errorMessage = this.translate.instant(config.messageKey);
      this.showHelp = config.showHelp;
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }
}
