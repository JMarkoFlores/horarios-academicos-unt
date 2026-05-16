import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppModule } from "../../src/app.module";
import { testDbConfig } from "./test-config";
import { Usuario } from "../../src/entities/usuario.entity";
import { Docente } from "../../src/entities/docente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { Grupo } from "../../src/entities/grupo.entity";
import { PeriodoAcademico } from "../../src/entities/periodo-academico.entity";
import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../../src/entities/conflicto-asignacion.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { ColaDocentes } from "../../src/entities/cola-docentes.entity";
import { DiaNoLaborable } from "../../src/entities/dia-no-laborable.entity";
import { NotificacionDocente } from "../../src/entities/notificacion-docente.entity";
import { Preasignacion } from "../../src/entities/preasignacion.entity";
import { PreferenciasNotificacion } from "../../src/entities/preferencias-notificacion.entity";
import { RestriccionInstitucional } from "../../src/entities/restriccion-institucional.entity";
import { SeleccionTemporal } from "../../src/entities/seleccion-temporal.entity";
import { VentanaAtencion } from "../../src/entities/ventana-atencion.entity";
import { DataSource } from "typeorm";

// Limpia todas las tablas relevantes antes de cada test
// Elimina en orden inverso de dependencias (hijas primero, padres después)
export async function clearDatabase(app: INestApplication) {
  const dataSource = app.get(DataSource);

  const tablesInOrder = [
    "horario_asignado",
    "conflicto_asignacion",
    "disponibilidad_docente",
    "cola_docentes",
    "dia_no_laborable",
    "notificacion_docente",
    "preasignacion",
    "preferencias_notificacion",
    "restriccion_institucional",
    "seleccion_temporal",
    "ventana_atencion",
    "grupo",
    "curso_ambiente",
    "curso",
    "docente",
    "ambiente",
    "periodo_academico",
    "usuario",
  ];

  for (const table of tablesInOrder) {
    try {
      await dataSource.query(`DELETE FROM "${table}"`);
    } catch (e) {
      // Ignore if table doesn't exist
    }
  }
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        ...testDbConfig,
        entities: [
          Usuario,
          Docente,
          Curso,
          Ambiente,
          Grupo,
          PeriodoAcademico,
          HorarioAsignado,
          ConflictoAsignacion,
          DisponibilidadDocente,
          ColaDocentes,
          DiaNoLaborable,
          NotificacionDocente,
          Preasignacion,
          PreferenciasNotificacion,
          RestriccionInstitucional,
          SeleccionTemporal,
          VentanaAtencion,
        ],
      }),
      TypeOrmModule.forFeature([
        Usuario,
        Docente,
        Curso,
        Ambiente,
        Grupo,
        PeriodoAcademico,
        HorarioAsignado,
        ConflictoAsignacion,
        DisponibilidadDocente,
        ColaDocentes,
        DiaNoLaborable,
        NotificacionDocente,
        Preasignacion,
        PreferenciasNotificacion,
        RestriccionInstitucional,
        SeleccionTemporal,
        VentanaAtencion,
      ]),
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  await app.init();

  return app;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

export async function startTransaction(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query("BEGIN");
}

export async function rollbackTransaction(
  app: INestApplication,
): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query("ROLLBACK");
}
