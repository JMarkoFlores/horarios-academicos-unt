import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import { Usuario } from "../entities/usuario.entity";
import { Docente } from "../entities/docente.entity";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TurnoHorario } from "../entities/turno-horario.entity";
import { Facultad } from "../entities/facultad.entity";
import { Escuela } from "../entities/escuela.entity";
import { Departamento } from "../entities/departamento.entity";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { CategoriaDocente } from "../common/enums/categoria-docente.enum";
import { TipoContrato } from "../common/enums/tipo-contrato.enum";
import { TipoDocente } from "../common/enums/tipo-docente.enum";
import { ModalidadDocente } from "../common/enums/modalidad-docente.enum";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";
import { EstadoPeriodo } from "../common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../common/enums/modo-asignacion.enum";

export async function seed(dataSource: DataSource): Promise<void> {
  const usuarioRepo = dataSource.getRepository(Usuario);
  const docenteRepo = dataSource.getRepository(Docente);
  const periodoRepo = dataSource.getRepository(PeriodoAcademico);
  const cursoRepo = dataSource.getRepository(Curso);
  const ambienteRepo = dataSource.getRepository(Ambiente);
  const turnoRepo = dataSource.getRepository(TurnoHorario);
  const facultadRepo = dataSource.getRepository(Facultad);
  const escuelaRepo = dataSource.getRepository(Escuela);
  const departamentoRepo = dataSource.getRepository(Departamento);

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  // Usuarios del sistema
  const usuariosSistema = [
    { nombre: "Administrador del Sistema", email: "admin@unt.edu.pe", rol: RolUsuario.ADMINISTRADOR_SISTEMA },
    { nombre: "Director de Escuela", email: "director@unt.edu.pe", rol: RolUsuario.DIRECTOR_ESCUELA },
    { nombre: "Director de Departamento", email: "director.departamento@unt.edu.pe", rol: RolUsuario.DIRECTOR_DEPARTAMENTO },
    { nombre: "Coordinador Académico", email: "coordinador@unt.edu.pe", rol: RolUsuario.COORDINADOR_ACADEMICO },
    { nombre: "Decano", email: "decano@unt.edu.pe", rol: RolUsuario.DECANO },
    { nombre: "Secretaria", email: "secretaria@unt.edu.pe", rol: RolUsuario.SECRETARIA },
    { nombre: "Operador de Horarios", email: "operador@unt.edu.pe", rol: RolUsuario.OPERADOR_HORARIOS },
  ];
  for (const u of usuariosSistema) {
    await usuarioRepo.save(usuarioRepo.create({ ...u, password_hash: passwordHash, activo: true }));
  }

  // Turnos
  await turnoRepo.save([
    turnoRepo.create({ nombre: "Mañana", hora_inicio: "07:00", hora_fin: "14:00", activo: true }),
    turnoRepo.create({ nombre: "Tarde", hora_inicio: "14:00", hora_fin: "23:00", activo: true }),
  ]);

  // Períodos académicos
  const periodos = await periodoRepo.save([
    periodoRepo.create({ codigo: "2025-I", nombre: "Semestre 2025-I", fecha_inicio: new Date("2025-03-16"), fecha_fin: new Date("2025-07-31"), estado: EstadoPeriodo.FINALIZADO, activo: false, modo_asignacion: ModoAsignacion.VENTANAS }),
    periodoRepo.create({ codigo: "2025-II", nombre: "Semestre 2025-II", fecha_inicio: new Date("2025-08-16"), fecha_fin: new Date("2025-12-20"), estado: EstadoPeriodo.FINALIZADO, activo: false, modo_asignacion: ModoAsignacion.AUTOMATICA }),
    periodoRepo.create({ codigo: "2026-I", nombre: "Semestre 2026-I", fecha_inicio: new Date("2026-03-16"), fecha_fin: new Date("2026-07-31"), estado: EstadoPeriodo.EN_CURSO, activo: true, modo_asignacion: ModoAsignacion.MIXTA }),
  ]);
  const periodoActivo = periodos.find((p) => p.codigo === "2026-I")!;

  // Facultad, escuela y departamento base
  const facultad = await facultadRepo.save(facultadRepo.create({ nombre: "Facultad de Ingeniería", codigo: "FI", activo: true }));
  const escuela = await escuelaRepo.save(escuelaRepo.create({ nombre: "Ingeniería de Sistemas", codigo: "IS", activo: true, facultad }));
  const departamento = await departamentoRepo.save(departamentoRepo.create({ nombre: "Depto. de Sistemas", codigo: "DS", activo: true, escuela }));

  // Ambientes
  await ambienteRepo.save([
    ambienteRepo.create({ codigo: "A-301", nombre: "Posgrado A-301", tipo: TipoAmbiente.AULA, capacidad: 30, piso: 3, pabellon: "A", activo: true }),
    ambienteRepo.create({ codigo: "LAB-1", nombre: "Lab. 1", tipo: TipoAmbiente.LABORATORIO, capacidad: 30, piso: 1, pabellon: "B", activo: true }),
    ambienteRepo.create({ codigo: "LAB-2", nombre: "Lab. 2", tipo: TipoAmbiente.LABORATORIO, capacidad: 30, piso: 1, pabellon: "B", activo: true }),
  ]);

  // Docentes y sus usuarios
  const docentesData = [
    { nombres: "Marcelino", apellidos: "Torres Villanueva", codigo: "DOC001" },
    { nombres: "Alberto", apellidos: "Mendoza de los Santos", codigo: "DOC002" },
    { nombres: "Paul", apellidos: "Cotrina Castellanos", codigo: "DOC003" },
    { nombres: "Bertha", apellidos: "Urtecho Zavaleta", codigo: "DOC004" },
    { nombres: "Jose Luis", apellidos: "Ponte Bejarano", codigo: "DOC005" },
  ];
  const modalidadesPool = [ModalidadDocente.DEDICACION_EXCLUSIVA, ModalidadDocente.TIEMPO_COMPLETO_40, ModalidadDocente.TIEMPO_PARCIAL_20];
  for (let i = 0; i < docentesData.length; i++) {
    const dd = docentesData[i];
    const d = await docenteRepo.save(docenteRepo.create({
      codigo: dd.codigo, nombres: dd.nombres, apellidos: dd.apellidos,
      email: `${dd.nombres.toLowerCase().replace(/\s+/g, ".")}.${dd.apellidos.toLowerCase().replace(/\s+/g, ".")}@unt.edu.pe`,
      categoria: CategoriaDocente.PRINCIPAL, tipo_docente: TipoDocente.ORDINARIO,
      tipo_contrato: TipoContrato.NOMBRADO, modalidad: modalidadesPool[i % modalidadesPool.length],
      fecha_ingreso: new Date(2005, 0, 1), activo: true,
    }));
    const usuarioDocente = await usuarioRepo.save(usuarioRepo.create({
      nombre: `${d.nombres} ${d.apellidos}`, email: d.email,
      password_hash: passwordHash, rol: RolUsuario.DOCENTE, activo: true,
    }));
    await docenteRepo.update(d.id, {
      usuario_id: usuarioDocente.id,
      departamento_id: departamento.id,
      facultad_id: facultad.id,
    });
  }

  // Cursos base
  await cursoRepo.save([
    cursoRepo.create({ codigo: "EE-101", nombre: "Introducción a la Ingeniería de Sistemas", creditos: 2, horas_teoria: 1, horas_practica: 2, horas_laboratorio: 0, ciclo: 1, tiene_laboratorio: false, activo: true }),
    cursoRepo.create({ codigo: "EE-102", nombre: "Introducción a la Programación", creditos: 3, horas_teoria: 2, horas_practica: 0, horas_laboratorio: 2, ciclo: 1, tiene_laboratorio: true, activo: true }),
    cursoRepo.create({ codigo: "EE-201", nombre: "Programación Orientada a Objetos I", creditos: 4, horas_teoria: 2, horas_practica: 0, horas_laboratorio: 4, ciclo: 2, tiene_laboratorio: true, activo: true }),
    cursoRepo.create({ codigo: "EE-301", nombre: "Sistémica", creditos: 3, horas_teoria: 2, horas_practica: 1, horas_laboratorio: 2, ciclo: 3, tiene_laboratorio: true, activo: true }),
    cursoRepo.create({ codigo: "EE-401", nombre: "Diseño Web", creditos: 3, horas_teoria: 1, horas_practica: 0, horas_laboratorio: 3, ciclo: 4, tiene_laboratorio: true, activo: true }),
  ]);

  console.log(`✅ Seed auto completado. Período activo: ${periodoActivo.codigo}`);
}
