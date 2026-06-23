import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocenteHorarioComponent } from './docente-horario.component';
import { RouterModule, Routes } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

const routes: Routes = [{ path: '', component: DocenteHorarioComponent }];

@NgModule({
  declarations: [DocenteHorarioComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSlideToggleModule,
    FormsModule
  ]
})
export class DocenteHorarioModule { }
