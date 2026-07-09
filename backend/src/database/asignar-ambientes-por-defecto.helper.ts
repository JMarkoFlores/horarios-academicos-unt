import { EntityManager } from "typeorm";
import { Curso } from "../entities/curso.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { TipoAmbiente } from "../common/enums/tipo-ambiente.enum";

/**
 * Asigna ambientes por defecto a todos los cursos activos que no los tengan.
 *
 * Reglas:
 * - Cursos con horas de teoría o práctica > 0 reciben todos los ambientes
 *   AULA y TALLER disponibles.
 * - Cursos con horas de laboratorio > 0 reciben todos los ambientes LABORATORIO.
 *
 * No sobrescribe ambientes ya asignados; solo completa los faltantes.
 */
export async function asignarAmbientesPorDefecto(
  manager: EntityManager,
): Promise<{ cursosProcesados: number; relacionesCreadas: number }> {
  const cursoRepo = manager.getRepository(Curso);
  const ambienteRepo = manager.getRepository(Ambiente);

  const cursos = await cursoRepo.find({ where: { activo: true } });
  const ambientes = await ambienteRepo.find({ where: { activo: true } });

  const aulasTaller = ambientes.filter(
    (a) => a.tipo === TipoAmbiente.AULA || a.tipo === TipoAmbiente.TALLER,
  );
  const laboratorios = ambientes.filter(
    (a) => a.tipo === TipoAmbiente.LABORATORIO,
  );

  let relacionesCreadas = 0;

  for (const curso of cursos) {
    const cursoConAmbientes = await cursoRepo.findOne({
      where: { id: curso.id },
      relations: ["ambientes"],
    });
    if (!cursoConAmbientes) continue;

    const actuales = cursoConAmbientes.ambientes ?? [];
    const idsActuales = new Set(actuales.map((a) => a.id));
    const ambientesAAgregar: Ambiente[] = [];

    const necesitaTeoriaPractica =
      (curso.horas_teoria || 0) > 0 || (curso.horas_practica || 0) > 0;
    const necesitaLaboratorio = (curso.horas_laboratorio || 0) > 0;

    if (necesitaTeoriaPractica) {
      for (const a of aulasTaller) {
        if (!idsActuales.has(a.id)) {
          ambientesAAgregar.push(a);
          idsActuales.add(a.id);
        }
      }
    }

    if (necesitaLaboratorio) {
      for (const a of laboratorios) {
        if (!idsActuales.has(a.id)) {
          ambientesAAgregar.push(a);
          idsActuales.add(a.id);
        }
      }
    }

    if (ambientesAAgregar.length > 0) {
      cursoConAmbientes.ambientes = [...actuales, ...ambientesAAgregar];
      await cursoRepo.save(cursoConAmbientes);
      relacionesCreadas += ambientesAAgregar.length;
    }
  }

  console.log(
    `✅ Ambientes por defecto asignados: ${relacionesCreadas} relaciones en ${cursos.length} cursos`,
  );

  return { cursosProcesados: cursos.length, relacionesCreadas };
}
