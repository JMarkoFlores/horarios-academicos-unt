
import { TurnoConfig } from '../entities/turno-config.entity';

export async function seedTurnosPorDefecto(turnoConfigRepo: any): Promise<void> {
  const turnosDefault = [
    {
      nombre: 'Mañana',
      tipo: 'MANANA',
      hora_inicio: '07:00',
      hora_fin: '13:00',
      intervalo_minutos: 60,
      dias_habilitados: [1, 2, 3, 4, 5],
      activo: true,
      descripcion: 'Turno mañana (07:00 - 13:00)',
    },
    {
      nombre: 'Tarde',
      tipo: 'TARDE',
      hora_inicio: '13:00',
      hora_fin: '18:00',
      intervalo_minutos: 60,
      dias_habilitados: [1, 2, 3, 4, 5],
      activo: true,
      descripcion: 'Turno tarde (13:00 - 18:00)',
    },
    {
      nombre: 'Noche',
      tipo: 'NOCHE',
      hora_inicio: '18:00',
      hora_fin: '22:00',
      intervalo_minutos: 60,
      dias_habilitados: [1, 2, 3, 4, 5],
      activo: true,
      descripcion: 'Turno noche (18:00 - 22:00)',
    },
  ];

  for (const turno of turnosDefault) {
    await turnoConfigRepo.save(turnoConfigRepo.create(turno));
  }

  console.log(`✅ ${turnosDefault.length} turnos por defecto inicializados`);
}

export function generarSlotsDesdeTurno(turno: any): any[] {
  const slots: any[] = [];
  const dias = turno.dias_habilitados || [1, 2, 3, 4, 5];

  const [horaInicio, minInicio] = turno.hora_inicio.split(':').map(Number);
  const [horaFin, minFin] = turno.hora_fin.split(':').map(Number);

  const inicioMinutos = horaInicio * 60 + minInicio;
  const finMinutos = horaFin * 60 + minFin;
  const intervalo = turno.intervalo_minutos || 60;

  for (const dia of dias) {
    for (let minutos = inicioMinutos; minutos < finMinutos; minutos += intervalo) {
      const hInicio = Math.floor(minutos / 60);
      const mInicio = minutos % 60;
      const hFin = Math.floor((minutos + intervalo) / 60);
      const mFin = (minutos + intervalo) % 60;

      slots.push({
        dia_semana: dia,
        hora_inicio: `${hInicio.toString().padStart(2, '0')}:${mInicio.toString().padStart(2, '0')}`,
        hora_fin: `${hFin.toString().padStart(2, '0')}:${mFin.toString().padStart(2, '0')}`,
      });
    }
  }

  return slots;
}
