import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  guardando = false;
  
  serviciosDisponibles = {
    docentes: true,
    cursos: true,
    ambientes: true
  };

  diagnostico = {
    cargaHoraria: {
      titulo: 'Carga Horaria Semanal',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      horasAsignadas: 0,
      horasMaximas: 0,
      porcentaje: 0,
      mensaje: ''
    },
    preparaciones: {
      titulo: 'Preparaciones de Clase',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      cantidad: 0,
      limite: 3,
      mensaje: ''
    },
    compatibilidadLab: {
      titulo: 'Aulas y Laboratorios',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      mensaje: ''
    },
    disponibilidad: {
      titulo: 'Disponibilidad Horaria',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      horasDisponibles: 0,
      mensaje: ''
    },
    afinidadAcademica: {
      titulo: 'Afinidad y Nivel Académico',
      estado: 'VALIDATING' as 'OK' | 'WARNING' | 'ERROR' | 'VALIDATING',
      mensaje: ''
    }
  };

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

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
    this.cursosAsignados = [];
    this.ambientesAsignados = [];
    this.cargarCursosAsignados(docente.id);
  }

  cargarCursosAsignados(docenteId: number): void {
    this.loadingData = true;
    this.api.get<any>(`/docentes/${docenteId}/cursos`).subscribe({
      next: (res) => {
        const items = res?.data ?? [];
        const uniqueCursos: Curso[] = [];
        const seenIds = new Set<number>();
        for (const item of items) {
          if (item.curso && !seenIds.has(item.curso.id)) {
            seenIds.add(item.curso.id);
            uniqueCursos.push(item.curso);
          }
        }
        this.cursosAsignados = uniqueCursos;

        // Cargar también ambientes asignados desde el servidor
        this.api.get<any>(`/docentes/${docenteId}/ambientes`).subscribe({
          next: (ambRes) => {
            this.ambientesAsignados = ambRes?.data ?? [];
            this.loadingData = false;
            this.ejecutarDiagnostico();
          },
          error: () => {
            this.loadingData = false;
            this.ejecutarDiagnostico();
          }
        });
      },
      error: () => {
        this.loadingData = false;
        this.snackBar.open('Error al cargar cursos asignados', 'Cerrar', { duration: 3000 });
      }
    });
  }

  guardarAsignaciones(): void {
    if (!this.docenteSeleccionado) return;
    this.guardando = true;

    const cursosPayload: any[] = [];
    for (const curso of this.cursosAsignados) {
      cursosPayload.push({ cursoId: curso.id, tipo_clase: 'TEORIA' });
      if (curso.tiene_laboratorio) {
        cursosPayload.push({ cursoId: curso.id, tipo_clase: 'LABORATORIO' });
      }
    }

    // 1. Guardar asignaciones de cursos
    this.api.post<any>(`/docentes/${this.docenteSeleccionado.id}/cursos`, {
      cursos: cursosPayload
    }).subscribe({
      next: () => {
        // 2. Guardar asignaciones de ambientes de forma secuencial
        const ambienteIds = this.ambientesAsignados.map(a => a.id);
        this.api.post<any>(`/docentes/${this.docenteSeleccionado!.id}/ambientes`, {
          ambienteIds
        }).subscribe({
          next: () => {
            this.guardando = false;
            this.snackBar.open('Asignaciones y ambientes guardados correctamente', 'OK', { duration: 3000 });
            this.ejecutarDiagnostico();
          },
          error: (err) => {
            this.guardando = false;
            const msg = err?.error?.message ?? 'Error al guardar ambientes asignados';
            this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
          }
        });
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.message ?? 'Error al guardar cursos asignados';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  agregarCurso(curso: Curso): void {
    if (!this.cursosAsignados.find(c => c.id === curso.id)) {
      this.cursosAsignados.push(curso);
      this.ejecutarDiagnostico();
    }
  }

  quitarCurso(id: number): void {
    this.cursosAsignados = this.cursosAsignados.filter(c => c.id !== id);
    this.ejecutarDiagnostico();
  }

  agregarAmbiente(ambiente: Ambiente): void {
    if (!this.ambientesAsignados.find(a => a.id === ambiente.id)) {
      this.ambientesAsignados.push(ambiente);
      this.ejecutarDiagnostico();
    }
  }

  quitarAmbiente(id: number): void {
    this.ambientesAsignados = this.ambientesAsignados.filter(a => a.id !== id);
    this.ejecutarDiagnostico();
  }

  ejecutarDiagnostico(): void {
    if (!this.docenteSeleccionado) return;

    const docente = this.docenteSeleccionado;

    // 1. Carga Horaria Semanal
    let totalHoras = 0;
    for (const curso of this.cursosAsignados) {
      totalHoras += (curso.horas_teoria || 0) + (curso.horas_laboratorio || 0);
    }
    
    let maxHoras = 16;
    if (docente.tipo_contrato === 'NOMBRADO') {
      if (docente.categoria === 'PRINCIPAL' || docente.categoria === 'ASOCIADO') {
        maxHoras = 40;
      } else {
        maxHoras = 20;
      }
    }

    const cargaPorcentaje = Math.min(Math.round((totalHoras / maxHoras) * 100), 100);
    this.diagnostico.cargaHoraria = {
      titulo: 'Carga Horaria Semanal',
      horasAsignadas: totalHoras,
      horasMaximas: maxHoras,
      porcentaje: cargaPorcentaje,
      estado: totalHoras > maxHoras ? 'ERROR' : totalHoras === 0 ? 'WARNING' : 'OK',
      mensaje: totalHoras > maxHoras 
        ? `Excede la carga máxima permitida de ${maxHoras} hrs.`
        : totalHoras === 0 
          ? `Sin carga académica asignada.`
          : `${totalHoras} hrs asignadas de ${maxHoras} hrs máx.`
    };

    // 2. Preparaciones de Clase
    const cantCursos = this.cursosAsignados.length;
    const limiteCursos = 3;
    this.diagnostico.preparaciones = {
      titulo: 'Preparaciones de Clase',
      cantidad: cantCursos,
      limite: limiteCursos,
      estado: cantCursos > limiteCursos ? 'WARNING' : cantCursos === 0 ? 'WARNING' : 'OK',
      mensaje: cantCursos > limiteCursos
        ? `Dicta ${cantCursos} asignaturas (Recomendado máx: ${limiteCursos}).`
        : cantCursos === 0
          ? `Ningún curso asignado.`
          : `${cantCursos} cursos distintos asignados.`
    };

    // 3. Aulas y Laboratorios (Compatibilidad exacta con la ficha del curso)
    let conflictoCompatibilidad = false;
    let mensajeCompatibilidad = '';
    const requiereLab = this.cursosAsignados.some(c => c.tiene_laboratorio);
    const tieneLabAsignado = this.ambientesAsignados.some(a => a.tipo === 'LABORATORIO');

    if (requiereLab && !tieneLabAsignado) {
      conflictoCompatibilidad = true;
      mensajeCompatibilidad = 'Tiene cursos de laboratorio asignados pero no se ha asignado ningún ambiente tipo LABORATORIO.';
    } else {
      // Verificación detallada por curso
      for (const curso of this.cursosAsignados) {
        const ambientesCurso = curso.ambientes ?? [];
        
        if (ambientesCurso.length > 0) {
          const labsCompatibles = ambientesCurso.filter(a => a.tipo === 'LABORATORIO');
          const aulasCompatibles = ambientesCurso.filter(a => a.tipo === 'AULA');

          if (curso.tiene_laboratorio && labsCompatibles.length > 0) {
            const tieneLabValido = this.ambientesAsignados.some(a => labsCompatibles.some(lc => lc.id === a.id));
            if (!tieneLabValido) {
              conflictoCompatibilidad = true;
              const codigosLabs = labsCompatibles.map(l => l.codigo).join(', ');
              mensajeCompatibilidad = `Conflicto: ${curso.nombre} requiere uno de los laboratorios compatibles de su ficha: [${codigosLabs}].`;
              break;
            }
          }

          if (aulasCompatibles.length > 0) {
            const tieneAulaValida = this.ambientesAsignados.some(a => aulasCompatibles.some(ac => ac.id === a.id));
            if (!tieneAulaValida && this.ambientesAsignados.length > 0) {
              conflictoCompatibilidad = true;
              const codigosAulas = aulasCompatibles.map(ac => ac.codigo).join(', ');
              mensajeCompatibilidad = `Conflicto: ${curso.nombre} requiere una de las aulas de teoría compatibles de su ficha: [${codigosAulas}].`;
              break;
            }
          }
        }
      }
    }

    if (conflictoCompatibilidad) {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'ERROR',
        mensaje: mensajeCompatibilidad
      };
    } else if (this.cursosAsignados.length > 0 && this.ambientesAsignados.length === 0) {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'WARNING',
        mensaje: 'Sin aulas de teoría o laboratorios asignados.'
      };
    } else {
      this.diagnostico.compatibilidadLab = {
        titulo: 'Aulas y Laboratorios',
        estado: 'OK',
        mensaje: 'Ambientes asignados compatibles con los cursos dictados.'
      };
    }


    // 4. Disponibilidad Horaria
    let horasDisponibles = 0;
    if (docente.disponibilidades && docente.disponibilidades.length > 0) {
      for (const d of docente.disponibilidades) {
        if (d.disponible) {
          const hInicio = parseInt(d.hora_inicio.split(':')[0], 10);
          const hFin = parseInt(d.hora_fin.split(':')[0], 10);
          horasDisponibles += (hFin - hInicio);
        }
      }
    } else {
      horasDisponibles = 60; // Sin restricciones
    }

    if (horasDisponibles < totalHoras) {
      this.diagnostico.disponibilidad = {
        titulo: 'Disponibilidad Horaria',
        estado: 'ERROR',
        horasDisponibles,
        mensaje: `Horas de cursos (${totalHoras} hrs) superan sus horas disponibles semanales (${horasDisponibles} hrs).`
      };
    } else {
      this.diagnostico.disponibilidad = {
        titulo: 'Disponibilidad Horaria',
        estado: 'OK',
        horasDisponibles,
        mensaje: `Disponibilidad semanal de ${horasDisponibles} hrs es apta para los cursos asignados.`
      };
    }

    // 5. Afinidad y Nivel Académico
    const tieneCursosSuperiores = this.cursosAsignados.some(c => c.ciclo > 8);
    const esJunior = docente.categoria === 'JEFE_PRACTICA' || docente.categoria === 'AUXILIAR';

    if (esJunior && tieneCursosSuperiores) {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'WARNING',
        mensaje: `Docente ${docente.categoria} asignado a cursos de últimos ciclos (Ciclo > 8). Requiere supervisión.`
      };
    } else if (this.cursosAsignados.length > 0) {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'OK',
        mensaje: `Jerarquía docente (${docente.categoria}) adecuada para el nivel de asignaturas asignado.`
      };
    } else {
      this.diagnostico.afinidadAcademica = {
        titulo: 'Afinidad y Nivel Académico',
        estado: 'WARNING',
        mensaje: 'Sin asignaturas para validar nivel académico.'
      };
    }
  }

  getStatusIcon(estado: string): string {
    switch (estado) {
      case 'OK': return 'check_circle';
      case 'WARNING': return 'warning';
      case 'ERROR': return 'cancel';
      default: return 'hourglass_empty';
    }
  }

  getGlobalStatus(): string {
    if (!this.docenteSeleccionado) return 'SIN SELECCIÓN';
    const states = [
      this.diagnostico.cargaHoraria.estado,
      this.diagnostico.preparaciones.estado,
      this.diagnostico.compatibilidadLab.estado,
      this.diagnostico.disponibilidad.estado,
      this.diagnostico.afinidadAcademica.estado
    ];
    if (states.includes('ERROR')) return 'INCOMPATIBLE';
    if (states.includes('WARNING')) return 'ADVERTENCIA';
    return 'APTO';
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
