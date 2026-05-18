import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../interfaces/entities';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'unt_token';
  private readonly USER_KEY = 'unt_user';

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{
        data: { access_token: string; usuario: Usuario };
      }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.data.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.usuario));
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUsuarioActual(): Usuario | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  hasRole(...roles: string[]): boolean {
    const user = this.getUsuarioActual();
    return !!user && roles.includes(user.rol);
  }

  cambiarPassword(payload: {
    password_actual: string;
    password_nueva: string;
    confirmar_password: string;
  }): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/auth/cambiar-password`,
      payload,
    );
  }
}
