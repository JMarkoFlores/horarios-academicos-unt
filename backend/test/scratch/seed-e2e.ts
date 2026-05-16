import { DataSource } from "typeorm";
import { Usuario } from "../../src/entities/usuario.entity";
import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { Grupo } from "../../src/entities/grupo.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../../src/entities/conflicto-asignacion.entity";
import { ColaDocentes } from "../../src/entities/cola-docentes.entity";
import { DiaNoLaborable } from "../../src/entities/dia-no-laborable.entity";
import { NotificacionDocente } from "../../src/entities/notificacion-docente.entity";
import { Preasignacion } from "../../src/entities/preasignacion.entity";
import { PreferenciasNotificacion } from "../../src/entities/preferencias-notificacion.entity";
import { RestriccionInstitucional } from "../../src/entities/restriccion-institucional.entity";
import { SeleccionTemporal } from "../../src/entities/seleccion-temporal.entity";
import { VentanaAtencion } from "../../src/entities/ventana-atencion.entity";

import { RolUsuario } from "../../src/common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../../src/common/enums/categoria-docente.enum";
import { TipoContrato } from "../../src/common/enums/tipo-contrato.enum";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432"),
    username: process.env.DATABASE_USER || "unt_user",
    password: process.env.DATABASE_PASSWORD || "unt_pass",
    database: process.env.DATABASE_NAME || "horarios_unt",
    entities: [
      Usuario,
      Docente,
      Curso,
      Ambiente,
      PeriodoAcademico,
      Grupo,
      DisponibilidadDocente,
      HorarioAsignado,
      ConflictoAsignacion,
      ColaDocentes,
      DiaNoLaborable,
      NotificacionDocente,
      Preasignacion,
      PreferenciasNotificacion,
      RestriccionInstitucional,
      SeleccionTemporal,
      VentanaAtencion,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log("Database initialized");

  // Clear relevant tables
  const tables = [
    "usuario",
    "docente",
    "curso",
    "ambiente",
    "periodo_academico",
    "grupo",
    "disponibilidad_docente",
    "horario_asignado",
    "conflicto_asignacion",
  ];
  for (const t of tables) {
    await dataSource.query(`TRUNCATE "${t}" CASCADE`);
  }

  const userRepo = dataSource.getRepository(Usuario);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);
  const docenteRepo = dataSource.getRepository(Docente);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);

  // Users
  const pass = await bcrypt.hash("Admin123!", 10);
  await userRepo.save([
    {
      email: "admin@unitru.edu.pe",
      nombre: "Admin User",
      rol: RolUsuario.ADMIN,
      password_hash: pass,
      activo: true,
    },
  ]);

  // Period
  await periodoRepo.save({
    codigo: "2026-I",
    nombre: "Semestre 2026-I",
    fecha_inicio: new Date("2026-03-01"),
    fecha_fin: new Date("2026-07-31"),
    activo: true,
  });

  // Docentes
  const docs = await docenteRepo.save([
    {
      codigo: "D001",
      nombres: "Juan",
      apellidos: "Pérez",
      email: "juan.perez@unitru.edu.pe",
      categoria: CategoriaDocente.PRINCIPAL,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2020-01-01"),
      activo: true,
    },
    {
      codigo: "D002",
      nombres: "Maria",
      apellidos: "Sosa",
      email: "maria.sosa@unitru.edu.pe",
      categoria: CategoriaDocente.ASOCIADO,
      tipo_contrato: TipoContrato.NOMBRADO,
      fecha_ingreso: new Date("2020-01-01"),
      activo: true,
    },
  ]);

  // Cursos
  await cursoRepo.save([
    {
      codigo: "MAT1",
      nombre: "Matemática I",
      ciclo: 1,
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      tiene_laboratorio: true,
      activo: true,
    },
    {
      codigo: "PROG1",
      nombre: "Programación I",
      ciclo: 1,
      creditos: 4,
      horas_teoria: 2,
      horas_laboratorio: 2,
      tiene_laboratorio: true,
      activo: true,
    },
  ]);

  // Ambientes
  await ambienteRepo.save([
    {
      codigo: "A-101",
      nombre: "Aula 101",
      tipo: TipoAmbiente.AULA,
      capacidad: 40,
      activo: true,
    },
    {
      codigo: "L-101",
      nombre: "Laboratorio 101",
      tipo: TipoAmbiente.LABORATORIO,
      capacidad: 30,
      activo: true,
    },
  ]);

  console.log("Seed completed");
  await dataSource.destroy();
}

main().catch((err) => console.error(err));
