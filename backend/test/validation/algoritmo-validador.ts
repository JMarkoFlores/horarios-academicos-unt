import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";
import { TipoClase } from "../../src/common/enums/tipo-clase.enum";

export interface ReporteValidacion {
  valido: boolean;
  errores: string[];
  estadisticas: {
    total_asignaciones: number;
    cruces_docente: number;
    cruces_ambiente: number;
    fuera_disponibilidad: number;
    tipo_ambiente_incorrecto: number;
    fuera_franja: number;
  };
}

export class AlgoritmoValidador {
  private toMin(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  private solapan(s1: string, e1: string, s2: string, e2: string): boolean {
    return this.toMin(s1) < this.toMin(e2) && this.toMin(e1) > this.toMin(s2);
  }

  validar(
    asignaciones: HorarioAsignado[],
    disponibilidades: DisponibilidadDocente[],
  ): ReporteValidacion {
    const reporte: ReporteValidacion = {
      valido: true,
      errores: [],
      estadisticas: {
        total_asignaciones: asignaciones.length,
        cruces_docente: 0,
        cruces_ambiente: 0,
        fuera_disponibilidad: 0,
        tipo_ambiente_incorrecto: 0,
        fuera_franja: 0,
      },
    };

    for (let i = 0; i < asignaciones.length; i++) {
      const a1 = asignaciones[i];

      // 1. Franja institucional (07:00 - 22:00)
      const inicio = this.toMin(a1.hora_inicio);
      const fin = this.toMin(a1.hora_fin);
      if (inicio < 7 * 60 || fin > 22 * 60) {
        reporte.errores.push(
          `ID ${a1.id}: Fuera de franja institucional (${a1.hora_inicio}-${a1.hora_fin})`,
        );
        reporte.estadisticas.fuera_franja++;
      }

      // 2. Cruces de Docente y Ambiente
      for (let j = i + 1; j < asignaciones.length; j++) {
        const a2 = asignaciones[j];
        if (
          a1.dia_semana === a2.dia_semana &&
          this.solapan(a1.hora_inicio, a1.hora_fin, a2.hora_inicio, a2.hora_fin)
        ) {
          // Cruce Docente
          if (a1.docente?.id === a2.docente?.id) {
            reporte.errores.push(
              `Cruce Docente (ID:${a1.docente?.id}): Asignación ${i} y ${j} el día ${a1.dia_semana}`,
            );
            reporte.estadisticas.cruces_docente++;
          }
          // Cruce Ambiente
          if (a1.ambiente?.id === a2.ambiente?.id) {
            reporte.errores.push(
              `Cruce Ambiente (ID:${a1.ambiente?.id}): Asignación ${i} y ${j} el día ${a1.dia_semana}`,
            );
            reporte.estadisticas.cruces_ambiente++;
          }
        }
      }

      // 3. Disponibilidad Docente
      const dispDoc = disponibilidades.filter(
        (d) =>
          d.docente?.id === a1.docente?.id && d.dia_semana === a1.dia_semana,
      );
      const estaDisponible = dispDoc.some(
        (d) =>
          this.toMin(d.hora_inicio) <= inicio && this.toMin(d.hora_fin) >= fin,
      );
      if (!estaDisponible) {
        reporte.errores.push(
          `ID ${a1.id}: Docente ${a1.docente?.id} no tiene disponibilidad el día ${a1.dia_semana} en ${a1.hora_inicio}-${a1.hora_fin}`,
        );
        reporte.estadisticas.fuera_disponibilidad++;
      }

      // 4. Tipo de Ambiente (Laboratorio vs Aula)
      if (a1.curso) {
        if (
          a1.tipo_clase === TipoClase.LABORATORIO &&
          a1.ambiente?.tipo !== TipoAmbiente.LABORATORIO
        ) {
          reporte.errores.push(
            `ID ${a1.id}: Clase de LABORATORIO asignada a un ambiente de tipo ${a1.ambiente?.tipo}`,
          );
          reporte.estadisticas.tipo_ambiente_incorrecto++;
        }
        if (
          a1.tipo_clase === TipoClase.TEORIA &&
          a1.ambiente?.tipo !== TipoAmbiente.AULA
        ) {
          reporte.errores.push(
            `ID ${a1.id}: Clase de TEORIA asignada a un ambiente de tipo ${a1.ambiente?.tipo}`,
          );
          reporte.estadisticas.tipo_ambiente_incorrecto++;
        }
      }
    }

    reporte.valido = reporte.errores.length === 0;
    return reporte;
  }

  explicarConflictos(reporte: ReporteValidacion): string {
    if (reporte.valido)
      return "✅ No se encontraron conflictos en la asignación.";

    let explicacion = `❌ Se encontraron ${reporte.errores.length} violaciones de restricciones:\n`;
    explicacion += `- Cruces de docente: ${reporte.estadisticas.cruces_docente}\n`;
    explicacion += `- Cruces de ambiente: ${reporte.estadisticas.cruces_ambiente}\n`;
    explicacion += `- Violaciones de disponibilidad: ${reporte.estadisticas.fuera_disponibilidad}\n`;
    explicacion += `- Tipos de ambiente incorrectos: ${reporte.estadisticas.tipo_ambiente_incorrecto}\n`;
    explicacion += `- Fuera de franja horaria: ${reporte.estadisticas.fuera_franja}\n`;
    explicacion +=
      `\nDetalle de errores:\n` + reporte.errores.slice(0, 20).join("\n");
    if (reporte.errores.length > 20)
      explicacion += `\n... y ${reporte.errores.length - 20} errores más.`;

    return explicacion;
  }
}
