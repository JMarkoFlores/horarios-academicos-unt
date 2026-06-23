import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CladService } from '../../../core/services/clad.service';
import { DeclaracionClad, EstadoClad } from '../../../core/interfaces/clad.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ROLES } from '../../../core/constants/roles';
import { NotifToastService } from '../../../core/services/notif-toast.service';

@Component({
  selector: 'app-clad-verificacion',
  templateUrl: './clad-verificacion.component.html',
  styleUrls: ['./clad-verificacion.component.scss']
})
export class CladVerificacionComponent implements OnInit {
  clad?: DeclaracionClad;
  motivoObservacion = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cladService: CladService,
    private authService: AuthService,
    private notif: NotifToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.cargarClad(id);
    }
  }

  cargarClad(id: number): void {
    this.cladService.findOne(id).subscribe({
      next: (data) => this.clad = data,
      error: () => {
        this.notif.error('CLAD no encontrado');
        this.router.navigate(['/app/clad']);
      }
    });
  }

  getEstadoClass(estado: EstadoClad): string {
    switch (estado) {
      case EstadoClad.BORRADOR: return 'borrador';
      case EstadoClad.ENVIADO_DPTO: return 'enviado';
      case EstadoClad.OBSERVADO_DPTO: 
      case EstadoClad.OBSERVADO_DEPENDENCIA: return 'observado';
      case EstadoClad.VALIDADO_DPTO:
      case EstadoClad.VALIDADO_DEPENDENCIA: return 'validado';
      case EstadoClad.APROBADO_FINAL: return 'aprobado';
      default: return '';
    }
  }

  canEnviar(): boolean {
    if (!this.clad) return false;
    return this.authService.hasRole(ROLES.DOCENTE) && 
           [EstadoClad.BORRADOR, EstadoClad.OBSERVADO_DPTO, EstadoClad.OBSERVADO_DEPENDENCIA].includes(this.clad.estado);
  }

  canValidarDpto(): boolean {
    if (!this.clad) return false;
    return (this.authService.hasRole(ROLES.DIRECTOR_DEPARTAMENTO) || this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA)) && 
           this.clad.estado === EstadoClad.ENVIADO_DPTO;
  }

  canValidarDependencia(): boolean {
    if (!this.clad) return false;
    return (this.authService.hasRole(ROLES.COORDINADOR_ACADEMICO) || this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA)) && 
           this.clad.estado === EstadoClad.VALIDADO_DPTO;
  }

  canAprobarFinal(): boolean {
    if (!this.clad) return false;
    return (this.authService.hasRole(ROLES.DECANO) || this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA)) && 
           this.clad.estado === EstadoClad.VALIDADO_DEPENDENCIA;
  }

  canObservar(): boolean {
    return this.canValidarDpto() || this.canValidarDependencia() || this.canAprobarFinal();
  }

  enviar(): void {
    this.cladService.enviar(this.clad!.id).subscribe({
      next: () => {
        this.notif.success('Enviado a Departamento');
        this.cargarClad(this.clad!.id);
      },
      error: (e) => this.notif.error(e.error?.message || 'Error')
    });
  }

  validarDpto(): void {
    this.cladService.validarDpto(this.clad!.id).subscribe({
      next: () => {
        this.notif.success('Validado por Departamento');
        this.cargarClad(this.clad!.id);
      },
      error: (e) => this.notif.error(e.error?.message || 'Error')
    });
  }

  validarDependencia(): void {
    this.cladService.validarDependencia(this.clad!.id).subscribe({
      next: () => {
        this.notif.success('Validado por Dependencia');
        this.cargarClad(this.clad!.id);
      },
      error: (e) => this.notif.error(e.error?.message || 'Error')
    });
  }

  aprobarFinal(): void {
    this.cladService.aprobarFinal(this.clad!.id).subscribe({
      next: () => {
        this.notif.success('Aprobado por Decanato');
        this.cargarClad(this.clad!.id);
      },
      error: (e) => this.notif.error(e.error?.message || 'Error')
    });
  }

  observar(): void {
    if (this.clad!.estado === EstadoClad.ENVIADO_DPTO) {
      this.cladService.observarDpto(this.clad!.id, { motivo_observacion: this.motivoObservacion }).subscribe({
        next: () => { this.notif.success('Observado a Docente'); this.cargarClad(this.clad!.id); },
        error: (e) => this.notif.error(e.error?.message || 'Error')
      });
    } else if (this.clad!.estado === EstadoClad.VALIDADO_DPTO) {
      this.cladService.observarDependencia(this.clad!.id, { motivo_observacion: this.motivoObservacion }).subscribe({
        next: () => { this.notif.success('Observado a Docente'); this.cargarClad(this.clad!.id); },
        error: (e) => this.notif.error(e.error?.message || 'Error')
      });
    }
  }
}
