import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

import { Docente, Curso, Ambiente } from '../../core/interfaces/entities';

@Component({
  selector: 'app-asignaciones',
  templateUrl: './asignaciones.component.html',
  styleUrls: ['./asignaciones.component.scss']
})
export class AsignacionesComponent implements OnInit {
  docentes: Docente[] = [];
  docenteSeleccionado: Docente | null = null;
  
  cursosAsignados: Curso[] = [];
  ambientesAsignados: Ambiente[] = [];
  
  todosCursos: Curso[] = [];
  todosAmbientes: Ambiente[] = [];
  
  loadingDocentes = false;
  loadingData = false;
 
  serviciosDisponibles = {
    docentes: true,
    cursos: true,
    ambientes: true
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarDocentes();
    this.cargarCatalogos();
  }

  cargarDocentes(): void {
    this.loadingDocentes = true;
    this.api.get<any>('/docentes', { limit: 100 }).subscribe({
      next: (res) => {
        this.docentes = res?.data?.items ?? [];
        this.loadingDocentes = false;
      },
      error: () => {
        this.serviciosDisponibles.docentes = false;
        this.loadingDocentes = false;
      }
    });
  }

  cargarCatalogos(): void {
    // Cargar Cursos
    this.api.get<any>('/cursos', { limit: 100 }).subscribe({
      next: (res) => {
        this.todosCursos = res?.data?.items ?? [];
      },
      error: () => {
        this.serviciosDisponibles.cursos = false;
      }
    });

    // Cargar Ambientes
    this.api.get<any>('/ambientes', { limit: 100 }).subscribe({
      next: (res) => {
        this.todosAmbientes = res?.data?.items ?? [];
      },
      error: () => {
        this.serviciosDisponibles.ambientes = false;
      }
    });
  }

  seleccionarDocente(docente: Docente): void {
    this.docenteSeleccionado = docente;
    // Resetear listas locales ya que no hay endpoint para obtener asignaciones actuales
    this.cursosAsignados = [];
    this.ambientesAsignados = [];
  }

  agregarCurso(curso: Curso): void {
    if (!this.cursosAsignados.find(c => c.id === curso.id)) {
      this.cursosAsignados.push(curso);
 

    }
  }

  quitarCurso(id: number): void {
    this.cursosAsignados = this.cursosAsignados.filter(c => c.id !== id);


  }

  agregarAmbiente(ambiente: Ambiente): void {
    if (!this.ambientesAsignados.find(a => a.id === ambiente.id)) {
      this.ambientesAsignados.push(ambiente);

    }
  }

  quitarAmbiente(id: number): void {
    this.ambientesAsignados = this.ambientesAsignados.filter(a => a.id !== id);

  }

  getAvatarColor(name: string): string {
    const colors = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
