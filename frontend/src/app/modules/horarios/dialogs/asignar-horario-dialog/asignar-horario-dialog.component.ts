import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { NotifToastService } from '../../../../core/services/notif-toast.service';
import {
  Docente,
  Curso,
  Ambiente,
  ApiResponse,
  Grupo,
} from '../../../../core/interfaces/entities';

export interface AsignarHorarioData {
  docente: Docente;
  dia: number;
  horaInicio: string;
  horaFin: string;
  periodo: string;
}

@Component({
  selector: 'app-asignar-horario-dialog',
  templateUrl: './asignar-horario-dialog.component.html',
  styleUrls: ['./asignar-horario-dialog.component.scss'],
})
export class AsignarHorarioDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  cursos: Curso[] = [];
  ambientes: Ambiente[] = [];
  grupos: Grupo[] = [];
  grupoSeleccionado: Grupo | null = null;
  ambienteOcupado = false;
  loading = false;
  guardando = false;
  private ambSub?: Subscription;

  tiposClase = [
    { value: 'TEORIA', label: 'Teoría' },
    { value: 'LABORATORIO', label: 'Laboratorio' },
  ];

  dias = [
    '',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  constructor(
    private dialogRef: MatDialogRef<AsignarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarHorarioData,
    private fb: FormBuilder,
    private api: ApiService,
    private notif: NotifToastService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      curso_id: [null, Validators.required],
      grupo_id: [null, Validators.required],
      ambiente_id: [null, Validators.required],
      tipo_clase: ['TEORIA', Validators.required],
    });

    this.form.get('curso_id')?.valueChanges.subscribe((cursoId) => {
      if (cursoId) {
        this.cargarGrupos(cursoId);
      } else {
        this.grupos = [];
        this.grupoSeleccionado = null;
        this.form.get('grupo_id')?.reset();
      }
    });

    this.form.get('grupo_id')?.valueChanges.subscribe((grupoId) => {
      this.grupoSeleccionado =
        this.grupos.find((g) => g.id === grupoId) ?? null;
      this.form.get('ambiente_id')?.reset();
      this.ambienteOcupado = false;
    });

    this.form
      .get('ambiente_id')
      ?.valueChanges.pipe(debounceTime(200))
      .subscribe((ambienteId) => {
        if (ambienteId) {
          this.verificarOcupacion(ambienteId);
        } else {
          this.ambienteOcupado = false;
        }
      });

    this.loading = true;
    this.api.get<ApiResponse<any>>('/cursos', { limit: 100 }).subscribe({
      next: (r: ApiResponse<any>) => {
        this.cursos = r.data?.items ?? r.data ?? [];
      },
      error: () => {},
    });

    this.api
      .get<ApiResponse<any>>('/ambientes', { limit: 100, estado: 'ACTIVO' })
      .subscribe({
        next: (r: ApiResponse<any>) => {
          this.ambientes = r.data?.items ?? r.data ?? [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.ambSub?.unsubscribe();
  }

  cargarGrupos(cursoId: number): void {
    this.form.get('grupo_id')?.reset();
    this.grupos = [];
    this.grupoSeleccionado = null;
    this.api
      .get<ApiResponse<any>>('/grupos', {
        curso_id: cursoId,
        periodo: this.data.periodo,
        limit: 100,
      })
      .subscribe({
        next: (r: any) => {
          this.grupos = r?.data?.items ?? r?.data ?? [];
        },
        error: () => {},
      });
  }

  get ambientesCompatibles(): Ambiente[] {
    const tipoClase = this.form?.get('tipo_clase')?.value as string;
    const cupo = this.grupoSeleccionado?.cupo_maximo ?? 0;
    if (!tipoClase) return this.ambientes;
    return this.ambientes.filter((a) => {
      if (a.capacidad < cupo) return false;
      if (tipoClase === 'LABORATORIO') {
        return a.tipo === 'LABORATORIO';
      }
      return (
        a.tipo === 'AULA' || a.tipo === 'AUDITORIO' || a.tipo === 'SEMINARIO'
      );
    });
  }

  private verificarOcupacion(ambienteId: number): void {
    this.ambienteOcupado = false;
    this.ambSub = this.api
      .get<ApiResponse<any>>(`/horarios/ambiente/${ambienteId}`, {
        periodo: this.data.periodo,
        limit: 200,
      })
      .subscribe({
        next: (r: any) => {
          const items = r?.data?.items ?? r?.data ?? [];
          const hInicio = this.horaToDecimal(this.data.horaInicio);
          const hFin = this.horaToDecimal(this.data.horaFin);
          this.ambienteOcupado = items.some(
            (h: any) =>
              (h.dia_semana ?? h.dia) === this.data.dia &&
              this.horaToDecimal(h.hora_inicio) < hFin &&
              this.horaToDecimal(h.hora_fin) > hInicio,
          );
        },
        error: () => {
          this.ambienteOcupado = false;
        },
      });
  }

  private horaToDecimal(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h + (m || 0) / 60;
  }

  get diaLabel(): string {
    return this.dias[this.data.dia] ?? '';
  }

  guardar(): void {
    if (this.form.invalid || this.ambienteOcupado) return;

    this.guardando = true;
    const payload = {
      docente_id: this.data.docente.id,
      curso_id: this.form.value.curso_id,
      grupo_id: this.form.value.grupo_id,
      ambiente_id: this.form.value.ambiente_id,
      dia_semana: this.data.dia,
      hora_inicio: this.data.horaInicio,
      hora_fin: this.data.horaFin,
      tipo_clase: this.form.value.tipo_clase,
      periodo_academico: this.data.periodo,
    };

    this.api.post<ApiResponse<any>>('/horarios/asignar', payload).subscribe({
      next: () => {
        this.guardando = false;
        this.notif.success('Horario asignado correctamente');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.guardando = false;
        const msg = err?.error?.message ?? 'Error al asignar horario';
        this.notif.error(msg);
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
