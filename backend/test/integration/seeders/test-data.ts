import * as bcrypt from "bcrypt";
import { RolUsuario } from "../../../src/common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../../../src/common/enums/categoria-docente.enum";
import { TipoContrato } from "../../../src/common/enums/tipo-contrato.enum";
import { TipoAmbiente } from "../../../src/common/enums/tipo-ambiente.enum";

export const testUsers = [
  {
    email: "admin@unitru.edu.pe",
    nombre: "Admin User",
    rol: RolUsuario.ADMIN,
    password: "Admin123!",
    activo: true,
  },
  {
    email: "coordinador@unitru.edu.pe",
    nombre: "Coordinador User",
    rol: RolUsuario.COORDINADOR,
    password: "Coord123!",
    activo: true,
  },
  {
    email: "operador@unitru.edu.pe",
    nombre: "Operador User",
    rol: RolUsuario.OPERADOR,
    password: "Oper123!",
    activo: true,
  },
];

export const testDocentes = [
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
];

export const testCursos = [
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
];

export const testAmbientes = [
  {
    codigo: "LAB-101",
    nombre: "Laboratorio 101",
    capacidad: 30,
    tipo: TipoAmbiente.LABORATORIO,
    activo: true,
  },
  {
    codigo: "AULA-201",
    nombre: "Aula 201",
    capacidad: 40,
    tipo: TipoAmbiente.AULA,
    activo: true,
  },
];

export const testPeriodosAcademicos = [
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
];

export const testGrupos = [
  {
    codigo: "G-01",
    nombre: "Grupo 1",
    ciclo: 1,
    cupo_maximo: 30,
  },
  {
    codigo: "G-02",
    nombre: "Grupo 2",
    ciclo: 1,
    cupo_maximo: 30,
  },
];

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function getSeededData() {
  return {
    users: await Promise.all(
      testUsers.map(async (user) => ({
        ...user,
        password_hash: await hashPassword(user.password),
      })),
    ),
    docentes: testDocentes,
    cursos: testCursos,
    ambientes: testAmbientes,
    periodosAcademicos: testPeriodosAcademicos,
    grupos: testGrupos,
  };
}
