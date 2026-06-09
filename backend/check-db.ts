
import AppDataSource from "./data-source";
import { HorarioAsignado } from "./src/entities/horario-asignado.entity";
import { Docente } from "./src/entities/docente.entity";
import { PeriodoAcademico } from "./src/entities/periodo-academico.entity";

async function check() {
  await AppDataSource.initialize();
  const docente = await AppDataSource.getRepository(Docente).findOne({
    where: { apellidos: "Agreda Gamboa" }
  });
  
  if (!docente) {
    console.log("❌ Docente no encontrado");
    return;
  }
  
  console.log(`✅ Docente encontrado: ${docente.nombres} ${docente.apellidos} (ID: ${docente.id})`);
  
  const horarios = await AppDataSource.getRepository(HorarioAsignado).find({
    where: { docente_id: docente.id }
  });
  
  console.log(`📅 Horarios encontrados para este docente: ${horarios.length}`);
  horarios.forEach(h => {
    console.log(`- Periodo: '${h.periodo}', Curso ID: ${h.curso_id}, Grupo ID: ${h.grupo_id}`);
  });

  const periodos = await AppDataSource.getRepository(PeriodoAcademico).find();
  console.log("⏱️ Periodos en DB:");
  periodos.forEach(p => {
    console.log(`- ID: ${p.id}, Codigo: '${p.codigo}', Activo: ${p.activo}`);
  });
  
  await AppDataSource.destroy();
}

check();
