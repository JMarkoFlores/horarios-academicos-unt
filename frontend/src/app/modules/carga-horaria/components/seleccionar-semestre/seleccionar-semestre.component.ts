import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

@Component({
  selector: 'app-seleccionar-semestre',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './seleccionar-semestre.component.html',
  styleUrls: ['./seleccionar-semestre.component.scss'],
})
export class SeleccionarSemestreComponent implements OnInit {
  semestres: Semestre[] = [];
  docente?: Docente;
  loadingSemestres = true;
  loadingDocente = true;
  semestreControl = new FormControl<number | null>(null, {
    validators: [Validators.required],
  });

  constructor(
    private readonly cargaHorariaService: CargaHorariaService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargaHorariaService
      .getSemestres()
      .pipe(finalize(() => (this.loadingSemestres = false)))
      .subscribe((semestres) => {
        this.semestres = semestres;
      });

    this.cargaHorariaService
      .getDocenteActual()
      .pipe(finalize(() => (this.loadingDocente = false)))
      .subscribe((docente) => {
        this.docente = docente;
      });
  }

  continuar(): void {
    if (this.semestreControl.invalid) return;
    const semestreId = this.semestreControl.value;
    this.router.navigate(['/carga-horaria/confirmar-datos'], {
      queryParams: { semestreId },
    });
  }

  get resumenDocente(): { label: string; value: string | undefined }[] {
    return [
      { label: 'Nombre', value: this.docente?.nombre },
      { label: 'IBM', value: this.docente?.ibm },
      { label: 'Dedicación', value: this.docente?.dedicacion },
    ];
  }
}
