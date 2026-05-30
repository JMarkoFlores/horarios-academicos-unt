import { CommonModule } from '@angular/common';
import { Component, OnInit, Signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs/operators';
import { startWith } from 'rxjs';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

@Component({
  selector: 'app-formato-uno',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './formato-uno.component.html',
  styleUrls: ['./formato-uno.component.scss'],
})
export class FormatoUnoComponent implements OnInit {
  docente?: Docente;
  semestre?: Semestre;
  loadingDocente = true;
  loadingSemestre = true;

  readonly cursosLectivos: CursoLectivo[] = [
    {
      codigo: 'SIS101',
      nombre: 'Fundamentos de Programación',
      seccion: '01',
      escuela: 'Ingeniería de Sistemas',
      ciclo: 'I',
      alumnos: 32,
      ht: 4,
      hp: 2,
      hl: 0,
      total: 6,
    },
    {
      codigo: 'SIS235',
      nombre: 'Bases de Datos I',
      seccion: '02',
      escuela: 'Ingeniería de Sistemas',
      ciclo: 'IV',
      alumnos: 28,
      ht: 3,
      hp: 2,
      hl: 1,
      total: 6,
    },
    {
      codigo: 'SIS310',
      nombre: 'Arquitectura de Computadoras',
      seccion: '01',
      escuela: 'Ingeniería de Sistemas',
      ciclo: 'VI',
      alumnos: 24,
      ht: 3,
      hp: 2,
      hl: 0,
      total: 5,
    },
  ];

  readonly displayedColumns = [
    'codigo',
    'nombre',
    'seccion',
    'escuela',
    'ciclo',
    'alumnos',
    'ht',
    'hp',
    'hl',
    'total',
  ];

  readonly bloquesNoLectivos: BloqueNoLectivo[] = [
    { titulo: 'Bloque III — Preparación y evaluación', requiereCodigo: false },
    { titulo: 'Bloque IV — Consejería y tutoría', requiereCodigo: false },
    { titulo: 'Bloque V — Investigación', requiereCodigo: true },
    { titulo: 'Bloque VI — Capacitación', requiereCodigo: false },
    { titulo: 'Bloque VII — Actividades de gobierno', requiereCodigo: false },
    { titulo: 'Bloque VIII — Actividades de administración', requiereCodigo: false },
    {
      titulo: 'Bloque IX — Asesoría de tesis y exámenes profesionales',
      requiereCodigo: true,
    },
    { titulo: 'Bloque X — Responsabilidad social universitaria', requiereCodigo: false },
    { titulo: 'Bloque XI — Comités técnicos y comisiones', requiereCodigo: true },
  ];

  nonLectivoForm!: FormGroup;
  bloquesFormArray!: FormArray<FormGroup>;
  private bloquesValores!: Signal<BloqueNoLectivoValue[]>;
  totalLectivo!: Signal<number>;
  totalNoLectivo!: Signal<number>;
  totalGeneral!: Signal<number>;

  constructor(
    private readonly cargaHorariaService: CargaHorariaService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.bloquesFormArray = this.fb.array(
      this.bloquesNoLectivos.map((bloque) => this.crearBloqueGroup(bloque.requiereCodigo)),
    );
    this.nonLectivoForm = this.fb.group({
      bloques: this.bloquesFormArray,
    });

    const valores$ = this.bloquesFormArray.valueChanges.pipe(
      startWith(this.bloquesFormArray.value as BloqueNoLectivoValue[]),
    );

    this.bloquesValores = toSignal(valores$, {
      initialValue: this.bloquesFormArray.value as BloqueNoLectivoValue[],
    });

    this.totalLectivo = computed(() => this.totales.total);
    this.totalNoLectivo = computed(() =>
      this.bloquesValores().reduce((acumulado, bloque) => acumulado + this.parseHoras(bloque?.horas), 0),
    );
    this.totalGeneral = computed(() => this.totalLectivo() + this.totalNoLectivo());

    this.cargaHorariaService
      .getDocenteActual()
      .pipe(finalize(() => (this.loadingDocente = false)))
      .subscribe((docente) => {
        this.docente = docente;
      });

    this.route.queryParamMap.subscribe((params) => {
      const semestreIdParam = params.get('semestreId');
      if (!semestreIdParam) {
        this.semestre = undefined;
        this.loadingSemestre = false;
        return;
      }

      const semestreId = Number(semestreIdParam);
      if (Number.isNaN(semestreId)) {
        this.semestre = undefined;
        this.loadingSemestre = false;
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

  get totales(): TotalesLectivos {
    return this.cursosLectivos.reduce<TotalesLectivos>(
      (acc, curso) => ({
        alumnos: acc.alumnos + curso.alumnos,
        ht: acc.ht + curso.ht,
        hp: acc.hp + curso.hp,
        hl: acc.hl + curso.hl,
        total: acc.total + curso.total,
      }),
      { alumnos: 0, ht: 0, hp: 0, hl: 0, total: 0 },
    );
  }

  get camposDocente(): { label: string; valor: string }[] {
    const docente = this.docente;
    return [
      { label: 'Nombre', valor: docente?.nombre ?? '—' },
      { label: 'Código IBM', valor: docente?.ibm ?? '—' },
      { label: 'Facultad', valor: docente?.facultad ?? '—' },
      { label: 'Departamento', valor: docente?.departamento ?? '—' },
      { label: 'Condición', valor: docente?.condicion ?? '—' },
      { label: 'Categoría', valor: docente?.categoria ?? '—' },
      { label: 'Dedicación', valor: docente?.dedicacion ?? '—' },
    ];
  }

  reportarInconsistencia(): void {
    this.snackBar.open('Se registró el reporte de inconsistencia.', 'Cerrar', {
      duration: 3500,
    });
  }

  guardarBorrador(): void {
    if (this.nonLectivoForm.invalid) {
      this.nonLectivoForm.markAllAsTouched();
    }
    this.snackBar.open('Los cambios se han guardado en borrador.', 'Cerrar', {
      duration: 3500,
    });
  }

  previsualizarPdf(): void {
    this.snackBar.open('La previsualización estará disponible próximamente.', 'Cerrar', {
      duration: 3500,
    });
  }

  continuarDeclaracion(): void {
    if (this.nonLectivoForm.invalid) {
      this.nonLectivoForm.markAllAsTouched();
      this.snackBar.open('Revisa las horas semanales ingresadas antes de continuar.', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    this.router.navigate(['/carga-horaria/formato-dos']);
  }

  bloqueControl(index: number): FormGroup {
    return this.bloquesFormArray.at(index) as FormGroup;
  }

  private crearBloqueGroup(requiereCodigo: boolean): FormGroup {
    const controles: Record<string, unknown> = {
      horas: this.fb.control<number | null>(0, {
        validators: [Validators.required, Validators.min(0)],
      }),
      descripcion: this.fb.control<string>('', { nonNullable: true }),
    };

    if (requiereCodigo) {
      controles['codigo'] = this.fb.control<string>('', { nonNullable: true });
    }

    return this.fb.group(controles);
  }

  private parseHoras(value: unknown): number {
    const numero = Number(value);
    return Number.isFinite(numero) && numero > 0 ? numero : Math.max(0, numero || 0);
  }
}

interface CursoLectivo {
  codigo: string;
  nombre: string;
  seccion: string;
  escuela: string;
  ciclo: string;
  alumnos: number;
  ht: number;
  hp: number;
  hl: number;
  total: number;
}

interface TotalesLectivos {
  alumnos: number;
  ht: number;
  hp: number;
  hl: number;
  total: number;
}

type BloqueNoLectivoValue = {
  horas: number | null | undefined;
  descripcion: string;
  codigo?: string | null;
};

interface BloqueNoLectivo {
  titulo: string;
  requiereCodigo: boolean;
}
