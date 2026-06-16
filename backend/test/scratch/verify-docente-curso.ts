import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../src/app.module";
import { DocentesService } from "../../src/docentes/docentes.service";
import { CategoriaDocente } from "../../src/common/enums/categoria-docente.enum";
import { TipoContrato } from "../../src/common/enums/tipo-contrato.enum";
import { TipoClase } from "../../src/common/enums/tipo-clase.enum";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { DocenteCurso } from "../../src/entities/docente-curso.entity";

async function verify() {
  console.log("=== INICIANDO VERIFICACIÓN DE DOCENTE-CURSO ===");
  const app = await NestFactory.createApplicationContext(AppModule);

  const docentesService = app.get(DocentesService);
  const docenteRepo: Repository<Docente> = app.get(getRepositoryToken(Docente));
  const cursoRepo: Repository<Curso> = app.get(getRepositoryToken(Curso));
  const docenteCursoRepo: Repository<DocenteCurso> = app.get(
    getRepositoryToken(DocenteCurso),
  );

  // 1. Limpiar registros previos de prueba si existen
  await docenteCursoRepo.createQueryBuilder().delete().execute();
  await docenteRepo.delete({ codigo: "T-DOC-99" });
  await cursoRepo.delete({ codigo: "T-CUR-99" });

  console.log("-> Registros previos limpiados.");

  // 2. Crear docente de prueba
  const docente = docenteRepo.create({
    codigo: "T-DOC-99",
    nombres: "Docente",
    apellidos: "Prueba Integracion",
    email: "docente.prueba.integracion@unt.edu.pe",
    telefono: "999999999",
    categoria: CategoriaDocente.AUXILIAR,
    tipo_contrato: TipoContrato.NOMBRADO,
    fecha_ingreso: new Date(),
    activo: true,
  });
  const savedDocente = await docenteRepo.save(docente);
  console.log(`-> Docente de prueba creado con ID: ${savedDocente.id}`);

  // 3. Crear curso de prueba
  const curso = cursoRepo.create({
    codigo: "T-CUR-99",
    nombre: "Curso Prueba Integracion",
    creditos: 3,
    horas_teoria: 2,
    horas_laboratorio: 2,
    ciclo: 5,
    tiene_laboratorio: true,
    activo: true,
  });
  const savedCurso = await cursoRepo.save(curso);
  console.log(`-> Curso de prueba creado con ID: ${savedCurso.id}`);

  // 4. Test POST/Asignar cursos (TEORIA y LABORATORIO)
  console.log("-> Asignando curso al docente (TEORIA y LABORATORIO)...");
  await docentesService.asignarCursos(savedDocente.id, {
    cursos: [
      { cursoId: savedCurso.id, tipo_clase: TipoClase.TEORIA },
      { cursoId: savedCurso.id, tipo_clase: TipoClase.LABORATORIO },
    ],
  });
  console.log("-> Asignación completada.");

  // 5. Test GET/Cursos habilitados
  console.log("-> Consultando todos los cursos habilitados...");
  const todos = await docentesService.findCursosHabilitados(savedDocente.id);
  console.log(`-> Total habilitados: ${todos.length}`);
  console.log(
    todos.map((t) => ({ curso: t.curso.nombre, tipo: t.tipo_clase })),
  );

  console.log("-> Consultando habilitados solo para LABORATORIO...");
  const laboratorios = await docentesService.findCursosHabilitados(
    savedDocente.id,
    TipoClase.LABORATORIO,
  );
  console.log(`-> Total laboratorios: ${laboratorios.length}`);
  expectTrue(
    laboratorios.length === 1,
    "Debe tener 1 curso de laboratorio habilitado",
  );
  console.log(
    laboratorios.map((t) => ({ curso: t.curso.nombre, tipo: t.tipo_clase })),
  );

  // 6. Test DELETE/Quitar asignación
  console.log("-> Quitando asignación de TEORIA...");
  await docentesService.removeAsignacion(
    savedDocente.id,
    savedCurso.id,
    TipoClase.TEORIA,
  );
  console.log("-> Asignación quitada.");

  console.log("-> Consultando nuevamente cursos habilitados...");
  const despuesDelete = await docentesService.findCursosHabilitados(
    savedDocente.id,
  );
  console.log(
    `-> Total habilitados después de delete: ${despuesDelete.length}`,
  );
  expectTrue(
    despuesDelete.length === 1,
    "Debe quedar solo 1 asignación activa",
  );
  console.log(
    despuesDelete.map((t) => ({ curso: t.curso.nombre, tipo: t.tipo_clase })),
  );

  // Limpieza final
  await docenteCursoRepo.createQueryBuilder().delete().execute();
  await docenteRepo.delete({ id: savedDocente.id });
  await cursoRepo.delete({ id: savedCurso.id });
  console.log("-> Registros de prueba eliminados.");

  console.log("=== VERIFICACIÓN COMPLETADA EXITOSAMENTE Y SIN ERRORES ===");
  await app.close();
}

function expectTrue(val: boolean, msg: string) {
  if (!val) {
    throw new Error("ERROR DE ASERCIÓN: " + msg);
  }
}

verify().catch((err) => {
  console.error("ERROR DURANTE LA VERIFICACIÓN:", err);
  process.exit(1);
});
