import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';

const ROL_REDIRECT: Record<string, string> = {
  administradorsistema: '/app/dashboard',
  coordinadoracademico: '/app/dashboard',
  directorescuela: '/app/dashboard',
  visualizador: '/app/dashboard',
  secretaria: '/app/secretaria',
  docente: '/app/dashboard',
};

function redirectByRol(rol: string): string {
  return ROL_REDIRECT[rol] ?? '/app/dashboard';
}

function parseLoginError(err: any): string {
  if (!err || err.status === 0) {
    return 'Error de conexión con el servidor. Verifique su red e intente nuevamente.';
  }
  if (err.status === 401) {
    return 'Credenciales incorrectas. Verifique su correo y contraseña.';
  }
  if (err.status === 403) {
    const msg: string = err.error?.message ?? '';
    return msg.toLowerCase().includes('inactivo')
      ? 'Usuario inactivo. Contacte al administrador del sistema.'
      : msg || 'Acceso denegado.';
  }
  if (err.status >= 500) {
    return 'Error interno del servidor. Intente nuevamente más tarde.';
  }
  return err.error?.message ?? 'Error al iniciar sesión. Intente nuevamente.';
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notif: NotifToastService,
    public configService: ConfiguracionGeneralService,
  ) {
    this.form = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.pattern(
            '^[a-zA-Z0-9._%+-áéíóúÁÉÍÓÚñÑ]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          ),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.configService.cargar();
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getUsuarioActual();
      this.router.navigate([redirectByRol(user?.rol ?? '')]);
    }
  }

  clearError(): void {
    if (this.error) this.error = '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        const usuario = res?.data?.usuario;
        if (usuario?.debe_cambiar_password) {
          this.notif.info('Por seguridad, debe cambiar su contraseña antes de continuar.');
          this.router.navigate(['/app/perfil'], { queryParams: { tab: 'password' } });
          return;
        }
        const rol: string = usuario?.rol ?? '';
        this.router.navigate([redirectByRol(rol)]);
      },
      error: (err: any) => {
        this.error = parseLoginError(err);
        this.loading = false;
      },
    });
  }
}
