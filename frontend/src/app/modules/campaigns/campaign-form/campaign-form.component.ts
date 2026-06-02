import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import {
  ApiResponse,
  CampañaVentanas,
  PeriodoAcademico,
} from '../../../core/interfaces/entities';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.scss'],
})
export class CampaignFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  campaignId: string | null = null;
  saving = false;
  loading = false;
  periodos: PeriodoAcademico[] = [];

  diasSemana = [
    { value: 'LUNES', label: 'Lunes' },
    { value: 'MARTES', label: 'Martes' },
    { value: 'MIERCOLES', label: 'Miércoles' },
    { value: 'JUEVES', label: 'Jueves' },
    { value: 'VIERNES', label: 'Viernes' },
    { value: 'SABADO', label: 'Sábado' },
    { value: 'DOMINGO', label: 'Domingo' },
  ];

  camposPrioridad = [
    { value: 'tipo_docente', label: 'Tipo Docente' },
    { value: 'categoria', label: 'Categoría' },
    { value: 'modalidad', label: 'Modalidad' },
    { value: 'fecha_ingreso', label: 'Fecha de Ingreso' },
    { value: 'horas_asignadas', label: 'Horas Asignadas' },
    { value: 'codigo', label: 'Código' },
    { value: 'apellidos', label: 'Apellidos' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private route: ActivatedRoute,
    public router: Router, // Hacemos público para que el template lo use
    private snackBar: MatSnackBar,
    private periodoService: PeriodoService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: ['', [Validators.required]],
      idPeriodo: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      dias_habilitados: [[], Validators.required],
      bloques_horarios: this.fb.array([]),
      duracion_turno_minutos: [15, [Validators.min(5)]],
      buffer_minutos: [5, [Validators.min(0)]],
      cupos_maximos_ventana: [20, [Validators.min(1)]],
      porcentaje_reserva: [15, [Validators.min(0), Validators.max(50)]],
      reglas_prioridad: this.fb.array([]),
      excluir_feriados: [true],
      excluir_eventos: [true],
      distribucion_equitativa: [true],
    });

    this.addBloqueHorario();
    this.addReglaPrioridad();

    this.periodoService.periodos$.subscribe((periodos) => {
      this.periodos = periodos;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.campaignId = id;
      this.cargarCampaign(id);
    }
  }

  get bloquesHorarios(): FormArray {
    return this.form.get('bloques_horarios') as FormArray;
  }

  get reglasPrioridad(): FormArray {
    return this.form.get('reglas_prioridad') as FormArray;
  }

  addBloqueHorario(): void {
    this.bloquesHorarios.push(
      this.fb.group({
        nombre: ['Mañana', Validators.required],
        hora_inicio: ['08:00', Validators.required],
        hora_fin: ['12:00', Validators.required],
      })
    );
  }

  removeBloqueHorario(index: number): void {
    if (this.bloquesHorarios.length > 1) {
      this.bloquesHorarios.removeAt(index);
    }
  }

  addReglaPrioridad(): void {
    this.reglasPrioridad.push(
      this.fb.group({
        campo: ['categoria', Validators.required],
        orden: ['DESC', Validators.required],
      })
    );
  }

  removeReglaPrioridad(index: number): void {
    if (this.reglasPrioridad.length > 1) {
      this.reglasPrioridad.removeAt(index);
    }
  }

  cargarCampaign(id: string): void {
    this.loading = true;
    this.api.get<ApiResponse<CampañaVentanas>>(`/campanas-ventanas/${id}`).subscribe({
      next: (res) => {
        const c = res.data;
        this.form.patchValue({
          nombre: c.nombre,
          descripcion: c.descripcion,
          idPeriodo: c.periodo_id,
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
          dias_habilitados: c.dias_habilitados,
          duracion_turno_minutos: c.duracion_turno_minutos,
          buffer_minutos: c.buffer_minutos,
          cupos_maximos_ventana: c.cupos_maximos_ventana,
          porcentaje_reserva: c.porcentaje_reserva,
          excluir_feriados: c.excluir_feriados,
          excluir_eventos: c.excluir_eventos,
          distribucion_equitativa: c.distribucion_equitativa,
        });

        this.bloquesHorarios.clear();
        c.bloques_horarios.forEach((bloque) => {
          this.bloquesHorarios.push(
            this.fb.group({
              nombre: [bloque.nombre, Validators.required],
              hora_inicio: [bloque.hora_inicio, Validators.required],
              hora_fin: [bloque.hora_fin, Validators.required],
            })
          );
        });

        this.reglasPrioridad.clear();
        (c.reglas_prioridad || []).forEach((regla) => {
          this.reglasPrioridad.push(
            this.fb.group({
              campo: [regla.campo, Validators.required],
              orden: [regla.orden, Validators.required],
            })
          );
        });

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.snackBar.open('Error al cargar la campaña', 'OK', { duration: 3000 });
        this.router.navigate(['/app/campaigns']);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.value;

    const req =
      this.isEdit && this.campaignId
        ? this.api.put<ApiResponse<any>>(
            `/campanas-ventanas/${this.campaignId}`,
            payload,
          )
        : this.api.post<ApiResponse<any>>('/campanas-ventanas', payload);

    req.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEdit ? 'Campaña actualizada' : 'Campaña creada',
          'OK',
          { duration: 2000 },
        );
        this.saving = false;
        this.router.navigate(['/app/campaigns']);
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.snackBar.open(
          err.error?.message || 'Error al guardar la campaña',
          'OK',
          { duration: 5000 },
        );
      },
    });
  }
}
