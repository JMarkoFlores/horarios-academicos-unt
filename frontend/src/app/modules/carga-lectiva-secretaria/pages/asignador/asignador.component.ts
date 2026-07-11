import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PeriodoService } from '../../../../core/services/periodo.service';
import { PeriodoAcademico } from '../../../../core/interfaces/entities';
import { BancoCursosComponent } from '../../components/banco-cursos/banco-cursos.component';
import { GrillaAsignacionComponent } from '../../components/grilla-asignacion/grilla-asignacion.component';
import { PanelAmbientesComponent } from '../../components/panel-ambientes/panel-ambientes.component';
import { BarraProgresoComponent } from '../../components/barra-progreso/barra-progreso.component';
import { IndicadorCargaComponent } from '../../components/indicador-carga/indicador-carga.component';
import { MiniFormularioComponent } from '../../components/mini-formulario/mini-formulario.component';
import { AsignadorService } from '../../services/asignador.service';
import { ValidadorFrontService } from '../../services/validador-front.service';
import {
  CursoPendiente, DocenteAsignador, AmbienteDisponible,
  BloqueHorario, MiniFormularioData, GrupoInfo,
} from '../../models/asignador.models';

@Component({
  selector: 'app-asignador',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatTooltipModule, MatSnackBarModule, MatProgressSpinnerModule,
    BancoCursosComponent, GrillaAsignacionComponent, PanelAmbientesComponent,
    BarraProgresoComponent, IndicadorCargaComponent, MiniFormularioComponent,
  ],
  template: `
    <div class="asignador">
      <header class="asignador__hero">
        <div class="asignador__hero-content">
          <mat-icon class="asignador__hero-icon">assignment_ind</mat-icon>
          <div>
            <h1 class="asignador__title">{{ 'asignador.title' | translate }}</h1>
            <p class="asignador__subtitle">{{ 'asignador.subtitle' | translate }}</p>
          </div>
        </div>
        <div class="asignador__hero-actions">
          <button mat-stroked-button (click)="cargarDatos()" [disabled]="svc.cargando()">
            <mat-icon>refresh</mat-icon> Actualizar
          </button>
          <button mat-flat-button color="primary" [disabled]="svc.cargando()" (click)="guardarTodo()">
            <mat-icon>save</mat-icon> Guardar
          </button>
        </div>
      </header>

      <div class="asignador__toolbar">
        <app-barra-progreso [progreso]="svc.progreso()"></app-barra-progreso>
      </div>

      <div class="asignador__main">
        <aside class="asignador__left">
          <app-banco-cursos
            [cursos]="svc.cursosPendientes()"
            [cursoArrastrando]="svc.cursoArrastrando()"
            (arrastreIniciado)="onArrastreIniciado($event)"
            (arrastreFinalizado)="onArrastreFinalizado()">
          </app-banco-cursos>
        </aside>

        <main class="asignador__center">
          <div class="asignador__docente-select">
            <mat-form-field appearance="outline" class="asignador__docente-field">
              <mat-label>Seleccionar Docente</mat-label>
              <mat-select [(ngModel)]="docenteSeleccionadoId" (selectionChange)="onDocenteChange()">
                @for (d of svc.docentes(); track d.id) {
                  <mat-option [value]="d.id">
                    {{ d.apellido }}, {{ d.nombre }} — {{ d.horasLectivasAsignadas }}/{{ d.horasLectivasMax }}h
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (docenteActual) {
              <app-indicador-carga [docente]="docenteActual"></app-indicador-carga>
            }
          </div>

          <div class="asignador__grid-area">
            <app-grilla-asignacion
              [bloquesExistentes]="svc.bloquesDocente()"
              [readonly]="grillaReadonly"
              [cursoArrastrando]="svc.cursoArrastrando()"
              (celdaSeleccionada)="onCeldaSeleccionada($event)"
              (bloqueEliminado)="onBloqueEliminado($event)"
              (bloqueSoltado)="onBloqueSoltado($event)">
            </app-grilla-asignacion>
          </div>
        </main>

        <aside class="asignador__right">
          <app-panel-ambientes
            [ambientes]="svc.ambientes()"
            [ambienteSeleccionadoId]="ambienteSeleccionadoId"
            (seleccionar)="onAmbienteSeleccionado($event)">
          </app-panel-ambientes>
        </aside>
      </div>

      <app-mini-formulario
        [visible]="svc.formularioVisible()"
        [data]="svc.formularioData()"
        [ambientes]="svc.ambientes()"
        (confirmar)="onFormConfirmar($event)"
        (cancelar)="svc.cerrarFormulario()">
      </app-mini-formulario>

      @if (svc.cargando()) {
        <div class="asignador__loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      }
    </div>
  `,
  styles: [`
    .asignador { display: flex; flex-direction: column; min-height: 100%; position: relative; }

    .asignador__hero {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border-bottom: 1px solid #c7d2fe;
    }
    .asignador__hero-content { display: flex; align-items: center; gap: 12px; }
    .asignador__hero-icon { font-size: 36px; width: 36px; height: 36px; color: #4f46e5; }
    .asignador__title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
    .asignador__subtitle { font-size: 12px; color: #64748b; margin: 2px 0 0; }
    .asignador__hero-actions { display: flex; gap: 8px; }

    .asignador__toolbar { padding: 12px 24px; }

    .asignador__main {
      display: grid; grid-template-columns: 300px 1fr 260px;
      gap: 0; flex: 1; min-height: 0;
    }
    .asignador__left, .asignador__right {
      border-right: 1px solid var(--color-border, #e2e8f0);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .asignador__right { border-right: none; border-left: 1px solid var(--color-border, #e2e8f0); }
    .asignador__center { display: flex; flex-direction: column; padding: 12px 16px; overflow: auto; }

    .asignador__docente-select {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
    }
    .asignador__docente-field { flex: 1; max-width: 400px; }
    .asignador__grid-area { flex: 1; min-height: 0; }

    .asignador__loading {
      position: fixed; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 999;
    }

    @media (max-width: 1200px) {
      .asignador__main { grid-template-columns: 1fr; }
      .asignador__left, .asignador__right { border: none; max-height: 300px; }
    }
  `],
})
export class AsignadorComponent implements OnInit, OnDestroy {
  docenteSeleccionadoId: number | null = null;
  ambienteSeleccionadoId: number | null = null;
  grillaReadonly = false;

