import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';

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
    public configService: ConfiguracionGeneralService,
  ) {
    this.form = this.fb.group({
      email: [
        'admin@unt.edu.pe',
        [
          Validators.required,
          Validators.pattern(
            '^[a-zA-Z0-9._%+-áéíóúÁÉÍÓÚñÑ]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          ),
        ],
      ],
      password: ['Admin123!', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    this.configService.cargar();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.authService.login(email, password).subscribe({
      next: () => this.router.navigate(['/app/dashboard']),
      error: (err: any) => {
        this.error =
          err.error?.message || 'Credenciales incorrectas. Intente nuevamente.';
        this.loading = false;
      },
    });
  }
}
