
import { DisponibilidadDocente } from '../entities/disponibilidad-docente.entity';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { Docente } from '../entities/docente.entity';
import { PeriodoAcademico } from '../entities/periodo-academico.entity';
import { generarSlotsDesdeTurno } from './seed-turnos';

export async function seedDisponibilidadesDocentes(
  disponibilidadRepo: any,
  docenteRepo: any,
  horarioRepo: any,
  turnoConfigRepo: any,
  periodoActivo: PeriodoAcademico,
): Promise<void> {
  const docentes = await docenteRepo.find({ where: { activo: true } });
  const turnos = await turnoConfigRepo.find({ where: { activo: true } });

  let totalSlots = 0;
  let docentesConDisponibilidad = 0;

  for (const docente of docentes) {
    // Delete existing disponibilidad for this periodo
    await disponibilidadRepo.delete({
      docente: { id: docente.id },
      periodo_academico: periodoActivo.codigo,
    });

    // Get all horarios assigned to this docente in current periodo
    const horariosDocente = await horarioRepo.find({
      where: {
        docente_id: docente.id,
        periodo: periodoActivo.codigo,
      },
    });

    // Create a helper to check if a slot is already covered by a horario
    const horarioSlots = new Set<string>();
    for (const h of horariosDocente) {
      // Normalize hora_inicio and hora_fin to HH:MM (strip seconds)
      const start = h.hora_inicio.slice(0, 5);
      const end = h.hora_fin.slice(0, 5);
      
      // Generate all 1hr slots in this horario range
      let [hStart, mStart] = start.split(':').map(Number);
      let [hEnd, mEnd] = end.split(':').map(Number);
      
      // Convert to total minutes
      let current = hStart * 60 + mStart;
      const endTotal = hEnd * 60 + mEnd;
      
      while (current < endTotal) {
        const slotStart = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((current + 60) / 60)).padStart(2, '0')}:${String((current + 60) % 60).padStart(2, '0')}`;
        
        horarioSlots.add(`${h.dia}|${slotStart}|${slotEnd}`);
        current += 60;
      }
    }

    // Assign turnos based on their horarios, or default to 1-2 random turnos if no horarios
    let turnosAsignados;
    if (horariosDocente.length > 0) {
      // Determine which turnos their horarios fall into
      turnosAsignados = turnos.filter(turno => {
        const [tStart, tEnd] = [turno.hora_inicio, turno.hora_fin];
        const [tHStart, tMStart] = tStart.split(':').map(Number);
        const [tHEnd, tMEnd] = tEnd.split(':').map(Number);
        const tStartTotal = tHStart * 60 + tMStart;
        const tEndTotal = tHEnd * 60 + tMEnd;
        
        // Check if any horario of the docente falls within this turno
        return horariosDocente.some(h => {
          const [hHStart, hMStart] = h.hora_inicio.slice(0,5).split(':').map(Number);
          const hStartTotal = hHStart * 60 + hMStart;
          
          return hStartTotal >= tStartTotal && hStartTotal < tEndTotal;
        });
      });
      
      if (turnosAsignados.length === 0) {
        turnosAsignados = turnos.slice(0, 2); // Fallback
      }
    } else {
      // No horarios, use 1-2 random turnos
      turnosAsignados = turnos
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 1);
    }

    for (const turno of turnosAsignados) {
      const slots = generarSlotsDesdeTurno(turno);
      
      for (const slot of slots) {
        // Always mark slot as available (teachers are available during their teaching hours too)
        await disponibilidadRepo.save(
          disponibilidadRepo.create({
            docente: { id: docente.id },
            periodo_academico: periodoActivo.codigo,
            dia_semana: slot.dia_semana,
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            disponible: true,
          }),
        );
        totalSlots++;
      }
    }
    docentesConDisponibilidad++;
  }

  console.log(`✅ ${totalSlots} slots de disponibilidad generados para ${docentesConDisponibilidad} docentes`);
}