  private destroy$ = new Subject<void>();

  constructor(
    public svc: AsignadorService,
    private validador: ValidadorFrontService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.periodoService.periodo$.pipe(takeUntil(this.destroy$)).subscribe(codigo => {
      if (codigo) {
        const periodos = this.periodoService.periodos;
        const activo = periodos.find((p: PeriodoAcademico) => p.codigo === codigo);
        if (activo) {
          this.svc.cargarDatos(activo.id, codigo);
        }
      }
    });

    this.svc.refresh$observable.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const periodos = this.periodoService.periodos;
      const codigo = this.periodoService.periodo;
      const activo = periodos.find((p: PeriodoAcademico) => p.codigo === codigo);
      if (activo) {
        this.svc.cargarDatos(activo.id, codigo);
        if (this.docenteSeleccionadoId) {
          const doc = this.svc.docentes().find(d => d.id === this.docenteSeleccionadoId);
          if (doc) this.svc.seleccionarDocente(doc, codigo);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get docenteActual(): DocenteAsignador | null {
    return this.svc.docenteSeleccionado();
  }

  cargarDatos(): void {
    const periodos = this.periodoService.periodos;
    const codigo = this.periodoService.periodo;
    const activo = periodos.find((p: PeriodoAcademico) => p.codigo === codigo);
    if (activo) {
      this.svc.cargarDatos(activo.id, codigo);
    }
  }

  onDocenteChange(): void {
    if (!this.docenteSeleccionadoId) return;
    const doc = this.svc.docentes().find((d: DocenteAsignador) => d.id === this.docenteSeleccionadoId);
    if (doc) {
      const codigo = this.periodoService.periodo;
      this.svc.seleccionarDocente(doc, codigo);
      this.grillaReadonly = false;
    }
  }

  onAmbienteSeleccionado(amb: AmbienteDisponible): void {
    this.ambienteSeleccionadoId = amb.id;
  }

  onArrastreIniciado(event: { curso: CursoPendiente; tipoClase: string }): void {
    this.svc.iniciarArrastre(event.curso, event.tipoClase);
  }

  onArrastreFinalizado(): void {
    this.svc.finalizarArrastre();
  }

  onCeldaSeleccionada(event: { dia: number; hora: number }): void {
    const curso = this.svc.cursoArrastrando();
    const docente = this.svc.docenteSeleccionado();
    if (!curso || !docente) return;

    const tipoClase = this.svc.tipoClaseArrastrando();
    const horaFin = this.calcularHoraFin(event.hora, tipoClase, curso);

    const data: MiniFormularioData = {
      curso,
      dia: event.dia,
      horaInicio: `${String(event.hora).padStart(2, '0')}:00`,
      horaFin,
      docente,
      tipoClase,
      grupos: curso.grupos.filter((g: GrupoInfo) => g.tipo === tipoClase || g.tipo === 'TEORIA'),
      ambientes: this.svc.ambientes(),
    };
    this.svc.abrirFormulario(data);
    this.svc.finalizarArrastre();
  }

  onBloqueSoltado(event: { dia: number; hora: number; data: any }): void {
    const curso = event.data?.curso || this.svc.cursoArrastrando();
    const tipoClase = event.data?.tipoClase || this.svc.tipoClaseArrastrando();
    const docente = this.svc.docenteSeleccionado();
    if (!curso || !docente || !tipoClase) return;

    const horaFin = this.calcularHoraFin(event.hora, tipoClase, curso);

    const data: MiniFormularioData = {
      curso,
      dia: event.dia,
      horaInicio: `${String(event.hora).padStart(2, '0')}:00`,
      horaFin,
      docente,
      tipoClase,
      grupos: curso.grupos.filter((g: GrupoInfo) => g.tipo === tipoClase || g.tipo === 'TEORIA'),
      ambientes: this.svc.ambientes(),
    };
    this.svc.abrirFormulario(data);
    this.svc.finalizarArrastre();
  }

  onBloqueEliminado(blk: BloqueHorario): void {
    if (!blk.id || blk.id.startsWith('temp_')) return;
    const horarioId = parseInt(blk.id.replace('h_', ''), 10);
    if (isNaN(horarioId)) return;

    this.svc.eliminarBloque(horarioId, blk).then(ok => {
      if (ok) {
        this.snackBar.open('Bloque eliminado', 'Deshacer', { duration: 4000 });
      } else {
        this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 });
      }
    });
  }

  async onFormConfirmar(datos: any): Promise<void> {
    const codigo = this.periodoService.periodo;
    datos.periodo = codigo;

    const ok = await this.svc.asignarBloque(datos);
    this.svc.cerrarFormulario();

    if (ok) {
      this.snackBar.open('Asignación exitosa', 'OK', { duration: 3000, panelClass: 'snackbar-success' });
    } else {
      this.snackBar.open('Error en la asignación', 'Cerrar', { duration: 4000, panelClass: 'snackbar-error' });
    }
  }

  guardarTodo(): void {
    this.snackBar.open('Borrador guardado', 'OK', { duration: 2000 });
  }

  private calcularHoraFin(horaInicio: number, tipoClase: string, curso: CursoPendiente): string {
    let horas = 1;
    switch (tipoClase) {
      case 'TEORIA': horas = 2; break;
      case 'PRACTICA': horas = 2; break;
      case 'LABORATORIO': horas = 3; break;
    }
    const fin = horaInicio + horas;
    return `${String(Math.min(fin, 22)).padStart(2, '0')}:00`;
  }
}
