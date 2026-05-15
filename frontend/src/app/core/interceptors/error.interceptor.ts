import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router, private snackBar: MatSnackBar) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          localStorage.removeItem('unt_token');
          localStorage.removeItem('unt_user');
          this.router.navigate(['/login']);
        }
        const msg =
          error.error?.message || error.message || 'Error de conexión con el servidor';
        if (error.status !== 401) {
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
        }
        return throwError(() => error);
      }),
    );
  }
}
