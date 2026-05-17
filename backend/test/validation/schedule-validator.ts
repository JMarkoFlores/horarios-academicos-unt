import { HorarioAsignado } from "../../src/entities/horario-asignado.entity";
import { ConflictoAsignacion } from "../../src/entities/conflicto-asignacion.entity";
import { DisponibilidadDocente } from "../../src/entities/disponibilidad-docente.entity";
import { Ambiente } from "../../src/entities/ambiente.entity";
import { Curso } from "../../src/entities/curso.entity";
import { Docente } from "../../src/entities/docente.entity";
import { TipoClase } from "../../src/common/enums/tipo-clase.enum";
import { TipoAmbiente } from "../../src/common/enums/tipo-ambiente.enum";

export interface ValidationResult {
  valid: boolean;
  conflicts: ConflictDetail[];
  warnings: WarningDetail[];
  metrics: ValidationMetrics;
}

export interface ConflictDetail {
  type: ConflictType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  affectedEntities: {
    horarios?: HorarioAsignado[];
    docentes?: Docente[];
    ambientes?: Ambiente[];
    cursos?: Curso[];
  };
  suggestion?: string;
}

export interface WarningDetail {
  type: WarningType;
  description: string;
  affectedEntities: any;
}

export interface ValidationMetrics {
  totalHorarios: number;
  totalDocentes: number;
  totalAmbientes: number;
  totalCursos: number;
  conflictosCriticos: number;
  conflictosAltos: number;
  conflictosMedios: number;
  conflictosBajos: number;
  porcentajeUtilizacionDocentes: number;
  porcentajeUtilizacionAmbientes: number;
}

export enum ConflictType {
  CRUCE_DOCENTE = "CRUCE_DOCENTE",
  CRUCE_AMBIENTE = "CRUCE_AMBIENTE",
  CRUCE_GRUPO = "CRUCE_GRUPO",
  DOBLE_ASIGNACION_DOCENTE = "DOBLE_ASIGNACION_DOCENTE",
  DOBLE_ASIGNACION_AMBIENTE = "DOBLE_ASIGNACION_AMBIENTE",
  DISPONIBILIDAD_DOCENTE = "DISPONIBILIDAD_DOCENTE",
  CAPACIDAD_AMBIENTE = "CAPACIDAD_AMBIENTE",
  LABORATORIO_INCORRECTO = "LABORATORIO_INCORRECTO",
  BLOQUE_INVALIDO = "BLOQUE_INVALIDO",
  RESTRICCION_ACADEMICA = "RESTRICCION_ACADEMICA",
  PRIORIDAD_ACADEMICA = "PRIORIDAD_ACADEMICA",
}

export enum WarningType {
  UTILIZACION_BAJA_DOCENTE = "UTILIZACION_BAJA_DOCENTE",
  UTILIZACION_BAJA_AMBIENTE = "UTILIZACION_BAJA_AMBIENTE",
  HORARIO_FRONTERA = "HORARIO_FRONTERA",
  SIN_LABORATORIO = "SIN_LABORATORIO",
}

export class ScheduleValidator {
  private readonly FRANJA_INSTITUCIONAL = { inicio: 7 * 60, fin: 22 * 60 };

  validateHorarios(
    horarios: HorarioAsignado[],
    disponibilidades: DisponibilidadDocente[],
    ambientes: Ambiente[],
    cursos: Curso[],
  ): ValidationResult {
    const conflicts: ConflictDetail[] = [];
    const warnings: WarningDetail[] = [];

    // 1. Validar cruces de horarios
    conflicts.push(...this.detectarCrucesDocente(horarios));
    conflicts.push(...this.detectarCrucesAmbiente(horarios));
    conflicts.push(...this.detectarCrucesGrupo(horarios));

    // 2. Validar doble asignación
    conflicts.push(...this.detectarDobleAsignacionDocente(horarios));
    conflicts.push(...this.detectarDobleAsignacionAmbiente(horarios));

    // 3. Validar disponibilidad docente
    conflicts.push(
      ...this.validarDisponibilidadDocente(horarios, disponibilidades),
    );

    // 4. Validar capacidad de ambientes
    conflicts.push(
      ...this.validarCapacidadAmbiente(horarios, ambientes, cursos),
    );

    // 5. Validar laboratorios correctos
    conflicts.push(...this.validarLaboratorios(horarios, cursos));

    // 6. Validar bloques válidos
    conflicts.push(...this.validarBloquesValidos(horarios));

    // 7. Validar restricciones académicas (prerequisitos)
    conflicts.push(...this.validarRestriccionesAcademicas(horarios, cursos));

    // 8. Validar prioridades académicas
    conflicts.push(...this.validarPrioridadesAcademicas(horarios));

    // 9. Generar advertencias
    warnings.push(...this.generarAdvertencias(horarios, ambientes));

    const metrics = this.calculateMetrics(
      horarios,
      ambientes,
      cursos,
      conflicts,
    );

    return {
      valid: conflicts.filter((c) => c.severity === "CRITICAL").length === 0,
      conflicts,
      warnings,
      metrics,
    };
  }

