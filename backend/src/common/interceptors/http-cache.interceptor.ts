import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { CacheKeyRegistry } from '../cache/cache-key-registry';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    if (!request || request.method !== 'GET') {
      return undefined;
    }

    const originalUrl = request.originalUrl ?? request.url;
    const key = `http_cache:GET:${originalUrl}`;
    CacheKeyRegistry.remember(key);
    return key;
  }
}
