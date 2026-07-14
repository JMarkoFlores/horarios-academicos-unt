import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  success = false;
  token = '';
  tokenInvalid = false;
  hidePassword = true;
  hideConfirmPassword = true;

  protected themeService = inject(ThemeService);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notif: NotifToastService,
    public configService: ConfiguracionGeneralService,
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.configService.cargar();
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenInvalid = true;
      this.error = 'login.invalidToken';
    }
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      if (confirmPassword?.hasError('passwordMismatch')) {
        const errors = { ...confirmPassword.errors };
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

  clearError(): void {
    if (this.error) this.error = '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Show validation errors via toast
      if (this.form.get('password')?.hasError('minlength')) {
        this.notif.error('La contraseña debe tener al menos 8 caracteres');
      } else if (this.form.get('confirmPassword')?.hasError('passwordMismatch')) {
        this.notif.error('Las contraseñas no coinciden');
      } else if (this.form.get('password')?.hasError('required')) {
        this.notif.error('La contraseña es obligatoria');
      }
      return;
    }
    if (this.loading) return;
    if (!this.token) {
      this.error = 'login.invalidToken';
      this.notif.error('Token inválido o faltante');
      return;
    }
    this.loading = true;
    this.error = '';
    const { password, confirmPassword } = this.form.value;
    this.authService.resetPassword(this.token, password, confirmPassword).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
        this.notif.success('Contraseña restablecida exitosamente');
        // Redirect to login after short delay
        setTimeout(() => this.volverAlLogin(), 1500);
      },
      error: (err: any) => {
        this.error = this.parseError(err);
        this.loading = false;
        this.notif.error(this.error);
      },
    });
  }

  private parseError(err: any): string {
    if (!err || err.status === 0) {
      return 'login.connectionError';
    }
    if (err.status === 400) {
      const msg = err.error?.message?.toLowerCase() || '';
      if (msg.includes('expirado') || msg.includes('expired') || msg.includes('inválido') || msg.includes('invalid')) {
        this.tokenInvalid = true;
        return 'login.invalidToken';
      }
      return 'login.passwordsMustMatch';
    }
    if (err.status >= 500) {
      return 'login.serverError';
    }
    return err.error?.message ?? 'login.genericError';
  }

  volverAlLogin(): void {
    this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
  }

  solicitarNuevoEnlace(): void {
    this.router.navigate(['/auth/recuperar-password']);
  }
}