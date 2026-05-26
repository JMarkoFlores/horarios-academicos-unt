import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const acceptLanguage = request.headers['accept-language'] as string;
    
    if (acceptLanguage) {
      // Extract the language code (e.g., 'en-US' -> 'en', 'es-ES' -> 'es')
      const language = acceptLanguage.split('-')[0].toLowerCase();
      
      // Validate that it's a supported language
      const supportedLanguages = ['es', 'en', 'pt'];
      if (supportedLanguages.includes(language)) {
        // Store language in request for use in controllers/services
        (request as any).language = language;
      } else {
        // Default to Spanish if language is not supported
        (request as any).language = 'es';
      }
    } else {
      // Default to Spanish if no header is provided
      (request as any).language = 'es';
    }

    return next.handle();
  }
}
