import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
export class AsignarHorarioDialogComponent implements OnInit {
  form!: FormGroup;
  cursos: Curso[] = [];
  ambientes: Ambiente[] = [];
  grupos: Grupo[] = [];
  loading = false;
  guardando = false;

  tiposClase = [
    { value: 'TEORIA', label: 'Teoría' },
    { value: 'LABORATORIO', label: 'Laboratorio' },
  ];

  dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

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
        this.form.get('grupo_id')?.reset();
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
      .get<ApiResponse<any>>('/ambientes', { limit: 100, activo: 'true' })
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

  cargarGrupos(cursoId: number): void {
    this.form.get('grupo_id')?.reset();
    this.grupos = [];
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

  get diaLabel(): string {
    return this.dias[this.data.dia] ?? '';
  }

  guardar(): void {
    if (this.form.invalid) return;

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
