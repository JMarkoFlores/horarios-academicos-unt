import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

@Component({
  selector: 'app-formato-dos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './formato-dos.component.html',
  styleUrls: ['./formato-dos.component.scss'],
})
export class FormatoDosComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  docente?: Docente;
  semestre?: Semestre;
  loadingDocente = true;
  loadingSemestre = true;

  readonly sedeControl = new FormControl<'central' | 'desconcentrada'>('central', {
    nonNullable: true,
  });
  readonly aceptaControl = new FormControl(false, { nonNullable: true });

  constructor(
    private readonly cargaHorariaService: CargaHorariaService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargaHorariaService
      .getDocenteActual()
      .pipe(finalize(() => (this.loadingDocente = false)))
      .subscribe((docente) => (this.docente = docente));

    this.route.queryParamMap.subscribe((params) => {
      const semestreIdParam = params.get('semestreId');
      if (!semestreIdParam) {
        this.loadingSemestre = false;
        this.semestre = undefined;
        return;
      }

      const semestreId = Number(semestreIdParam);
      if (Number.isNaN(semestreId)) {
        this.loadingSemestre = false;
        this.semestre = undefined;
        return;
      }

      this.loadingSemestre = true;
      this.cargaHorariaService
        .getSemestres()
        .pipe(finalize(() => (this.loadingSemestre = false)))
        .subscribe((semestres) => {
          this.semestre = semestres.find((item) => item.id === semestreId);
        });
    });
  }

  get sedeSeleccionada(): 'central' | 'desconcentrada' {
    return this.sedeControl.value;
  }

  get parrafoDesconcentrada(): string {
    return `En calidad de docente destacado en sede desconcentrada, me comprometo a
    respetar las disposiciones complementarias, horarios de traslado y
    lineamientos establecidos por la Universidad Nacional de Trujillo para la
    atención descentralizada.`;
  }

  firmarDeclaracion(): void {
    if (!this.docente) return;

    const dialogRef = this.dialog.open(DialogoConfirmacionComponent, {
      width: '480px',
      data: {
        docente: this.docente,
        semestre: this.semestre,
        sede: this.sedeSeleccionada,
      },
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.snackBar.open('Declaración jurada enviada correctamente.', 'Cerrar', {
          duration: 4000,
        });
      }
    });
  }
}

@Component({
  selector: 'app-dialogo-confirmacion',
  standalone: true,
  template: `
    <div class="dialogo">
      <h2>Confirmar envío</h2>
      <p>
        Se enviará la declaración jurada correspondiente al periodo
        <strong>{{ data.semestre?.nombre || '—' }}</strong>.
      </p>
      <div class="detalle">
        <p><strong>Docente:</strong> {{ data.docente.nombre }}</p>
        <p><strong>DNI:</strong> {{ data.docente.dni }}</p>
        <p><strong>IBM:</strong> {{ data.docente.ibm }}</p>
        <p><strong>Sede:</strong> {{ data.sede === 'central' ? 'Sede central' : 'Sede desconcentrada' }}</p>
      </div>
      <div class="acciones">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" [mat-dialog-close]="true">
          Confirmar envío
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .dialogo {
        font-family: 'Inter', 'Roboto', sans-serif;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .detalle p {
        margin: 0;
      }
      .acciones {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
    `,
  ],
  imports: [CommonModule, MatButtonModule, MatDialogModule],
})
export class DialogoConfirmacionComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: { docente: Docente; semestre?: Semestre; sede: string }) {}
}
