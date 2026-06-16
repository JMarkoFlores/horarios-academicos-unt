import { Usuario } from "../../entities/usuario.entity";

export interface ContextoAcademico {
  verTodo: boolean;
  facultadId: number | null;
  escuelaId: number | null;
  departamentoIds: number[];
  docenteId: number | null;
  departamentoNombre?: string | null;
  facultadNombre?: string | null;
  escuelaNombre?: string | null;
}

export type UsuarioAutenticado = Usuario & {
  docenteId?: number | null;
  contextoAcademico?: ContextoAcademico;
};
