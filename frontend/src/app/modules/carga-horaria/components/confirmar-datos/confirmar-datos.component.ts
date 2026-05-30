import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente } from '../../models/carga-horaria.models';

@Component({
  selector: 'app-confirmar-datos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './confirmar-datos.component.html',
  styleUrls: ['./confirmar-datos.component.scss'],
})
export class ConfirmarDatosComponent implements OnInit {
  docente?: Docente;
  semestreNombre?: string;
  loadingDocente = true;
  loadingSemestre = true;

  constructor(
    private readonly cargaHorariaService: CargaHorariaService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargaHorariaService
      .getDocenteActual()
      .pipe(finalize(() => (this.loadingDocente = false)))
      .subscribe((docente) => {
        this.docente = docente;
      });

    this.route.queryParamMap.subscribe((params) => {
      const semestreIdParam = params.get('semestreId');

      if (!semestreIdParam) {
        this.semestreNombre = undefined;
        this.loadingSemestre = false;
        return;
      }

      const semestreId = Number(semestreIdParam);
      if (Number.isNaN(semestreId)) {
        this.semestreNombre = undefined;
        this.loadingSemestre = false;
        return;
      }

      this.loadingSemestre = true;
      this.cargaHorariaService
        .getSemestres()
        .pipe(finalize(() => (this.loadingSemestre = false)))
        .subscribe((semestres) => {
          const semestre = semestres.find((item) => item.id === semestreId);
          this.semestreNombre = semestre?.nombre ?? 'Semestre no encontrado';
        });
    });
  }

  get camposDocente(): { label: string; value: string | undefined }[] {
    return [
      { label: 'Docente', value: this.docente?.nombre },
      { label: 'Departamento Académico', value: this.docente?.departamento },
      { label: 'Facultad', value: this.docente?.facultad },
      { label: 'Código IBM', value: this.docente?.ibm },
      { label: 'Condición', value: this.docente?.condicion },
      { label: 'Categoría', value: this.docente?.categoria },
      { label: 'Dedicación', value: this.docente?.dedicacion },
    ];
  }

  solicitarCorreccion(): void {
    this.snackBar.open('Se ha enviado la solicitud de corrección.', 'Cerrar', {
      duration: 4000,
    });
  }

  guardarYContinuar(): void {
    this.router.navigate(['/carga-horaria/lista-formatos']);
  }
}
