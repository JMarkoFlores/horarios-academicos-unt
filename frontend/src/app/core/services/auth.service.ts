import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { Usuario } from '../interfaces/entities';

@Injectable({ providedIn: 'root' })
export class AuthService {
  static readonly TOKEN_KEY = 'unt_token';
  static readonly USER_KEY = 'unt_user';
  readonly TOKEN_KEY = AuthService.TOKEN_KEY;
  readonly USER_KEY = AuthService.USER_KEY;

  private profilePhotoSubject = new BehaviorSubject<string | null>(null);
  profilePhoto$ = this.profilePhotoSubject.asObservable();
  private _translate: TranslateService | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private injector: Injector,
  ) {
    const user = this.getUsuarioActual();
    if (user) {
      const stored = localStorage.getItem(`unt_user_photo_${user.id}`);
      this.profilePhotoSubject.next(stored);
    }
  }
  
  // Lazy getter for TranslateService to avoid circular dependency
  private get translate(): TranslateService {
    if (!this._translate) {
      this._translate = this.injector.get(TranslateService);
    }
    return this._translate;
  }

  getProfilePhoto(userId: number): string | null {
    return localStorage.getItem(`unt_user_photo_${userId}`);
  }

  saveProfilePhoto(userId: number, base64: string): void {
    localStorage.setItem(`unt_user_photo_${userId}`, base64);
    const currentUser = this.getUsuarioActual();
    if (currentUser && currentUser.id === userId) {
      this.profilePhotoSubject.next(base64);
    }
  }

  deleteProfilePhoto(userId: number): void {
    localStorage.removeItem(`unt_user_photo_${userId}`);
    const currentUser = this.getUsuarioActual();
    if (currentUser && currentUser.id === userId) {
      this.profilePhotoSubject.next(null);
    }
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{
        data: { access_token: string; usuario: Usuario };
      }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.data.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.usuario));
          const storedPhoto = localStorage.getItem(
            `unt_user_photo_${res.data.usuario.id}`,
          );
          this.profilePhotoSubject.next(storedPhoto);
          
          // Set the language to user's preferred language
          const preferredLang = res.data.usuario.idiomaPreferido || 'es';
          this.translate.use(preferredLang);
          localStorage.setItem('preferredLanguage', preferredLang);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.profilePhotoSubject.next(null);
    this.router.navigate(['/']);
  }

  verificarToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 <= Date.now()) return of(false);
    } catch {
      return of(false);
    }
    return this.http.get(`${environment.apiUrl}/auth/perfil`).pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
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

  actualizarContexto(contexto: Usuario['contextoAcademico']): void {
    const user = this.getUsuarioActual();
    if (!user) return;
    const actualizado = { ...user, contextoAcademico: contexto };
    localStorage.setItem(this.USER_KEY, JSON.stringify(actualizado));
  }

  actualizarUsuarioLocal(usuario: Partial<Usuario>): void {
    const actual = this.getUsuarioActual();
    if (!actual) return;
    const merged = { ...actual, ...usuario };
    localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
  }

  cargarPerfil(): Observable<any> {
    return this.http
      .get<{ data: Usuario }>(`${environment.apiUrl}/auth/perfil`)
      .pipe(
        tap((res) => {
          const actual = this.getUsuarioActual();
          if (!actual) return;
          const merged = {
            ...actual,
            ...res.data,
            contextoAcademico: res.data.contextoAcademico,
          };
          localStorage.setItem(this.USER_KEY, JSON.stringify(merged));
        }),
      );
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