  private detectarCrucesDocente(horarios: HorarioAsignado[]): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const docenteHorarios = new Map<number, HorarioAsignado[]>();

    horarios.forEach((h) => {
      if (!docenteHorarios.has(h.docente.id)) {
        docenteHorarios.set(h.docente.id, []);
      }
      docenteHorarios.get(h.docente.id)!.push(h);
    });

    docenteHorarios.forEach((horariosDocente, docenteId) => {
      for (let i = 0; i < horariosDocente.length; i++) {
        for (let j = i + 1; j < horariosDocente.length; j++) {
          const h1 = horariosDocente[i];
          const h2 = horariosDocente[j];

          if (
            h1.dia_semana === h2.dia_semana &&
            this.solapan(
              h1.hora_inicio,
              h1.hora_fin,
              h2.hora_inicio,
              h2.hora_fin,
            )
          ) {
            conflicts.push({
              type: ConflictType.CRUCE_DOCENTE,
              severity: "CRITICAL",
              description: `Docente ${h1.docente.nombres} ${h1.docente.apellidos} tiene cruce de horarios: ${h1.curso.nombre} (${h1.hora_inicio}-${h1.hora_fin}) y ${h2.curso.nombre} (${h2.hora_inicio}-${h2.hora_fin}) el día ${h1.dia_semana}`,
              affectedEntities: {
                horarios: [h1, h2],
                docentes: [h1.docente],
              },
              suggestion:
                "Reasignar uno de los horarios a un día o hora diferente",
            });
          }
        }
      }
    });

