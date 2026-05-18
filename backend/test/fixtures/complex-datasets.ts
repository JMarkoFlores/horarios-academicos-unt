import { CategoriaDocente } from "../../src/common/enums/categoria-docente.enum";
import { TipoContrato } from "../../src/common/enums/tipo-contrato.enum";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";
import { RolUsuario } from "../../src/common/enums/rol-usuario.enum";

export interface ComplexTestData {
  users: any[];
  docentes: any[];
  cursos: any[];
  ambientes: any[];
  periodosAcademicos: any[];
  grupos: any[];
  disponibilidades: any[];
  preasignaciones: any[];
}

export class ComplexDatasetGenerator {
  /**
   * Generate a dataset designed to test teacher schedule overlaps
   */
  static generateTeacherOverlapDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
        {
          codigo: "D002",
          nombres: "María",
          apellidos: "García",
          email: "maria.garcia@unitru.edu.pe",
          categoria: CategoriaDocente.ASOCIADO,
          tipo_contrato: TipoContrato.CONTRATADO,
          fecha_ingreso: "2021-01-01",
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
        {
          codigo: "CS102",
          nombre: "Data Structures",
          ciclo: 2,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS101",
          activo: true,
        },
        {
          codigo: "CS103",
          nombre: "Algorithms",
          ciclo: 3,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS102",
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "AULA-102",
          nombre: "Aula 102",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "LAB-101",
          nombre: "Laboratorio 101",
          capacidad: 30,
          tipo: TipoAmbiente.LABORATORIO,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
        {
          codigo: "G-02",
          nombre: "Grupo 2",
          ciclo: 2,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        // Docente D001 available Monday 7-22, Tuesday 7-22
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        {
          docente_id: 1,
          dia_semana: 2,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        // Docente D002 available Monday 7-22, Tuesday 7-22
        {
          docente_id: 2,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        {
          docente_id: 2,
          dia_semana: 2,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
      ],
      preasignaciones: [],
    };
  }

  /**
   * Generate a dataset designed to test room overlaps
   */
  static generateRoomOverlapDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
        {
          codigo: "D002",
          nombres: "María",
          apellidos: "García",
          email: "maria.garcia@unitru.edu.pe",
          categoria: CategoriaDocente.ASOCIADO,
          tipo_contrato: TipoContrato.CONTRATADO,
          fecha_ingreso: "2021-01-01",
          activo: true,
        },
        {
          codigo: "D003",
          nombres: "Carlos",
          apellidos: "López",
          email: "carlos.lopez@unitru.edu.pe",
          categoria: CategoriaDocente.AUXILIAR,
          tipo_contrato: TipoContrato.CONTRATADO,
          fecha_ingreso: "2022-01-01",
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
        {
          codigo: "CS102",
          nombre: "Data Structures",
          ciclo: 2,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS101",
          activo: true,
        },
        {
          codigo: "CS103",
          nombre: "Algorithms",
          ciclo: 3,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS102",
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "AULA-102",
          nombre: "Aula 102",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
        {
          codigo: "G-02",
          nombre: "Grupo 2",
          ciclo: 2,
          cupo_maximo: 30,
        },
        {
          codigo: "G-03",
          nombre: "Grupo 3",
          ciclo: 3,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        // All teachers available Monday 7-22
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        {
          docente_id: 2,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        {
          docente_id: 3,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
      ],
      preasignaciones: [],
    };
  }

  /**
   * Generate a dataset designed to test capacity constraints
   */
  static generateCapacityConstraintDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-SMALL",
          nombre: "Aula Pequeña",
          capacidad: 20,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "AULA-LARGE",
          nombre: "Aula Grande",
          capacidad: 60,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-LARGE",
          nombre: "Grupo Grande",
          ciclo: 1,
          cupo_maximo: 50, // Exceeds small room capacity
        },
      ],
      disponibilidades: [
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
      ],
      preasignaciones: [],
    };
  }

  /**
   * Generate a dataset designed to test laboratory constraints
   */
  static generateLaboratoryConstraintDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
        {
          codigo: "MATH101",
          nombre: "Calculus I",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 4,
          horas_laboratorio: 0,
          tiene_laboratorio: false,
          prerequisitos: null,
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "LAB-101",
          nombre: "Laboratorio 101",
          capacidad: 30,
          tipo: TipoAmbiente.LABORATORIO,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
      ],
      preasignaciones: [],
    };
  }

  /**
   * Generate a dataset designed to test availability constraints
   */
  static generateAvailabilityConstraintDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "LAB-101",
          nombre: "Laboratorio 101",
          capacidad: 30,
          tipo: TipoAmbiente.LABORATORIO,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        // Teacher only available Monday 7-12 (limited availability)
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "12:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
      ],
      preasignaciones: [],
    };
  }

  /**
   * Generate a massive dataset for stress testing
   */
  static generateMassiveDataset(): ComplexTestData {
    const numDocentes = 50;
    const numCursos = 100;
    const numAmbientes = 30;
    const numGrupos = 80;

    const docentes = [];
    const cursos = [];
    const ambientes = [];
    const grupos = [];
    const disponibilidades = [];

    // Generate teachers
    for (let i = 1; i <= numDocentes; i++) {
      docentes.push({
        codigo: `D${String(i).padStart(3, "0")}`,
        nombres: `Docente${i}`,
        apellidos: `Apellido${i}`,
        email: `docente${i}@unitru.edu.pe`,
        categoria:
          i % 3 === 0
            ? CategoriaDocente.PRINCIPAL
            : i % 2 === 0
              ? CategoriaDocente.ASOCIADO
              : CategoriaDocente.AUXILIAR,
        tipo_contrato:
          i % 2 === 0 ? TipoContrato.NOMBRADO : TipoContrato.CONTRATADO,
        fecha_ingreso: "2020-01-01",
        activo: true,
      });

      // Generate availability for each teacher (all days, full range)
      for (let dia = 1; dia <= 5; dia++) {
        disponibilidades.push({
          docente_id: i,
          dia_semana: dia,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        });
      }
    }

    // Generate courses
    for (let i = 1; i <= numCursos; i++) {
      cursos.push({
        codigo: `CS${String(i).padStart(3, "0")}`,
        nombre: `Course ${i}`,
        ciclo: Math.ceil(i / 20),
        creditos: 4,
        horas_teoria: 2,
        horas_laboratorio: i % 2 === 0 ? 2 : 0,
        tiene_laboratorio: i % 2 === 0,
        prerequisitos: i > 1 ? `CS${String(i - 1).padStart(3, "0")}` : null,
        activo: true,
      });
    }

    // Generate environments
    for (let i = 1; i <= numAmbientes; i++) {
      ambientes.push({
        codigo:
          i <= 10
            ? `LAB-${String(i).padStart(3, "0")}`
            : `AULA-${String(i).padStart(3, "0")}`,
        nombre: i <= 10 ? `Laboratorio ${i}` : `Aula ${i}`,
        capacidad: 30 + (i % 3) * 10,
        tipo: i <= 10 ? TipoAmbiente.LABORATORIO : TipoAmbiente.AULA,
        activo: true,
      });
    }

    // Generate groups
    for (let i = 1; i <= numGrupos; i++) {
      grupos.push({
        codigo: `G-${String(i).padStart(2, "0")}`,
        nombre: `Grupo ${i}`,
        ciclo: Math.ceil(i / 20),
        cupo_maximo: 30 + (i % 5) * 5,
      });
    }

    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes,
      cursos,
      ambientes,
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos,
      disponibilidades,
      preasignaciones: [],
    };
  }

  /**
   * Generate a dataset with edge cases
   */
  static generateEdgeCaseDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01",
          activo: true,
        },
        {
          codigo: "D002",
          nombres: "María",
          apellidos: "García",
          email: "maria.garcia@unitru.edu.pe",
          categoria: CategoriaDocente.ASOCIADO,
          tipo_contrato: TipoContrato.CONTRATADO,
          fecha_ingreso: "2021-01-01",
          activo: false, // Inactive teacher
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
        {
          codigo: "CS102",
          nombre: "Data Structures",
          ciclo: 2,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS101",
          activo: false, // Inactive course
        },
        {
          codigo: "CS999",
          nombre: "Non-existent Prerequisite",
          ciclo: 3,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS888", // Non-existent prerequisite
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "AULA-102",
          nombre: "Aula 102",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: false, // Inactive environment
        },
        {
          codigo: "LAB-101",
          nombre: "Laboratorio 101",
          capacidad: 30,
          tipo: TipoAmbiente.LABORATORIO,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
        {
          codigo: "2026-II",
          nombre: "Semestre 2026-II",
          fecha_inicio: "2026-08-01",
          fecha_fin: "2026-12-31",
          activo: false,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
        {
          codigo: "G-02",
          nombre: "Grupo 2",
          ciclo: 2,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        {
          docente_id: 1,
          dia_semana: 1,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: true,
        },
        {
          docente_id: 1,
          dia_semana: 2,
          hora_inicio: "07:00",
          hora_fin: "22:00",
          periodo_academico: "2026-I",
          disponible: false, // Unavailable slot
        },
      ],
      preasignaciones: [
        {
          docente_id: 1,
          ambiente_id: 1,
          dia_semana: 1,
          hora_inicio: "10:00",
          hora_fin: "11:00",
          periodo_academico: "2026-I",
        },
      ],
    };
  }

  /**
   * Generate a dataset for testing academic priorities
   */
  static generateAcademicPriorityDataset(): ComplexTestData {
    return {
      users: [
        {
          email: "admin@unitru.edu.pe",
          nombre: "Admin User",
          rol: RolUsuario.ADMINISTRADOR_SISTEMA,
          password_hash: "$2b$10$hash",
          activo: true,
        },
      ],
      docentes: [
        {
          codigo: "D001",
          nombres: "Juan",
          apellidos: "Pérez",
          email: "juan.perez@unitru.edu.pe",
          categoria: CategoriaDocente.PRINCIPAL,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2015-01-01", // Senior
          activo: true,
        },
        {
          codigo: "D002",
          nombres: "María",
          apellidos: "García",
          email: "maria.garcia@unitru.edu.pe",
          categoria: CategoriaDocente.ASOCIADO,
          tipo_contrato: TipoContrato.NOMBRADO,
          fecha_ingreso: "2020-01-01", // Mid-level
          activo: true,
        },
        {
          codigo: "D003",
          nombres: "Carlos",
          apellidos: "López",
          email: "carlos.lopez@unitru.edu.pe",
          categoria: CategoriaDocente.AUXILIAR,
          tipo_contrato: TipoContrato.CONTRATADO,
          fecha_ingreso: "2023-01-01", // Junior
          activo: true,
        },
      ],
      cursos: [
        {
          codigo: "CS101",
          nombre: "Introduction to Computer Science",
          ciclo: 1,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: null,
          activo: true,
        },
        {
          codigo: "CS102",
          nombre: "Data Structures",
          ciclo: 2,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS101",
          activo: true,
        },
        {
          codigo: "CS103",
          nombre: "Algorithms",
          ciclo: 3,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS102",
          activo: true,
        },
        {
          codigo: "CS104",
          nombre: "Database Systems",
          ciclo: 4,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS103",
          activo: true,
        },
        {
          codigo: "CS105",
          nombre: "Software Engineering",
          ciclo: 5,
          creditos: 4,
          horas_teoria: 2,
          horas_laboratorio: 2,
          tiene_laboratorio: true,
          prerequisitos: "CS104",
          activo: true,
        },
      ],
      ambientes: [
        {
          codigo: "AULA-101",
          nombre: "Aula 101",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "AULA-102",
          nombre: "Aula 102",
          capacidad: 40,
          tipo: TipoAmbiente.AULA,
          activo: true,
        },
        {
          codigo: "LAB-101",
          nombre: "Laboratorio 101",
          capacidad: 30,
          tipo: TipoAmbiente.LABORATORIO,
          activo: true,
        },
      ],
      periodosAcademicos: [
        {
          codigo: "2026-I",
          nombre: "Semestre 2026-I",
          fecha_inicio: "2026-03-01",
          fecha_fin: "2026-07-31",
          activo: true,
        },
      ],
      grupos: [
        {
          codigo: "G-01",
          nombre: "Grupo 1",
          ciclo: 1,
          cupo_maximo: 30,
        },
        {
          codigo: "G-02",
          nombre: "Grupo 2",
          ciclo: 2,
          cupo_maximo: 30,
        },
        {
          codigo: "G-03",
          nombre: "Grupo 3",
          ciclo: 3,
          cupo_maximo: 30,
        },
        {
          codigo: "G-04",
          nombre: "Grupo 4",
          ciclo: 4,
          cupo_maximo: 30,
        },
        {
          codigo: "G-05",
          nombre: "Grupo 5",
          ciclo: 5,
          cupo_maximo: 30,
        },
      ],
      disponibilidades: [
        // All teachers available all days
        ...[1, 2, 3].flatMap((docenteId) =>
          [1, 2, 3, 4, 5].map((dia) => ({
            docente_id: docenteId,
            dia_semana: dia,
            hora_inicio: "07:00",
            hora_fin: "22:00",
            periodo_academico: "2026-I",
            disponible: true,
          })),
        ),
      ],
      preasignaciones: [],
    };
  }
}
