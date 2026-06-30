import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../core/interfaces/entities';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { BreadcrumbComponent } from '../../layout/components/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

const ROL_LABELS: Record<string, string> = {
  administradorsistema: 'Administrador del Sistema',
  directorescuela: 'Director de Escuela',
  coordinadoracademico: 'Coordinador Académico',
  secretaria: 'Secretaria',
  docente: 'Docente',
  visualizador: 'Visualizador',
};

function passwordsCoinciden(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('password_nueva')?.value;
  const confirmar = group.get('confirmar_password')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    BreadcrumbComponent,
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit, OnDestroy {
  usuario: Usuario | null = null;
  fotoUrl: string | null = null;
  firmaUrl: string | null = null;
  cargandoFirma = false;

  get firmaFullUrl(): string | null {
    if (!this.firmaUrl) return null;
    if (this.firmaUrl.startsWith('http')) return this.firmaUrl;
    return environment.apiUrl + this.firmaUrl;
  }

  selectedIndex = 0;

  passwordForm: FormGroup;
  loadingPassword = false;
  hideActual = true;
  hideNueva = true;
  hideConfirmar = true;

  perfilForm: FormGroup;
  editandoPerfil = false;
  loadingPerfil = false;

  get memberSince(): string {
    return '2025'; // simplified — could come from backend
  }

  get hasMinLength(): boolean {
    const val = this.passwordForm.get('password_nueva')?.value || '';
    return val.length >= 8;
  }

  get hasUppercase(): boolean {
    const val = this.passwordForm.get('password_nueva')?.value || '';
    return /[A-Z]/.test(val);
  }

  get hasNumber(): boolean {
    const val = this.passwordForm.get('password_nueva')?.value || '';
    return /\d/.test(val);
  }

  get passwordsMatch(): boolean {
    const nueva = this.passwordForm.get('password_nueva')?.value || '';
    const confirmar = this.passwordForm.get('confirmar_password')?.value || '';
    return nueva.length > 0 && nueva === confirmar;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private notif: NotifToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.passwordForm = this.fb.group(
      {
        password_actual: ['', Validators.required],
        password_nueva: ['', [Validators.required, Validators.minLength(8)]],
        confirmar_password: ['', Validators.required],
      },
      { validators: passwordsCoinciden },
    );

    this.perfilForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    if (this.usuario) {
      this.authService.profilePhoto$.pipe(takeUntil(this.destroy$)).subscribe(photo => {
        this.fotoUrl = photo;
      });
      if (this.usuario.docenteId) {
        this.cargarFirmaDigital();
      }
      
      // Inicializar formulario de perfil con datos del usuario
      this.perfilForm.patchValue({
        nombre: this.usuario.nombre,
        email: this.usuario.email,
      });
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab'] === 'password') {
        this.selectedIndex = this.usuario?.docenteId ? 2 : 1;
      } else {
        this.selectedIndex = 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    this.selectedIndex = index;
    const isPasswordTab = this.usuario?.docenteId ? index === 2 : index === 1;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: isPasswordTab ? { tab: 'password' } : {},
      queryParamsHandling: '',
      replaceUrl: true
    });
  }

  get iniciales(): string {
    if (!this.usuario?.nombre) return '?';
    return this.usuario.nombre
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  getRolLabel(rol?: string): string {
    return rol ? (ROL_LABELS[rol] ?? rol) : '-';
  }

  // --- FOTO DE PERFIL ---

  triggerAvatarInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file && this.usuario) {
        const reader = new FileReader();
        reader.onload = () => {
          this.ngZone.run(() => {
            const base64 = reader.result as string;
            this.fotoUrl = base64;
            this.authService.saveProfilePhoto(this.usuario!.id, base64);
            this.cdr.detectChanges();
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // --- FIRMA DIGITAL ---

  cargarFirmaDigital(): void {
    this.api.get<{data: {firma_url: string}}>('/declaraciones/firma/mi-firma')
      .subscribe({
        next: (res) => {
          if (res.data?.firma_url) {
            this.firmaUrl = res.data.firma_url;
          }
        },
        error: () => {}
      });
  }

  triggerFirmaInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        this.cargandoFirma = true;
        const formData = new FormData();
        formData.append('firma', file);

        this.api.post<{data: {firma_url: string}}>('/declaraciones/firma', formData)
          .subscribe({
            next: (res) => {
              this.cargandoFirma = false;
              if (res.data?.firma_url) {
                this.firmaUrl = res.data.firma_url;
                this.notif.success('Firma digital guardada correctamente');
                this.cdr.detectChanges();
              }
            },
            error: (err) => {
              this.cargandoFirma = false;
              const msg = Array.isArray(err.error?.message) ? err.error.message.join(', ') : (err.error?.message || 'Error al guardar firma');
              this.notif.error(msg);
              this.cdr.detectChanges();
            }
          });
      }
    };
    input.click();
  }

  // --- CAMBIO DE CONTRASEÑA ---

  cambiarPassword(): void {
    if (this.passwordForm.invalid) return;
    this.loadingPassword = true;
    const wasForced = !!this.usuario?.debe_cambiar_password;
    this.authService.cambiarPassword(this.passwordForm.value).subscribe({
      next: () => {
        this.notif.success('Contraseña cambiada exitosamente');
        this.passwordForm.reset();
        Object.keys(this.passwordForm.controls).forEach(key => {
          this.passwordForm.get(key)?.setErrors(null);
        });
        this.loadingPassword = false;

        if (wasForced) {
          this.authService.actualizarUsuarioLocal({ debe_cambiar_password: false });
          this.usuario = { ...this.usuario!, debe_cambiar_password: false };
          this.router.navigate(['/app/dashboard']);
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al cambiar contraseña';
        this.notif.error(msg);
        this.loadingPassword = false;
      },
    });
  }

  // --- EDITAR PERFIL ---

  toggleEdicionPerfil(): void {
    this.editandoPerfil = !this.editandoPerfil;
    if (!this.editandoPerfil) {
      // Cancelar edición, restaurar valores originales
      if (this.usuario) {
        this.perfilForm.patchValue({
          nombre: this.usuario.nombre,
          email: this.usuario.email,
        });
      }
    }
  }

  guardarPerfil(): void {
    if (this.perfilForm.invalid || !this.usuario) return;
    this.loadingPerfil = true;
    
    this.api.patch<{data: Usuario}>('/auth/perfil', this.perfilForm.value).subscribe({
      next: (res) => {
        this.notif.success('Perfil actualizado exitosamente');
        this.editandoPerfil = false;
        this.loadingPerfil = false;
        
        if (res.data) {
          const usuarioActual = this.authService.getUsuarioActual();
          if (usuarioActual) {
            const actualizado = { ...usuarioActual, ...res.data };
            this.authService.actualizarUsuarioLocal(actualizado);
            this.usuario = actualizado;
          }
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al actualizar perfil';
        this.notif.error(msg);
        this.loadingPerfil = false;
      },
    });
  }

  cancelarEdicionPerfil(): void {
    this.editandoPerfil = false;
    if (this.usuario) {
      this.perfilForm.patchValue({
        nombre: this.usuario.nombre,
        email: this.usuario.email,
      });
    }
  }
}