import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { CategoriaDocente } from "../../src/common/enums/categoria-docente.enum";
import { TipoContrato } from "../../src/common/enums/tipo-contrato.enum";

export class DatasetGenerador {
  private static rnd(): string {
    return Math.random().toString(36).substring(2, 6);
  }

  static generarDocentes(cantidad: number): Docente[] {
    const docentes: Docente[] = [];
    const categorias = Object.values(CategoriaDocente);
    const suffix = this.rnd();
    for (let i = 1; i <= cantidad; i++) {
      const d = new Docente();
      d.codigo = `D-${suffix}-${i}`.substring(0, 20);
      d.nombres = `Docente Test ${i}`;
      d.apellidos = `Apellido ${i}`;
      d.email = `doc${suffix}${i}@test.com`;
      d.categoria = categorias[i % categorias.length];
      d.tipo_contrato =
        i % 2 === 0 ? TipoContrato.NOMBRADO : TipoContrato.CONTRATADO;
      d.fecha_ingreso = new Date("2020-01-01");
      d.activo = true;
      docentes.push(d);
    }
    return docentes;
  }

  static generarCursos(cantidad: number): Curso[] {
    const cursos: Curso[] = [];
    const suffix = this.rnd();
    for (let i = 1; i <= cantidad; i++) {
      const c = new Curso();
      c.nombre = `Curso Test ${i}`;
      c.codigo = `C-${suffix}-${i}`.substring(0, 20);
      c.ciclo = (i % 10) + 1;
      c.creditos = (i % 4) + 1;
      c.horas_teoria = 2;
      c.horas_laboratorio = i % 3 === 0 ? 2 : 0;
      c.tiene_laboratorio = c.horas_laboratorio > 0;
      c.activo = true;
      cursos.push(c);
    }
    return cursos;
  }

  static generarAmbientes(cantidad: number): Ambiente[] {
    const ambientes: Ambiente[] = [];
    const suffix = this.rnd();
    for (let i = 1; i <= cantidad; i++) {
      const a = new Ambiente();
      a.codigo = `A-${suffix}-${i}`.substring(0, 20);
      a.nombre = `Ambiente ${i}`;
      a.tipo = i % 4 === 0 ? TipoAmbiente.LABORATORIO : TipoAmbiente.AULA;
      a.capacidad = 20 + (i % 30);
      a.activo = true;
      ambientes.push(a);
    }
    return ambientes;
  }

  static generarDisponibilidades(
    docentes: Docente[],
    periodo: string,
  ): DisponibilidadDocente[] {
    const disponibilidades: DisponibilidadDocente[] = [];
    for (const doc of docentes) {
      // Cada docente tiene disponibilidad de Lunes a Viernes de 08:00 a 18:00
      for (let dia = 1; dia <= 5; dia++) {
        const d = new DisponibilidadDocente();
        d.docente = doc;
        d.dia_semana = dia;
        d.hora_inicio = "08:00";
        d.hora_fin = "18:00";
        d.periodo_academico = periodo;
        d.disponible = true;
        disponibilidades.push(d);
      }
    }
    return disponibilidades;
  }

  static generarPeriodo(nombre: string): PeriodoAcademico {
    const p = new PeriodoAcademico();
    p.codigo = nombre; // Usar el nombre como código para simplificar
    p.nombre = nombre;
    p.activo = true;
    p.fecha_inicio = new Date("2026-03-01");
    p.fecha_fin = new Date("2026-07-31");
    return p;
  }
}
