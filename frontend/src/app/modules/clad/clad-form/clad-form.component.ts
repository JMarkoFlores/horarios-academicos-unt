import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CladService } from '../../../core/services/clad.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { NotifToastService } from '../../../core/services/notif-toast.service';
import { TipoDependenciaClad } from '../../../core/interfaces/clad.interface';

@Component({
  selector: 'app-clad-form',
  templateUrl: './clad-form.component.html',
  styleUrls: ['./clad-form.component.scss']
})
export class CladFormComponent implements OnInit {
  cladForm: FormGroup;
  isEditMode = false;
  cladId?: number;
  periodos: any[] = [];
  tiposDependencia = Object.values(TipoDependenciaClad);
  saving = false;

  constructor(
    private fb: FormBuilder,
    private cladService: CladService,
    private periodoService: PeriodoService,
    private notif: NotifToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cladForm = this.fb.group({
      periodo_academico_id: ['', Validators.required],
      tipo_dependencia: ['', Validators.required],
      nombre_dependencia: [''],
      observaciones: [''],
      detalles: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.cladId = +params['id'];
        this.cargarClad(this.cladId);
      } else {
        this.agregarDetalle();
      }
    });
  }

  get detalles() {
    return this.cladForm.get('detalles') as FormArray;
  }

  getHorarios(detalleIndex: number) {
    return this.detalles.at(detalleIndex).get('horario') as FormArray;
  }

  cargarPeriodos(): void {
    this.periodoService.periodos$.subscribe(data => {
      this.periodos = data;
    });
  }

  cargarClad(id: number): void {
    this.cladService.findOne(id).subscribe(clad => {
      this.cladForm.patchValue({
        periodo_academico_id: clad.periodo_academico_id,
        tipo_dependencia: clad.tipo_dependencia,
        nombre_dependencia: clad.nombre_dependencia,
        observaciones: clad.observaciones
      });

      clad.detalles.forEach(det => {
        const detGroup = this.crearDetalleGroup();
        detGroup.patchValue({
          codigo_curso: det.codigo_curso,
          nombre_curso: det.nombre_curso,
          horas_semanales: det.horas_semanales,
          fecha_inicio: det.fecha_inicio,
          fecha_fin: det.fecha_fin
        });

        const horariosArray = detGroup.get('horario') as FormArray;
        horariosArray.clear();
        
        if (det.horario && Array.isArray(det.horario)) {
          det.horario.forEach((h: any) => {
            const hGroup = this.crearHorarioGroup();
            hGroup.patchValue(h);
            horariosArray.push(hGroup);
          });
        }
        this.detalles.push(detGroup);
      });
    });
  }

  crearDetalleGroup(): FormGroup {
    return this.fb.group({
      codigo_curso: [''],
      nombre_curso: ['', Validators.required],
      horas_semanales: ['', [Validators.required, Validators.min(1)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      horario: this.fb.array([this.crearHorarioGroup()])
    });
  }

  crearHorarioGroup(): FormGroup {
    return this.fb.group({
      dia: [1, Validators.required],
      hora_inicio: ['', Validators.required],
      hora_fin: ['', Validators.required],
      lugar: ['']
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleGroup());
  }

  removerDetalle(index: number): void {
    this.detalles.removeAt(index);
  }

  agregarHorario(detalleIndex: number): void {
    this.getHorarios(detalleIndex).push(this.crearHorarioGroup());
  }

  removerHorario(detalleIndex: number, horarioIndex: number): void {
    this.getHorarios(detalleIndex).removeAt(horarioIndex);
  }

  guardar(): void {
    if (this.cladForm.invalid) return;
    this.saving = true;

    const req = this.isEditMode
      ? this.cladService.update(this.cladId!, this.cladForm.value)
      : this.cladService.create(this.cladForm.value);

    req.subscribe({
      next: () => {
        this.notif.success('CLAD guardado correctamente');
        this.router.navigate(['/app/clad']);
      },
      error: (err) => {
        const msgs = err.error?.message;
        const msgStr = Array.isArray(msgs) ? msgs.join(', ') : (msgs || 'Error al guardar CLAD');
        this.notif.info(msgStr);
        this.saving = false;
      }
    });
  }
}
