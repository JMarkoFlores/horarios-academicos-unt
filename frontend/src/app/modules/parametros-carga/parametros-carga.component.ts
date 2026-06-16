import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PeriodoService } from '../../core/services/periodo.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ApiResponse } from '../../core/interfaces/entities';

interface ParametrosCarga {
  id: number;
  periodo_academico: string;
  tipo_docente: string;
  categoria: string;
  modalidad: string;
  horas_min_semanal: number;
  horas_max_semanal: number;
  cursos_min_docente: number;
  cursos_max_docente: number;
}

@Component({
  selector: 'app-parametros-carga',
  templateUrl: './parametros-carga.component.html',
  styleUrls: ['./parametros-carga.component.scss'],
})
export class ParametrosCargaComponent implements OnInit {
  parametrosList: ParametrosCarga[] = [];
  parametrosFiltrados: ParametrosCarga[] = [];
  loadingParametros = false;
  guardandoParametros = false;
  eliminandoParametroId: number | null = null;
  editingParametroId: number | null = null;
  parametrosForm!: FormGroup;
  filtrosParametros = {
    tipo_docente: '',
    categoria: '',
    modalidad: ''
  };

  tiposDocente = [
    { value: 'ORDINARIO', label: 'Nombrado' },
    { value: 'CONTRATADO', label: 'Contratado' },
    { value: 'JEFE_PRACTICA_CONTRATADO', label: 'Jefe de práctica' },
  ];

  categoriasPorTipo: Record<string, { value: string; label: string }[]> = {
    ORDINARIO: [
      { value: 'PRINCIPAL', label: 'Principal' },
      { value: 'ASOCIADO', label: 'Asociado' },
      { value: 'AUXILIAR', label: 'Auxiliar' },
    ],
    CONTRATADO: [{ value: 'SIN_CATEGORIA', label: 'Sin categoría' }],
    JEFE_PRACTICA_CONTRATADO: [
      { value: 'SIN_CATEGORIA', label: 'Sin categoría' },
    ],
  };

  categoriasDisponibles: { value: string; label: string }[] = [];

  modalidades = [
    { value: 'DEDICACION_EXCLUSIVA', label: 'Dedicación exclusiva' },
    { value: 'TIEMPO_COMPLETO_40', label: 'Tiempo completo 40h' },
    { value: 'TIEMPO_PARCIAL_20', label: 'Tiempo parcial 20h' },
    { value: 'TIEMPO_PARCIAL_12', label: 'Tiempo parcial 12h' },
    { value: 'TIEMPO_PARCIAL_10', label: 'Tiempo parcial 10h' },
    { value: 'TIEMPO_PARCIAL_8', label: 'Tiempo parcial 8h' },
  ];

  modalidadesDisponibles: { value: string; label: string }[] = [];

  constructor(
    private api: ApiService,
    public periodoService: PeriodoService,
    private notif: NotifToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarParametrosCarga();
  }

