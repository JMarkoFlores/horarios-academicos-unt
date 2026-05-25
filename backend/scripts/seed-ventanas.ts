#!/usr/bin/env ts-node
/**
 * Script: Seed Modo Ventanas de Atención
 * 
 * Crea un período de prueba completo en modo VENTANAS con:
 * - Período académico 2026-I-TEST en modo VENTANAS
 * - Campaña de ventanas activa
 * - 6 ventanas programadas ( diferentes categorías y modalidades)
 * - Docentes asignados a las colas
 * - Parámetros de carga configurados
 * 
 * Uso:
 *   npx ts-node scripts/seed-ventanas.ts
 * 
 * Requisitos:
 *   - Tener docentes creados en la base de datos
 *   - Variables de entorno configuradas (.env)
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";

// Entidades necesarias
import { PeriodoAcademico } from "../src/entities/periodo-academico.entity";
import { VentanaAtencion, EstadoVentanaAtencion } from "../src/entities/ventana-atencion.entity";
import { CampañaVentanas } from "../src/entities/campaña-ventanas.entity";
import { ColaDocente } from "../src/entities/cola-docentes.entity";
import { Docente } from "../src/entities/docente.entity";
import { ParametrosCarga } from "../src/entities/parametros-carga.entity";
import { EstadoPeriodo } from "../src/common/enums/estado-periodo.enum";
import { ModoAsignacion } from "../src/common/enums/modo-asignacion.enum";

// Configuración de entorno
config({ path: join(__dirname, "..", ".env") });

// Configuración de la base de datos
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  database: process.env.DATABASE_NAME ?? "horarios_unt",
  username: process.env.DATABASE_USER ?? "unt_user",
  password: process.env.DATABASE_PASSWORD ?? "unt_pass123",
  entities: [
    PeriodoAcademico,
    VentanaAtencion,
    CampañaVentanas,
    ColaDocente,
    Docente,
    ParametrosCarga,
  ],
  synchronize: false,
  logging: false,
});

// Datos de configuración
const PERIODO_CODIGO = "2026-I-TEST";
const PERIODO_NOMBRE = "Semestre 2026-I - Test Modo Ventanas";

interface VentanaConfig {
  fecha: string;
  categoria: string;
  modalidad: string;
  horaInicio: string;
  horaFin: string;
  docentesCount: number;
}

const ventanasConfig: VentanaConfig[] = [
  { fecha: "2026-03-20", categoria: "PRINCIPAL", modalidad: "NOMBRADO", horaInicio: "08:00", horaFin: "10:00", docentesCount: 3 },
  { fecha: "2026-03-22", categoria: "ASOCIADO", modalidad: "NOMBRADO", horaInicio: "09:00", horaFin: "11:00", docentesCount: 3 },
  { fecha: "2026-03-24", categoria: "AUXILIAR", modalidad: "NOMBRADO", horaInicio: "10:00", horaFin: "12:00", docentesCount: 3 },
  { fecha: "2026-03-27", categoria: "PRINCIPAL", modalidad: "CONTRATADO", horaInicio: "14:00", horaFin: "16:00", docentesCount: 2 },
  { fecha: "2026-03-29", categoria: "ASOCIADO", modalidad: "CONTRATADO", horaInicio: "15:00", horaFin: "17:00", docentesCount: 2 },
  { fecha: "2026-03-31", categoria: "AUXILIAR", modalidad: "CONTRATADO", horaInicio: "16:00", horaFin: "18:00", docentesCount: 2 },
];

async function seedModoVentanas() {
  console.log("🌱 Iniciando seed para modo VENTANAS de atención...\n");

  await AppDataSource.initialize();
  console.log("✅ Conexión a la base de datos establecida\n");

  const periodoRepo = AppDataSource.getRepository(PeriodoAcademico);
  const ventanaRepo = AppDataSource.getRepository(VentanaAtencion);
  const campañaRepo = AppDataSource.getRepository(CampañaVentanas);
  const colaRepo = AppDataSource.getRepository(ColaDocente);
  const docenteRepo = AppDataSource.getRepository(Docente);
  const parametrosRepo = AppDataSource.getRepository(ParametrosCarga);

  try {
    // ============================================================
    // 1. LIMPIAR DATOS EXISTENTES
    // ============================================================
    console.log("🧹 Limpiando datos existentes...");
    
    const periodoExistente = await periodoRepo.findOne({ where: { codigo: PERIODO_CODIGO } });
    if (periodoExistente) {
      // Limpiar colas
      await colaRepo.createQueryBuilder()
        .delete()
        .where("ventana_id IN (SELECT id FROM ventana_atencion WHERE periodo = :periodo)", { periodo: PERIODO_CODIGO })
        .execute();
      
      // Limpiar ventanas
      await ventanaRepo.delete({ periodo: PERIODO_CODIGO });
      
      // Limpiar campaña
      await campañaRepo.delete({ periodo: { codigo: PERIODO_CODIGO } });
      
      // Limpiar parámetros
      await parametrosRepo.delete({ periodo_academico: periodoExistente.codigo });
      
      // Limpiar período
      await periodoRepo.delete({ id: periodoExistente.id });
      
      console.log("✅ Datos anteriores eliminados\n");
    }

    // ============================================================
    // 2. CREAR PERÍODO EN MODO VENTANAS
    // ============================================================
    console.log("📅 Creando período académico en modo VENTANAS...");
    
    const periodo = periodoRepo.create({
      codigo: PERIODO_CODIGO,
      nombre: PERIODO_NOMBRE,
      fecha_inicio: new Date("2026-03-16"),
      fecha_fin: new Date("2026-07-31"),
      estado: EstadoPeriodo.EN_CURSO,
      activo: true,
      modo_asignacion: ModoAsignacion.VENTANAS,
    });
    
    const periodoGuardado = await periodoRepo.save(periodo);
    console.log(`✅ Período creado: ${periodoGuardado.codigo} (ID: ${periodoGuardado.id})\n`);

    // ============================================================
    // 3. CREAR CAMPAÑA DE VENTANAS
    // ============================================================
    console.log("📢 Creando campaña de ventanas...");
    
    const campaña = campañaRepo.create({
      nombre: "Campaña Principal 2026-I",
      descripcion: "Ventanas de atención para docentes nombrados y contratados",
      periodo: PERIODO_CODIGO,
      fecha_inicio: new Date("2026-03-20"),
      fecha_fin: new Date("2026-04-05"),
      dias_habilitados: ["LUNES", "MIERCOLES", "VIERNES"],
      duracion_turno_minutos: 30,
      cupos_maximos_ventana: 5,
      estado: "ACTIVA",
      total_ventanas_generadas: 0,
      total_docentes_asignados: 0,
    } as any);
    
    const campañaGuardada = await campañaRepo.save(campaña as any);
    console.log(`✅ Campaña creada: ${campañaGuardada.nombre} (ID: ${campañaGuardada.id})\n`);

    // ============================================================
    // 4. CREAR VENTANAS DE ATENCIÓN
    // ============================================================
    console.log("📋 Creando ventanas de atención...");
    
    const ventanasGuardadas: VentanaAtencion[] = [];
    
    for (const config of ventanasConfig) {
      const ventana = ventanaRepo.create({
        periodo: PERIODO_CODIGO,
        fecha: new Date(config.fecha),
        categoria: config.categoria,
        modalidad: config.modalidad,
        hora_inicio: config.horaInicio,
        hora_fin: config.horaFin,
        intervalo_minutos: 30,
        estado: EstadoVentanaAtencion.PROGRAMADA,
        campaña_id: (campañaGuardada as any).id,
      });
      
      const guardada = await ventanaRepo.save(ventana);
      ventanasGuardadas.push(guardada);
      
      console.log(`   ✓ Ventana ${guardada.categoria}/${guardada.modalidad}: ${guardada.fecha.toISOString().split('T')[0]} ${guardada.hora_inicio}-${guardada.hora_fin}`);
    }
    
    console.log(`✅ ${ventanasGuardadas.length} ventanas creadas\n`);

    // ============================================================
    // 5. ASIGNAR DOCENTES A COLAS
    // ============================================================
    console.log("👨‍🏫 Asignando docentes a colas de ventanas...");
    
    let totalDocentesAsignados = 0;
    
    for (let i = 0; i < ventanasGuardadas.length; i++) {
      const ventana = ventanasGuardadas[i];
      const config = ventanasConfig[i];
      
      // Buscar docentes según categoría y modalidad
      const docentes = await docenteRepo.find({
        where: {
          categoria: config.categoria as any,
          tipo_contrato: config.modalidad as any,
          activo: true,
        },
        order: { fecha_ingreso: "DESC" },
        take: config.docentesCount,
      });
      
      if (docentes.length === 0) {
        console.log(`   ⚠️  No se encontraron docentes para ventana ${ventana.categoria}/${ventana.modalidad}`);
        continue;
      }
      
      // Crear colas
      for (let orden = 0; orden < docentes.length; orden++) {
        const cola = colaRepo.create({
          ventana: { id: ventana.id },
          docente: { id: docentes[orden].id },
          orden: orden + 1,
          estado: "ESPERANDO" as any,
        });
        
        await colaRepo.save(cola);
        totalDocentesAsignados++;
      }
      
      console.log(`   ✓ Ventana ${ventana.categoria}/${ventana.modalidad}: ${docentes.length} docentes asignados`);
    }
    
    console.log(`✅ ${totalDocentesAsignados} docentes asignados a colas\n`);

    // ============================================================
    // 6. CONFIGURAR PARÁMETROS DE CARGA
    // ============================================================
    console.log("⚙️  Configurando parámetros de carga...");
    
    const parametros = parametrosRepo.create({
      periodo_id: periodoGuardado.id,
      tipo_docente: "ORDINARIO",
      categoria: "PRINCIPAL",
      modalidad: "DEDICACION_EXCLUSIVA",
      horas_min_semanal: 8,
      horas_max_semanal: 40,
      cursos_min_docente: 1,
      cursos_max_docente: 5,
    } as any);
    
    await parametrosRepo.save(parametros);
    console.log("✅ Parámetros de carga configurados\n");

    // ============================================================
    // 7. ACTUALIZAR CONTADORES DE CAMPAÑA
    // ============================================================
    (campañaGuardada as any).total_ventanas_generadas = ventanasGuardadas.length;
    (campañaGuardada as any).total_docentes_asignados = totalDocentesAsignados;
    await campañaRepo.save(campañaGuardada);

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    console.log("=".repeat(60));
    console.log("🎉 SEED COMPLETADO EXITOSAMENTE");
    console.log("=".repeat(60));
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Período:        ${PERIODO_CODIGO}`);
    console.log(`   Modo:           VENTANAS`);
    console.log(`   Ventanas:       ${ventanasGuardadas.length}`);
    console.log(`   Docentes:       ${totalDocentesAsignados} asignados a colas`);
    console.log(`   Campaña:        ${campañaGuardada.nombre}`);
    console.log(`\n🌐 URLs DE ACCESO:`);
    console.log(`   Panel Operador: http://localhost:4200/app/operador`);
    console.log(`   Configuración:  http://localhost:4200/app/configuracion`);
    console.log(`\n📝 INSTRUCCIONES:`);
    console.log(`   1. Cambia el período activo a "${PERIODO_CODIGO}" en el selector`);
    console.log(`   2. Ve a /app/operador para ver las ventanas`);
    console.log(`   3. Selecciona una ventana e iníciala`);
    console.log(`   4. Prueba la cola de docentes y la selección de horarios`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error durante el seed:", error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Ejecutar
seedModoVentanas();
