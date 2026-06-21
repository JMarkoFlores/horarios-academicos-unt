import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RolesGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const roles: string[] = route.data['roles'] ?? [];
    return this.authService.verificarToken().pipe(
      map((valido) => {
        if (!valido) return this.router.parseUrl('/');
        if (roles.length === 0 || this.authService.hasRole(...roles)) return true;
        return this.router.parseUrl('/app/dashboard');
      }),
    );
  }
}
