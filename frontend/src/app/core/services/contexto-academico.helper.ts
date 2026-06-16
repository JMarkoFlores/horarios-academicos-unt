import { Injectable } from '@angular/core';
import { ContextoAcademico, Usuario } from '../interfaces/entities';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ContextoAcademicoHelper {
  constructor(private authService: AuthService) {}

  getContexto(): ContextoAcademico | null {
    return this.authService.getUsuarioActual()?.contextoAcademico ?? null;
  }

  veTodo(): boolean {
    return this.getContexto()?.verTodo ?? false;
  }

  getEtiquetaAlcance(usuario?: Usuario | null): string | null {
    const user = usuario ?? this.authService.getUsuarioActual();
    const ctx = user?.contextoAcademico;
    if (!ctx || ctx.verTodo) {
      return null;
    }

    if (ctx.departamentoNombre) {
      return `Departamento: ${ctx.departamentoNombre}`;
    }
    if (ctx.escuelaNombre) {
      return `Escuela: ${ctx.escuelaNombre}`;
    }
    if (ctx.facultadNombre) {
      return `Facultad: ${ctx.facultadNombre}`;
    }
    if (ctx.docenteId) {
      return 'Solo su perfil docente';
    }

    return 'Alcance restringido';
  }
}