    return conflicts;
  }

  private detectarCrucesAmbiente(
    horarios: HorarioAsignado[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const ambienteHorarios = new Map<number, HorarioAsignado[]>();

    horarios.forEach((h) => {
      if (!ambienteHorarios.has(h.ambiente.id)) {
        ambienteHorarios.set(h.ambiente.id, []);
      }
      ambienteHorarios.get(h.ambiente.id)!.push(h);
    });

    ambienteHorarios.forEach((horariosAmbiente, ambienteId) => {
      for (let i = 0; i < horariosAmbiente.length; i++) {
        for (let j = i + 1; j < horariosAmbiente.length; j++) {
          const h1 = horariosAmbiente[i];
          const h2 = horariosAmbiente[j];

          if (
            h1.dia_semana === h2.dia_semana &&
            this.solapan(
              h1.hora_inicio,
              h1.hora_fin,
              h2.hora_inicio,
              h2.hora_fin,
            )
          ) {
            conflicts.push({
              type: ConflictType.CRUCE_AMBIENTE,
              severity: "CRITICAL",
              description: `Ambiente ${h1.ambiente.nombre} (${h1.ambiente.codigo}) tiene cruce de horarios: ${h1.curso.nombre} (${h1.hora_inicio}-${h1.hora_fin}) y ${h2.curso.nombre} (${h2.hora_inicio}-${h2.hora_fin}) el día ${h1.dia_semana}`,
              affectedEntities: {
                horarios: [h1, h2],
                ambientes: [h1.ambiente],
              },
              suggestion:
                "Reasignar uno de los horarios a un ambiente diferente",
            });
          }
        }
      }
    });

    return conflicts;
  }

  private detectarCrucesGrupo(horarios: HorarioAsignado[]): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const grupoHorarios = new Map<number, HorarioAsignado[]>();

    horarios.forEach((h) => {
      if (h.grupo) {
        if (!grupoHorarios.has(h.grupo.id)) {
          grupoHorarios.set(h.grupo.id, []);
        }
        grupoHorarios.get(h.grupo.id)!.push(h);
      }
    });

    grupoHorarios.forEach((horariosGrupo, grupoId) => {
      for (let i = 0; i < horariosGrupo.length; i++) {
        for (let j = i + 1; j < horariosGrupo.length; j++) {
          const h1 = horariosGrupo[i];
          const h2 = horariosGrupo[j];

          if (
            h1.dia_semana === h2.dia_semana &&
            this.solapan(
              h1.hora_inicio,
              h1.hora_fin,
              h2.hora_inicio,
              h2.hora_fin,
            )
          ) {
            conflicts.push({
              type: ConflictType.CRUCE_GRUPO,
              severity: "CRITICAL",
              description: `Grupo ${h1.grupo.nombre} tiene cruce de horarios: ${h1.curso.nombre} (${h1.hora_inicio}-${h1.hora_fin}) y ${h2.curso.nombre} (${h2.hora_inicio}-${h2.hora_fin}) el día ${h1.dia_semana}`,
              affectedEntities: {
                horarios: [h1, h2],
              },
              suggestion:
                "Reasignar uno de los horarios a un día o hora diferente",
            });
          }
        }
      }
    });

    return conflicts;
  }

  private detectarDobleAsignacionDocente(
    horarios: HorarioAsignado[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const asignaciones = new Map<string, HorarioAsignado[]>();

    horarios.forEach((h) => {
      const key = `${h.docente.id}-${h.curso.id}-${h.dia_semana}-${h.hora_inicio}-${h.hora_fin}`;
      if (!asignaciones.has(key)) {
        asignaciones.set(key, []);
      }
      asignaciones.get(key)!.push(h);
    });

    asignaciones.forEach((horariosMismo, key) => {
      if (horariosMismo.length > 1) {
        const [docenteId, cursoId, dia, inicio, fin] = key.split("-");
        conflicts.push({
          type: ConflictType.DOBLE_ASIGNACION_DOCENTE,
          severity: "HIGH",
          description: `Doble asignación detectada: Docente ${docenteId} asignado al curso ${cursoId} el mismo horario (${dia} ${inicio}-${fin})`,
          affectedEntities: {
            horarios: horariosMismo,
          },
          suggestion: "Eliminar la asignación duplicada",
        });
      }
    });

    return conflicts;
  }

  private detectarDobleAsignacionAmbiente(
    horarios: HorarioAsignado[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const asignaciones = new Map<string, HorarioAsignado[]>();

    horarios.forEach((h) => {
      const key = `${h.ambiente.id}-${h.dia_semana}-${h.hora_inicio}-${h.hora_fin}`;
      if (!asignaciones.has(key)) {
        asignaciones.set(key, []);
      }
      asignaciones.get(key)!.push(h);
    });

    asignaciones.forEach((horariosMismo, key) => {
      if (horariosMismo.length > 1) {
        const [ambienteId, dia, inicio, fin] = key.split("-");
        conflicts.push({
          type: ConflictType.DOBLE_ASIGNACION_AMBIENTE,
          severity: "HIGH",
          description: `Doble asignación detectada: Ambiente ${ambienteId} asignado múltiples veces el mismo horario (${dia} ${inicio}-${fin})`,
          affectedEntities: {
            horarios: horariosMismo,
            ambientes: [horariosMismo[0].ambiente],
          },
          suggestion: "Eliminar la asignación duplicada",
        });
      }
    });

    return conflicts;
  }

  private validarDisponibilidadDocente(
    horarios: HorarioAsignado[],
    disponibilidades: DisponibilidadDocente[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    horarios.forEach((horario) => {
      const disp = disponibilidades.find(
        (d) =>
          d.docente.id === horario.docente.id &&
          d.dia_semana === horario.dia_semana &&
          d.disponible &&
          this.min(d.hora_inicio) <= this.min(horario.hora_inicio) &&
          this.min(d.hora_fin) >= this.min(horario.hora_fin),
      );

      if (!disp) {
        conflicts.push({
          type: ConflictType.DISPONIBILIDAD_DOCENTE,
          severity: "HIGH",
          description: `Docente ${horario.docente.nombres} ${horario.docente.apellidos} no tiene disponibilidad para el horario asignado: Día ${horario.dia_semana}, ${horario.hora_inicio}-${horario.hora_fin}`,
          affectedEntities: {
            horarios: [horario],
            docentes: [horario.docente],
          },
          suggestion:
            "Verificar la disponibilidad del docente y reasignar el horario",
        });
      }
    });

    return conflicts;
  }

  private validarCapacidadAmbiente(
    horarios: HorarioAsignado[],
    ambientes: Ambiente[],
    cursos: Curso[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    horarios.forEach((horario) => {
      const ambiente = ambientes.find((a) => a.id === horario.ambiente.id);
      const curso = cursos.find((c) => c.id === horario.curso.id);

      if (ambiente && curso && horario.grupo) {
        if (horario.grupo.cupo_maximo > ambiente.capacidad) {
          conflicts.push({
            type: ConflictType.CAPACIDAD_AMBIENTE,
            severity: "HIGH",
            description: `Capacidad insuficiente: Ambiente ${ambiente.nombre} (capacidad: ${ambiente.capacidad}) no puede alojar al grupo ${horario.grupo.nombre} (cupo: ${horario.grupo.cupo_maximo}) para el curso ${curso.nombre}`,
            affectedEntities: {
              horarios: [horario],
              ambientes: [ambiente],
              cursos: [curso],
            },
            suggestion: "Reasignar a un ambiente con mayor capacidad",
          });
        }
      }
    });

    return conflicts;
  }

  private validarLaboratorios(
    horarios: HorarioAsignado[],
    cursos: Curso[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    horarios.forEach((horario) => {
      const curso = cursos.find((c) => c.id === horario.curso.id);

      if (curso) {
        if (
          curso.tiene_laboratorio &&
          horario.tipo_clase === TipoClase.LABORATORIO
        ) {
          if (horario.ambiente.tipo !== TipoAmbiente.LABORATORIO) {
            conflicts.push({
              type: ConflictType.LABORATORIO_INCORRECTO,
              severity: "HIGH",
              description: `Curso ${curso.nombre} requiere laboratorio pero está asignado a ${horario.ambiente.tipo} ${horario.ambiente.nombre}`,
              affectedEntities: {
                horarios: [horario],
                ambientes: [horario.ambiente],
                cursos: [curso],
              },
              suggestion: "Reasignar a un ambiente de tipo LABORATORIO",
            });
          }
        }

        if (
          !curso.tiene_laboratorio &&
          horario.tipo_clase === TipoClase.LABORATORIO
        ) {
          conflicts.push({
            type: ConflictType.LABORATORIO_INCORRECTO,
            severity: "MEDIUM",
            description: `Curso ${curso.nombre} no tiene laboratorio pero se asignó como clase de laboratorio`,
            affectedEntities: {
              horarios: [horario],
              cursos: [curso],
            },
            suggestion:
              "Cambiar el tipo de clase a TEORIA o verificar si el curso debería tener laboratorio",
          });
        }
      }
    });

    return conflicts;
  }

  private validarBloquesValidos(horarios: HorarioAsignado[]): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    horarios.forEach((horario) => {
      const inicioMin = this.min(horario.hora_inicio);
      const finMin = this.min(horario.hora_fin);

      if (
        inicioMin < this.FRANJA_INSTITUCIONAL.inicio ||
        finMin > this.FRANJA_INSTITUCIONAL.fin
      ) {
        conflicts.push({
          type: ConflictType.BLOQUE_INVALIDO,
          severity: "HIGH",
          description: `Horario fuera de franja institucional: ${horario.hora_inicio}-${horario.hora_fin} (franja válida: 07:00-22:00)`,
          affectedEntities: {
            horarios: [horario],
          },
          suggestion:
            "Ajustar el horario dentro de la franja institucional (07:00-22:00)",
        });
      }

      if (inicioMin >= finMin) {
        conflicts.push({
          type: ConflictType.BLOQUE_INVALIDO,
          severity: "CRITICAL",
          description: `Horario inválido: hora de inicio (${horario.hora_inicio}) es mayor o igual a hora de fin (${horario.hora_fin})`,
          affectedEntities: {
            horarios: [horario],
          },
          suggestion: "Corregir las horas del horario",
        });
      }

      // Validar que sea un bloque de 1 hora
      const duracion = finMin - inicioMin;
      if (duracion !== 60) {
        conflicts.push({
          type: ConflictType.BLOQUE_INVALIDO,
          severity: "MEDIUM",
          description: `Duración de bloque no estándar: ${duracion} minutos (se esperan 60 minutos)`,
          affectedEntities: {
            horarios: [horario],
          },
          suggestion: "Ajustar a bloques de 1 hora",
        });
      }
    });

    return conflicts;
  }

  private validarRestriccionesAcademicas(
    horarios: HorarioAsignado[],
    cursos: Curso[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const cursoMap = new Map<number, Curso>();

    cursos.forEach((c) => cursoMap.set(c.id, c));

    // Agrupar horarios por grupo para verificar prerequisitos
    const grupoHorarios = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
      if (h.grupo) {
        if (!grupoHorarios.has(h.grupo.id)) {
          grupoHorarios.set(h.grupo.id, []);
        }
        grupoHorarios.get(h.grupo.id)!.push(h);
      }
    });

    grupoHorarios.forEach((horariosGrupo, grupoId) => {
      // Verificar que los cursos con prerequisitos estén programados después
      horariosGrupo.sort(
        (a, b) =>
          a.dia_semana - b.dia_semana ||
          this.min(a.hora_inicio) - this.min(b.hora_inicio),
      );

      for (let i = 0; i < horariosGrupo.length; i++) {
        const curso = cursoMap.get(horariosGrupo[i].curso.id);
        if (curso && curso.prerequisitos) {
          const prerequisitoCodigo = curso.prerequisitos;
          const prerequisito = cursos.find(
            (c) => c.codigo === prerequisitoCodigo,
          );

          if (prerequisito) {
            const prerequisitoHorario = horariosGrupo.find(
              (h) => h.curso.id === prerequisito.id,
            );
            if (!prerequisitoHorario) {
              conflicts.push({
                type: ConflictType.RESTRICCION_ACADEMICA,
                severity: "MEDIUM",
                description: `Curso ${curso.nombre} tiene prerequisito ${prerequisito.nombre} pero no está asignado al mismo grupo`,
                affectedEntities: {
                  cursos: [curso, prerequisito],
                },
                suggestion:
                  "Asignar el prerequisito al mismo grupo o verificar la configuración",
              });
            }
          }
        }
      }
    });

    return conflicts;
  }

  private validarPrioridadesAcademicas(
    horarios: HorarioAsignado[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    // Agrupar horarios por docente
    const docenteHorarios = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
      if (!docenteHorarios.has(h.docente.id)) {
        docenteHorarios.set(h.docente.id, []);
      }
      docenteHorarios.get(h.docente.id)!.push(h);
    });

    // Verificar distribución equitativa de horarios por día
    docenteHorarios.forEach((horariosDocente, docenteId) => {
      const horariosPorDia = new Map<number, number>();
      horariosDocente.forEach((h) => {
        horariosPorDia.set(
          h.dia_semana,
          (horariosPorDia.get(h.dia_semana) || 0) + 1,
        );
      });

      const maxHorarias = Math.max(...horariosPorDia.values());
      const minHorarias = Math.min(...horariosPorDia.values());

      if (maxHorarias - minHorarias > 3) {
        conflicts.push({
          type: ConflictType.PRIORIDAD_ACADEMICA,
          severity: "LOW",
          description: `Docente ${horariosDocente[0].docente.nombres} ${horariosDocente[0].docente.apellidos} tiene distribución desequilibrada de horarios por día (máx: ${maxHorarias}, mín: ${minHorarias})`,
          affectedEntities: {
            docentes: [horariosDocente[0].docente],
          },
          suggestion: "Redistribuir horarios para equilibrar la carga diaria",
        });
      }
    });

    return conflicts;
  }

  private generarAdvertencias(
    horarios: HorarioAsignado[],
    ambientes: Ambiente[],
  ): WarningDetail[] {
    const warnings: WarningDetail[] = [];

    // Advertencia de utilización baja de docentes
    const docenteHorarios = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
      if (!docenteHorarios.has(h.docente.id)) {
        docenteHorarios.set(h.docente.id, []);
      }
      docenteHorarios.get(h.docente.id)!.push(h);
    });

    docenteHorarios.forEach((horariosDocente, docenteId) => {
      if (horariosDocente.length < 3) {
        warnings.push({
          type: WarningType.UTILIZACION_BAJA_DOCENTE,
          description: `Docente ${horariosDocente[0].docente.nombres} ${horariosDocente[0].docente.apellidos} tiene baja utilización (${horariosDocente.length} horarios)`,
          affectedEntities: { docente: horariosDocente[0].docente },
        });
      }
    });

    // Advertencia de utilización baja de ambientes
    const ambienteHorarios = new Map<number, HorarioAsignado[]>();
    horarios.forEach((h) => {
      if (!ambienteHorarios.has(h.ambiente.id)) {
        ambienteHorarios.set(h.ambiente.id, []);
      }
      ambienteHorarios.get(h.ambiente.id)!.push(h);
    });

    ambienteHorarios.forEach((horariosAmbiente, ambienteId) => {
      if (horariosAmbiente.length < 5) {
        warnings.push({
          type: WarningType.UTILIZACION_BAJA_AMBIENTE,
          description: `Ambiente ${horariosAmbiente[0].ambiente.nombre} tiene baja utilización (${horariosAmbiente.length} horarios)`,
          affectedEntities: { ambiente: horariosAmbiente[0].ambiente },
        });
      }
    });

    // Advertencia de horarios en frontera
    horarios.forEach((horario) => {
      const inicioMin = this.min(horario.hora_inicio);
      if (
        inicioMin === this.FRANJA_INSTITUCIONAL.inicio ||
        inicioMin === this.FRANJA_INSTITUCIONAL.fin - 60
      ) {
        warnings.push({
          type: WarningType.HORARIO_FRONTERA,
          description: `Horario en frontera de franja institucional: ${horario.hora_inicio}-${horario.hora_fin}`,
          affectedEntities: { horario },
        });
      }
    });

    return warnings;
  }

  private calculateMetrics(
    horarios: HorarioAsignado[],
    ambientes: Ambiente[],
    cursos: Curso[],
    conflicts: ConflictDetail[],
  ): ValidationMetrics {
    const totalDocentes = new Set(horarios.map((h) => h.docente.id)).size;
    const totalAmbientes = new Set(horarios.map((h) => h.ambiente.id)).size;
    const totalCursos = new Set(horarios.map((h) => h.curso.id)).size;

    const conflictosCriticos = conflicts.filter(
      (c) => c.severity === "CRITICAL",
    ).length;
    const conflictosAltos = conflicts.filter(
      (c) => c.severity === "HIGH",
    ).length;
    const conflictosMedios = conflicts.filter(
      (c) => c.severity === "MEDIUM",
    ).length;
    const conflictosBajos = conflicts.filter(
      (c) => c.severity === "LOW",
    ).length;

    // Calcular utilización de docentes (horas asignadas / 20 horas máx)
    const docenteHorarios = new Map<number, number>();
    horarios.forEach((h) => {
      docenteHorarios.set(
        h.docente.id,
        (docenteHorarios.get(h.docente.id) || 0) + 1,
      );
    });
    const totalHorasDocentes = Array.from(docenteHorarios.values()).reduce(
      (sum, val) => sum + val,
      0,
    );
    const porcentajeUtilizacionDocentes =
      (totalHorasDocentes / (totalDocentes * 20)) * 100;

    // Calcular utilización de ambientes (horas asignadas / 75 horas máx por semana)
    const ambienteHorarios = new Map<number, number>();
    horarios.forEach((h) => {
      ambienteHorarios.set(
        h.ambiente.id,
        (ambienteHorarios.get(h.ambiente.id) || 0) + 1,
      );
    });
    const totalHorasAmbientes = Array.from(ambienteHorarios.values()).reduce(
      (sum, val) => sum + val,
      0,
    );
    const porcentajeUtilizacionAmbientes =
      (totalHorasAmbientes / (totalAmbientes * 75)) * 100;

    return {
      totalHorarios: horarios.length,
      totalDocentes,
      totalAmbientes,
      totalCursos,
      conflictosCriticos,
      conflictosAltos,
      conflictosMedios,
      conflictosBajos,
      porcentajeUtilizacionDocentes,
      porcentajeUtilizacionAmbientes,
    };
  }

  private min(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  private solapan(s1: string, e1: string, s2: string, e2: string): boolean {
    return this.min(s1) < this.min(e2) && this.min(e1) > this.min(s2);
  }

  generarReporteConflictos(conflicts: ConflictDetail[]): string {
    if (conflicts.length === 0) {
      return "✅ No se detectaron conflictos";
    }

    let reporte = `⚠️  Se detectaron ${conflicts.length} conflictos:\n\n`;

    const porSeveridad = new Map<string, ConflictDetail[]>();
    conflicts.forEach((c) => {
      if (!porSeveridad.has(c.severity)) {
        porSeveridad.set(c.severity, []);
      }
      porSeveridad.get(c.severity)!.push(c);
    });

    const ordenSeveridad = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    ordenSeveridad.forEach((severidad) => {
      const conflictsSeveridad = porSeveridad.get(severidad);
      if (conflictsSeveridad && conflictsSeveridad.length > 0) {
        reporte += `### ${severidad} (${conflictsSeveridad.length})\n`;
        conflictsSeveridad.forEach((c) => {
          reporte += `- ${c.description}\n`;
          if (c.suggestion) {
            reporte += `  💡 Sugerencia: ${c.suggestion}\n`;
          }
        });
        reporte += "\n";
      }
    });

    return reporte;
  }
}
