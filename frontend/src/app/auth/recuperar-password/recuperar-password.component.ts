import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.scss'],
})
export class RecuperarPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  success = false;

  protected themeService = inject(ThemeService);

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
    });
  }

  ngOnInit(): void {
    this.configService.cargar();
  }

  clearError(): void {
    if (this.error) this.error = '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('email')?.hasError('required')) {
        this.notif.error('El correo es obligatorio');
      } else if (this.form.get('email')?.hasError('pattern')) {
        this.notif.error('Formato de correo inválido');
      }
      return;
    }
    if (this.loading) return;
    this.loading = true;
    this.error = '';

    const email = this.form.value.email;
    this.authService.recuperarPassword(email).subscribe({
      next: () => {
        this.success = true;
        this.loading = false;
        this.notif.success('Si el correo existe, recibirás un enlace de recuperación');
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al solicitar recuperación. Intente nuevamente.';
        this.loading = false;
        this.notif.error(this.error);
      },
    });
  }

  volverAlLogin(): void {
    this.router.navigate(['/login']);
  }
}