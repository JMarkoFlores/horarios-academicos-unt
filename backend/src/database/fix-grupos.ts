import { DataSource } from 'typeorm';
import { HorarioAsignado } from '../entities/horario-asignado.entity';
import { Grupo } from '../entities/grupo.entity';
import { Curso } from '../entities/curso.entity';

export async function fixGruposHorarios(dataSource: DataSource) {
  const horarioRepo = dataSource.getRepository(HorarioAsignado);
  const grupoRepo = dataSource.getRepository(Grupo);
  const cursoRepo = dataSource.getRepository(Curso);

  console.log('🔧 Actualizando grupos en horarios existentes...');

  // Obtener todos los horarios de laboratorio sin grupo_id
  const horariosSinGrupo = await horarioRepo.find({
    where: { tipo_clase: 'LABORATORIO' as any },
    relations: ['curso'],
  });

  console.log(`📊 Encontrados ${horariosSinGrupo.length} horarios de laboratorio sin grupo`);

  for (const horario of horariosSinGrupo) {
    // Buscar el primer grupo disponible para el curso
    const grupo = await grupoRepo.findOne({
      where: { curso_id: horario.curso_id },
      order: { id: 'ASC' }
    });

    if (grupo) {
      horario.grupo_id = grupo.id;
      await horarioRepo.save(horario);
      console.log(`✅ Actualizado horario ${horario.id} con grupo ${grupo.id} (${grupo.codigo})`);
    } else {
      console.log(`⚠️ No se encontró grupo para curso ${horario.curso_id}`);
    }
  }

  console.log('✅ Actualización completada');
}