  private initForm(): void {
    this.parametrosForm = this.fb.group({
      tipo_docente: ['', Validators.required],
      categoria: [{ value: '', disabled: true }, Validators.required],
      modalidad: [{ value: '', disabled: true }, Validators.required],
      horas_min_semanal: [
        4,
        [Validators.required, Validators.min(1), Validators.max(40)],
      ],
      horas_max_semanal: [
        20,
        [Validators.required, Validators.min(1), Validators.max(80)],
      ],
      cursos_min_docente: [
        1,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
      cursos_max_docente: [
        5,
        [Validators.required, Validators.min(1), Validators.max(20)],
      ],
    });
  }

  cargarParametrosCarga(): void {
    this.loadingParametros = true;
    this.api
      .get<ApiResponse<ParametrosCarga[]>>('/configuracion/parametros-carga', {
        periodo: this.periodoService.periodo,
      })
      .subscribe({
        next: (r) => {
          this.parametrosList = r.data ?? [];
          this.aplicarFiltrosParametros();
          this.loadingParametros = false;
        },
        error: () => {
          this.loadingParametros = false;
        },
      });
  }

  aplicarFiltrosParametros(): void {
    this.parametrosFiltrados = this.parametrosList.filter(p => {
      const tipoDocenteOk = !this.filtrosParametros.tipo_docente || p.tipo_docente === this.filtrosParametros.tipo_docente;
      const categoriaOk = !this.filtrosParametros.categoria || p.categoria === this.filtrosParametros.categoria;
      const modalidadOk = !this.filtrosParametros.modalidad || p.modalidad === this.filtrosParametros.modalidad;
      return tipoDocenteOk && categoriaOk && modalidadOk;
    });
  }

  onFiltroChange(): void {
    this.aplicarFiltrosParametros();
  }

  guardarParametrosCarga(): void {
    if (this.parametrosForm.invalid) return;
    this.guardandoParametros = true;
    const payload = {
      ...this.parametrosForm.getRawValue(),
      periodo_academico: this.periodoService.periodo,
    };
    this.api
      .post<
        ApiResponse<ParametrosCarga>
      >('/configuracion/parametros-carga', payload)
      .subscribe({
        next: (r) => {
          this.guardandoParametros = false;
          this.editingParametroId = null;
          this.notif.success(r.message ?? 'Parámetros guardados correctamente');
          this.resetParametrosForm();
          this.cargarParametrosCarga();
        },
        error: (err) => {
          this.guardandoParametros = false;
          this.notif.error(
            err?.error?.message ?? 'Error al guardar parámetros',
          );
        },
      });
  }

  editarParametro(p: ParametrosCarga): void {
    this.editingParametroId = p.id;
    const tipo = p.tipo_docente;
    this.categoriasDisponibles = this.categoriasPorTipo[tipo] ?? [];
    this.modalidadesDisponibles =
      tipo === 'JEFE_PRACTICA_CONTRATADO'
        ? this.modalidades.filter((m) => m.value !== 'DEDICACION_EXCLUSIVA')
        : [...this.modalidades];
    this.parametrosForm.get('categoria')!.enable();
    this.parametrosForm.get('modalidad')!.enable();
    this.parametrosForm.patchValue({
      tipo_docente: p.tipo_docente,
      categoria: p.categoria,
      modalidad: p.modalidad,
      horas_min_semanal: p.horas_min_semanal,
      horas_max_semanal: p.horas_max_semanal,
      cursos_min_docente: p.cursos_min_docente,
      cursos_max_docente: p.cursos_max_docente,
    });
    document
      .querySelector('.parametros-form-card')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  cancelarEdicionParametro(): void {
    this.editingParametroId = null;
    this.resetParametrosForm();
  }

  eliminarParametro(id: number): void {
    this.eliminandoParametroId = id;
    this.api
      .delete<ApiResponse<null>>(`/configuracion/parametros-carga/${id}`)
      .subscribe({
        next: (r) => {
          this.eliminandoParametroId = null;
          this.notif.success(r.message ?? 'Parámetro eliminado');
          this.cargarParametrosCarga();
        },
        error: (err) => {
          this.eliminandoParametroId = null;
          this.notif.error(err?.error?.message ?? 'Error al eliminar');
        },
      });
  }

  onTipoDocenteChange(tipo: string): void {
    this.parametrosForm.get('categoria')!.reset('');
    this.parametrosForm.get('modalidad')!.reset('');
    this.parametrosForm.get('modalidad')!.disable();
    if (tipo) {
      this.categoriasDisponibles = this.categoriasPorTipo[tipo] ?? [];
      this.parametrosForm.get('categoria')!.enable();
      this.modalidadesDisponibles =
        tipo === 'JEFE_PRACTICA_CONTRATADO'
          ? this.modalidades.filter((m) => m.value !== 'DEDICACION_EXCLUSIVA')
          : [...this.modalidades];
      if (this.categoriasDisponibles.length === 1) {
        this.parametrosForm
          .get('categoria')!
          .setValue(this.categoriasDisponibles[0].value);
        this.parametrosForm.get('modalidad')!.enable();
      }
    } else {
      this.categoriasDisponibles = [];
      this.modalidadesDisponibles = [];
      this.parametrosForm.get('categoria')!.disable();
    }
  }

  onCategoriaChange(categoria: string): void {
    this.parametrosForm.get('modalidad')!.reset('');
    if (categoria) {
      this.parametrosForm.get('modalidad')!.enable();
    } else {
      this.parametrosForm.get('modalidad')!.disable();
    }
  }

  getTipoDocenteLabel(value: string): string {
    return this.tiposDocente.find((t) => t.value === value)?.label ?? value;
  }

  getCategoriaLabel(value: string): string {
    if (value === 'SIN_CATEGORIA') return 'Sin categoría';
    if (!value) return '—';
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  getModalidadLabel(value: string): string {
    return this.modalidades.find((m) => m.value === value)?.label ?? value;
  }

  formatModalidad(m: string): string {
    return this.getModalidadLabel(m);
  }

  private resetParametrosForm(): void {
    this.parametrosForm.reset({
      tipo_docente: '',
      horas_min_semanal: 4,
      horas_max_semanal: 20,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    });
    this.parametrosForm.get('categoria')!.disable();
    this.parametrosForm.get('modalidad')!.disable();
    this.categoriasDisponibles = [];
    this.modalidadesDisponibles = [];
  }
}
