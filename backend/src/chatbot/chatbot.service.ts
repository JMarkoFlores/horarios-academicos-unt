import {
  Injectable,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { AmbientesService } from "../ambientes/ambientes.service";
import { FindDisponiblesDto } from "../ambientes/dto/find-disponibles.dto";
import { DisponibilidadService } from "../disponibilidad/disponibilidad.service";
import { HorariosService } from "../horarios/horarios.service";
import { AsignacionLectivaService } from "../modules/asignacion-lectiva/asignacion-lectiva.service";
import { PeriodoAcademico } from "../entities/periodo-academico.entity";
import { Docente } from "../entities/docente.entity";
import { Ambiente } from "../entities/ambiente.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

// Definición de las herramientas para el LLM
const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "consultar_disponibilidad_ambiente",
      description:
        "Obtiene una lista de ambientes (aulas, laboratorios, etc.) que están libres en un día y rango horario específicos.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            description:
              'El tipo de ambiente a buscar. Por ejemplo: "laboratorio", "aula", "auditorio".',
          },
          dia: {
            type: "string",
            description:
              "El día de la semana para la consulta. Debe ser uno de: lunes, martes, miercoles, jueves, viernes, sabado, domingo.",
          },
          hora_inicio: {
            type: "string",
            description:
              'La hora de inicio del rango de búsqueda, en formato HH:mm (24 horas). Por ejemplo: "15:00".',
          },
          hora_fin: {
            type: "string",
            description:
              'La hora de fin del rango de búsqueda, en formato HH:mm (24 horas). Por ejemplo: "18:00".',
          },
        },
        required: ["tipo", "dia", "hora_inicio", "hora_fin"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_disponibilidad_docente",
      description:
        "Obtiene los bloques horarios en los que un docente ha marcado disponibilidad para un período académico específico.",
      parameters: {
        type: "object",
        properties: {
          docente_id: {
            type: ["number", "string"],
            description: "ID del docente en el sistema.",
          },
          periodo: {
            type: "string",
            description: "Código del período académico (ej: 2026-I, 2025-II).",
          },
        },
        required: ["docente_id", "periodo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_horarios_docente",
      description:
        "Obtiene los horarios ya asignados a un docente en un período académico, para verificar conflictos.",
      parameters: {
        type: "object",
        properties: {
          docente_id: {
            type: ["number", "string"],
            description: "ID del docente en el sistema.",
          },
          periodo: {
            type: "string",
            description: "Código del período académico (ej: 2026-I, 2025-II).",
          },
        },
        required: ["docente_id", "periodo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_conflictos_ambiente",
      description:
        "Verifica si un ambiente específico tiene conflictos de horario en un día y rango horario dados.",
      parameters: {
        type: "object",
        properties: {
          ambiente_id: {
            type: ["number", "string"],
            description: "ID del ambiente en el sistema.",
          },
          dia: {
            type: ["number", "string"],
            description: "Día de la semana (1=lunes, 2=martes, 3=miercoles, 4=jueves, 5=viernes, 6=sabado, 7=domingo).",
          },
          hora_inicio: {
            type: "string",
            description: 'Hora de inicio en formato HH:mm (ej: "08:00").',
          },
          hora_fin: {
            type: "string",
            description: 'Hora de fin en formato HH:mm (ej: "10:00").',
          },
          periodo: {
            type: "string",
            description: "Código del período académico (ej: 2026-I).",
          },
        },
        required: ["ambiente_id", "dia", "hora_inicio", "hora_fin", "periodo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_asignaciones_lectivas",
      description:
        "Obtiene las asignaciones lectivas (cursos asignados) de un docente para un período, con sus horas requeridas y tipo de clase.",
      parameters: {
        type: "object",
        properties: {
          docente_id: {
            type: ["number", "string"],
            description: "ID del docente en el sistema.",
          },
          periodo: {
            type: "string",
            description: "Código del período académico (ej: 2026-I).",
          },
        },
        required: ["docente_id", "periodo"],
      },
    },
  },
];

@Injectable()
export class ChatbotService {
  private groq: Groq;
  private readonly systemPrompts: Record<string, string>;
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private configService: ConfigService,
    private ambientesService: AmbientesService,
    private disponibilidadService: DisponibilidadService,
    private horariosService: HorariosService,
    private asignacionLectivaService: AsignacionLectivaService,
    @InjectRepository(PeriodoAcademico)
    private periodoRepo: Repository<PeriodoAcademico>,
    @InjectRepository(Docente)
    private docenteRepo: Repository<Docente>,
    @InjectRepository(Ambiente)
    private ambienteRepo: Repository<Ambiente>,
  ) {
    const apiKey = this.configService.get<string>("GROQ_API_KEY");
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }

    this.systemPrompts = {
      default: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT". 
        Tu objetivo es ayudar a los usuarios a resolver dudas sobre el funcionamiento del sistema y a realizar consultas específicas.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Docentes, Cursos, Ambientes, Horarios, Disponibilidad, Declaraciones de Carga
        - Roles: admin, director, coordinador, operador, docente
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Si no sabes algo, indica que pueden contactar al soporte técnico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad (negritas, viñetas, código).
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver la disponibilidad declarada por un docente.
        - consultar_horarios_docente: para ver los horarios ya asignados a un docente.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver las asignaciones de cursos de un docente.

        EJEMPLOS DE CONSULTAS:
        - "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
        - "¿Hay laboratorios disponibles el miércoles por la tarde?"
        - "Necesito un auditorio para el viernes de 9 a 11 am"
      `,
      admin: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT" para administradores.
        Tu objetivo es ayudar a los administradores a gestionar el sistema de horarios académicos.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Docentes, Cursos, Ambientes, Horarios, Disponibilidad, Declaraciones de Carga, Configuración, Reportes
        - Tu rol: Administrador del sistema - tienes acceso completo a todas las funcionalidades
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        CAPACIDADES ESPECÍFICAS PARA ADMINISTRADORES:
        - Puedes gestionar usuarios y roles
        - Puedes configurar parámetros del sistema
        - Puedes generar reportes y estadísticas
        - Puedes gestionar periodos académicos
        - Tienes acceso a todas las funcionalidades del sistema

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Proporciona información técnica cuando sea necesario.
        - Si no sabes algo, indica que pueden contactar al soporte técnico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad.
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver la disponibilidad declarada por un docente.
        - consultar_horarios_docente: para ver los horarios ya asignados a un docente.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver las asignaciones de cursos de un docente.

        EJEMPLOS DE CONSULTAS:
        - "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
        - "¿Cómo genero un reporte de horarios?"
        - "¿Cómo configuro un nuevo periodo académico?"
      `,
      docente: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT" para docentes.
        Tu objetivo es ayudar a los docentes a gestionar su carga horaria y consultar información relevante.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Horarios, Disponibilidad, Declaraciones de Carga
        - Tu rol: Docente - puedes consultar tu horario, disponibilidad y declarar tu carga
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        CAPACIDADES ESPECÍFICAS PARA DOCENTES:
        - Puedes consultar tu horario asignado
        - Puedes declarar tu carga lectiva y no lectiva
        - Puedes consultar tu disponibilidad
        - Puedes ver los cursos que te han sido asignados
        - Puedes generar reportes de tu carga

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Enfócate en las funcionalidades disponibles para docentes.
        - Si el usuario solicita algo que no está disponible para su rol, indícalo amablemente.
        - Si no sabes algo, indica que pueden contactar al soporte técnico o al departamento académico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad.
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver tu propia disponibilidad declarada.
        - consultar_horarios_docente: para ver tus horarios ya asignados.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver tus asignaciones de cursos.

        EJEMPLOS DE CONSULTAS:
        - "¿Cuál es mi horario de este semestre?"
        - "¿Cómo declaro mi carga lectiva?"
        - "¿Qué cursos me han sido asignados?"
        - "¿Cuál es mi disponibilidad actual?"
      `,
      coordinador: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT" para coordinadores académicos.
        Tu objetivo es ayudar a los coordinadores a gestionar la asignación de horarios y carga académica.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Docentes, Cursos, Horarios, Disponibilidad, Declaraciones de Carga, Asignación Lectiva
        - Tu rol: Coordinador Académico - puedes asignar horarios, gestionar carga y verificar declaraciones
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        CAPACIDADES ESPECÍFICAS PARA COORDINADORES:
        - Puedes asignar horarios a docentes
        - Puedes gestionar la asignación de carga lectiva
        - Puedes verificar y aprobar declaraciones de carga
        - Puedes consultar disponibilidad de docentes y ambientes
        - Puedes generar reportes de gestión

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Enfócate en las funcionalidades de gestión académica.
        - Si el usuario solicita algo que no está disponible para su rol, indícalo amablemente.
        - Si no sabes algo, indica que pueden contactar al soporte técnico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad.
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver la disponibilidad declarada por un docente.
        - consultar_horarios_docente: para ver los horarios ya asignados a un docente.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver las asignaciones de cursos de un docente.

        EJEMPLOS DE CONSULTAS:
        - "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
        - "¿Cómo asigno un horario a un docente?"
        - "¿Qué docentes tienen carga pendiente?"
        - "¿Cómo verifico las declaraciones de carga?"
      `,
      operador: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT" para operadores de horarios.
        Tu objetivo es ayudar a los operadores a gestionar las ventanas de asignación y el sistema de turnos.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Horarios, Disponibilidad, Operador (ventanas de turnos)
        - Tu rol: Operador de Horarios - gestionas las ventanas de asignación en tiempo real
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        CAPACIDADES ESPECÍFICAS PARA OPERADORES:
        - Puedes gestionar las ventanas de asignación de horarios
        - Puedes controlar el sistema de turnos para docentes
        - Puedes consultar disponibilidad en tiempo real
        - Puedes asignar horarios durante las ventanas activas

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Enfócate en las funcionalidades del sistema de ventanas y turnos.
        - Si el usuario solicita algo que no está disponible para su rol, indícalo amablemente.
        - Si no sabes algo, indica que pueden contactar al soporte técnico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad.
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver la disponibilidad declarada por un docente.
        - consultar_horarios_docente: para ver los horarios ya asignados a un docente.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver las asignaciones de cursos de un docente.

        EJEMPLOS DE CONSULTAS:
        - "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
        - "¿Cómo abro una ventana de asignación?"
        - "¿Qué docentes están en cola para asignar horarios?"
        - "¿Cómo controlo el sistema de turnos?"
      `,
      director: `
        Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT" para directores.
        Tu objetivo es ayudar a los directores a supervisar y gestionar los horarios académicos de su facultad o escuela.

        CONTEXTO DEL SISTEMA:
        - Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
        - Módulos principales: Docentes, Cursos, Horarios, Disponibilidad, Declaraciones de Carga, Reportes
        - Tu rol: Director - puedes supervisar y gestionar horarios de tu facultad/escuela
        - Periodos académicos: semestrales (I, II, III, V, VII, IX)
        - Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
        - Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo
        - Horarios: formato 24 horas (HH:mm), ej: 08:00, 14:30, 18:00

        CAPACIDADES ESPECÍFICAS PARA DIRECTORES:
        - Puedes supervisar los horarios de tu facultad/escuela
        - Puedes generar reportes de gestión
        - Puedes verificar el cumplimiento de carga académica
        - Puedes consultar disponibilidad de ambientes y docentes

        REGLAS DE RESPUESTA:
        - Sé amable, profesional y conciso.
        - Enfócate en las funcionalidades de supervisión y gestión.
        - Si el usuario solicita algo que no está disponible para su rol, indícalo amablemente.
        - Si no sabes algo, indica que pueden contactar al soporte técnico.
        - No respondas consultas fuera del ámbito de este sistema.
        - Responde siempre en español.
        - Usa formato markdown para mejorar legibilidad.
        - Si la respuesta es larga, usa viñetas y secciones para organizarla.

        HERRAMIENTAS DISPONIBLES:
        - consultar_disponibilidad_ambiente: para encontrar aulas o laboratorios libres.
        - consultar_disponibilidad_docente: para ver la disponibilidad declarada por un docente.
        - consultar_horarios_docente: para ver los horarios ya asignados a un docente.
        - verificar_conflictos_ambiente: para comprobar si un ambiente está libre en un horario.
        - consultar_asignaciones_lectivas: para ver las asignaciones de cursos de un docente.

        EJEMPLOS DE CONSULTAS:
        - "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
        - "¿Cómo genero un reporte de horarios de mi facultad?"
        - "¿Qué docentes no han declarado su carga?"
        - "¿Cuál es el estado de la asignación de horarios?"
      `,
    };
  }

  private normalizeRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: "admin",
      administrador: "admin",
      administrador_sistema: "admin",
      docente: "docente",
      coordinador: "coordinador",
      coordinador_academico: "coordinador",
      operador: "operador",
      operador_horarios: "operador",
      director: "director",
      director_escuela: "director",
      director_departamento: "director",
      decano: "director",
    };

    const normalized = roleMap[role?.toLowerCase()] || "default";
    return this.systemPrompts[normalized] ? normalized : "default";
  }

  async chat(
    message: string,
    history: any[] = [],
    userRole: string = "default",
  ) {
    this.logger.log(`Chat request received: ${message.substring(0, 100)}`);
    const apiKey = this.configService.get<string>("GROQ_API_KEY");
    if (!apiKey || apiKey === "tu_api_key_aqui") {
      throw new InternalServerErrorException(
        "API Key de Groq no válida o no configurada en el archivo .env.",
      );
    }
    if (!this.groq) {
      this.groq = new Groq({ apiKey });
    }

    // Normalizar el rol (mapear roles similares)
    const normalizedRole = this.normalizeRole(userRole);
    const systemPrompt =
      this.systemPrompts[normalizedRole] || this.systemPrompts.default;

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.formatHistory(history),
      { role: "user", content: message },
    ];

    try {
      this.logger.log(`Enviando mensaje a Groq: ${message.substring(0, 100)}...`);
      // 1. Primera llamada a Groq para ver si usa una herramienta
      const initialResponse = await Promise.race([
        this.groq.chat.completions.create({
          messages,
          model: "llama-3.3-70b-versatile",
          tools: tools,
          tool_choice: "auto",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Groq API timeout (20s)")), 20000)
        ),
      ]);

      this.logger.log("Groq respondió a la primera llamada");
      const responseMessage = initialResponse.choices[0]?.message;

      // 2. Si el LLM decide usar una herramienta
      if (responseMessage?.tool_calls) {
        this.logger.log("Groq decidió usar una herramienta. Procesando...");
        messages.push(responseMessage); // Añadir la decisión de la IA al historial

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let toolResult: any;

          switch (functionName) {
            case "consultar_disponibilidad_ambiente":
              toolResult = await this.ejecutarConsultaDisponibilidad(functionArgs);
              break;
            case "consultar_disponibilidad_docente":
              toolResult = await this.ejecutarConsultarDisponibilidadDocente(functionArgs);
              break;
            case "consultar_horarios_docente":
              toolResult = await this.ejecutarConsultarHorariosDocente(functionArgs);
              break;
            case "verificar_conflictos_ambiente":
              toolResult = await this.ejecutarVerificarConflictosAmbiente(functionArgs);
              break;
            case "consultar_asignaciones_lectivas":
              toolResult = await this.ejecutarConsultarAsignacionesLectivas(functionArgs);
              break;
            default:
              toolResult = { error: `Herramienta desconocida: ${functionName}` };
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(toolResult),
          });
        }

        // 3. Segunda llamada a Groq con el resultado de la herramienta
        this.logger.log(
          "Enviando resultado de la herramienta a Groq para obtener respuesta final.",
        );
        const finalResponse = await Promise.race([
          this.groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            tool_choice: "none",
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Groq API timeout (30s)")), 30000)
          ),
        ]);

        const content = finalResponse.choices[0]?.message?.content;
        this.logger.log(`Respuesta final de Groq (${content?.length ?? 0} chars): "${content?.substring(0, 200)}"`);

        return content || "No se pudo generar una respuesta.";
      } else {
        // Si no se usa ninguna herramienta, devolver la respuesta normal
        return (
          responseMessage?.content ||
          "No he podido procesar tu solicitud en este momento."
        );
      }
    } catch (error: any) {
      this.logger.error("Error detallado de Groq API:", error);
      if (error.status === 429 || error.message?.includes("429")) {
        throw new HttpException(
          "Servicio de IA sobrecargado. Por favor, intenta de nuevo más tarde.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new InternalServerErrorException(
        `Error al procesar la consulta: ${error.message || "Desconocido"}`,
      );
    }
  }

  private formatHistory(
    history: any[],
  ): Groq.Chat.ChatCompletionMessageParam[] {
    return (history || [])
      .filter((msg) => msg.role && msg.parts && msg.parts[0]?.text)
      .map((msg) => ({
        role: msg.role === "model" ? "assistant" : "user",
        content: msg.parts[0].text,
      }));
  }

  // ==================== HELPERS ====================

  private async resolveDocenteId(idOrName: number | string): Promise<number> {
    if (typeof idOrName === "number") return idOrName;
    // Handle "Apellido, Nombre" format
    const name = idOrName.trim();
    let nombres: string;
    let apellidos: string;
    if (name.includes(",")) {
      const parts = name.split(",").map((s) => s.trim());
      apellidos = parts[0];
      nombres = parts[1] || "";
    } else {
      const parts = name.split(/\s+/);
      if (parts.length <= 2) {
        nombres = parts[0] || "";
        apellidos = parts[1] || "";
      } else {
        // Ambiguous: try (nombre nombre apellido) or (apellido nombre)
        apellidos = parts[parts.length - 1];
        nombres = parts.slice(0, -1).join(" ");
      }
    }
    const docente = await this.docenteRepo.findOne({
      where: [
        { nombres, apellidos },
        { apellidos: nombres, nombres: apellidos },
      ],
    });
    if (!docente) throw new NotFoundException(`Docente "${idOrName}" no encontrado (buscado como nombres='${nombres}', apellidos='${apellidos}')`);
    return docente.id;
  }

  private async resolveAmbienteId(idOrCode: number | string): Promise<number> {
    if (typeof idOrCode === "number") return idOrCode;
    const ambiente = await this.ambienteRepo.findOne({ where: { codigo: idOrCode } });
    if (!ambiente) throw new NotFoundException(`Ambiente "${idOrCode}" no encontrado`);
    return ambiente.id;
  }

  // ==================== HERRAMIENTAS ====================

  private async ejecutarConsultaDisponibilidad(args: any): Promise<any> {
    try {
      this.logger.log(
        `Ejecutando consulta de disponibilidad con: ${JSON.stringify(args)}`,
      );

      // Convertir tipo a mayúsculas y mapear al enum correcto
      let tipo = args.tipo?.toUpperCase().trim();
      // Mapear casos comunes a los valores del enum
      if (
        tipo === "SALA DE COMPUTACION" ||
        tipo === "SALA COMPUTACION" ||
        tipo === "COMPUTACION"
      ) {
        tipo = "SALA_COMPUTACION";
      }

      // Validar tipo contra enum conocido
      const VALID_TIPOS = ["AULA", "LABORATORIO", "AUDITORIO", "TALLER", "SEMINARIO", "SALA_COMPUTACION"];
      if (!VALID_TIPOS.includes(tipo)) {
        this.logger.warn(`Tipo de ambiente inválido: "${tipo}", retornando vacío`);
        return {
          message: `El tipo de ambiente "${args.tipo}" no es válido. Los tipos disponibles son: AULA, LABORATORIO, AUDITORIO, TALLER, SEMINARIO, SALA_COMPUTACION.`,
          ambientes_libres: [],
        };
      }

      const params: FindDisponiblesDto = {
        tipo: tipo,
        dia: args.dia,
        horaInicio: args.hora_inicio,
        horaFin: args.hora_fin,
      };

      const ambientes = await this.ambientesService.findDisponibles(params);

      if (ambientes.length === 0) {
        return {
          message: "No se encontraron ambientes libres con esos criterios.",
        };
      }

      return {
        ambientes_libres: ambientes.map((a) => a.codigo),
      };
    } catch (error: any) {
      this.logger.error(
        `Error al ejecutar la herramienta: ${error.message}`,
        error.stack,
      );
      return {
        error: `Error interno al consultar la disponibilidad: ${error.message}`,
      };
    }
  }

  private async ejecutarConsultarDisponibilidadDocente(args: any): Promise<any> {
    try {
      const { docente_id, periodo } = args;
      this.logger.log(
        `Consultando disponibilidad docente ${docente_id} para período ${periodo}`,
      );

      const docenteId = await this.resolveDocenteId(docente_id);

      const result = await this.disponibilidadService.getByDocente(
        docenteId,
        periodo,
      );

      if (!result || !result.slots || result.slots.length === 0) {
        return {
          message: "El docente no tiene disponibilidad registrada para este período.",
        };
      }

      // Filtrar solo disponibles = true
      const disponibles = result.slots.filter((d: any) => d.disponible);

      return {
        docente_id,
        periodo: periodo,
        total_slots: result.slots.length,
        disponibles: disponibles.length,
        slots: disponibles.map((d: any) => ({
          dia: d.dia_semana,
          hora_inicio: d.hora_inicio?.substring(0, 5),
          hora_fin: d.hora_fin?.substring(0, 5),
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `Error consultando disponibilidad docente: ${error.message}`,
        error.stack,
      );
      return {
        error: `Error al consultar disponibilidad del docente: ${error.message}`,
      };
    }
  }

  private async ejecutarConsultarHorariosDocente(args: any): Promise<any> {
    try {
      const { docente_id, periodo: periodoStr } = args;
      this.logger.log(
        `Consultando horarios del docente ${docente_id} para período ${periodoStr}`,
      );

      const docenteId = await this.resolveDocenteId(docente_id);

      // Obtener el período
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: periodoStr },
      });
      if (!periodo) {
        return {
          error: `Período ${periodoStr} no encontrado`,
        };
      }

      const horarios = await this.horariosService.findHorariosByDocenteId(
        docenteId,
        periodoStr,
      );

      if (!horarios || horarios.length === 0) {
        return {
          message: "El docente no tiene horarios asignados para este período.",
        };
      }

      return {
        docente_id: docenteId,
        periodo: periodoStr,
        horarios: horarios.map((h) => ({
          dia: h.dia,
          hora_inicio: h.hora_inicio?.substring(0, 5),
          hora_fin: h.hora_fin?.substring(0, 5),
          ambiente: h.ambiente?.codigo,
          curso: h.curso?.codigo,
          tipo_clase: h.tipo_clase,
        })),
        total: horarios.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Error consultando horarios docente: ${error.message}`,
        error.stack,
      );
      return {
        error: `Error al consultar horarios del docente: ${error.message}`,
      };
    }
  }

  private async ejecutarVerificarConflictosAmbiente(args: any): Promise<any> {
    try {
      const { ambiente_id, dia, hora_inicio, hora_fin, periodo: periodoStr } = args;
      this.logger.log(
        `Verificando conflictos en ambiente ${ambiente_id} día ${dia} ${hora_inicio}-${hora_fin} período ${periodoStr}`,
      );

      const ambienteId = await this.resolveAmbienteId(ambiente_id);

      // Obtener el período
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: periodoStr },
      });
      if (!periodo) {
        return {
          error: `Período ${periodoStr} no encontrado`,
        };
      }

      // Buscar horarios en ese ambiente y período
      const result = await this.horariosService.findByAmbiente(
        ambienteId,
        periodoStr,
        1,
        1000,
      );

      const conflictos = result.items
        .filter((h: any) => h.dia === dia)
        .filter((h: any) => {
          const ini = h.hora_inicio?.substring(0, 5);
          const fin = h.hora_fin?.substring(0, 5);
          return ini < hora_fin && fin > hora_inicio;
        });

      if (conflictos.length === 0) {
        return {
          tiene_conflicto: false,
          message: "El ambiente está libre en ese horario.",
        };
      }

      return {
        tiene_conflicto: true,
        conflictos: conflictos.map((c: any) => ({
          dia: c.dia,
          hora_inicio: c.hora_inicio?.substring(0, 5),
          hora_fin: c.hora_fin?.substring(0, 5),
          curso: c.curso?.codigo,
          docente: c.docente
            ? `${c.docente.apellidos}, ${c.docente.nombres}`
            : null,
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `Error verificando conflictos ambiente: ${error.message}`,
        error.stack,
      );
      return {
        error: `Error al verificar conflictos: ${error.message}`,
      };
    }
  }

  private async ejecutarConsultarAsignacionesLectivas(args: any): Promise<any> {
    try {
      const { docente_id, periodo: periodoStr } = args;
      this.logger.log(
        `Consultando asignaciones lectivas del docente ${docente_id} para período ${periodoStr}`,
      );

      const docenteId = await this.resolveDocenteId(docente_id);

      // Obtener el período
      const periodo = await this.periodoRepo.findOne({
        where: { codigo: periodoStr },
      });
      if (!periodo) {
        return {
          error: `Período ${periodoStr} no encontrado`,
        };
      }

      const asignaciones = await this.asignacionLectivaService.findByDocente(
        docenteId,
        periodo.id,
      );

      if (!asignaciones || asignaciones.length === 0) {
        return {
          message: "El docente no tiene asignaciones lectivas para este período.",
        };
      }

      return {
        asignaciones: asignaciones.map((a) => ({
          curso: a.curso_plan?.curso?.codigo,
          nombre_curso: a.curso_plan?.curso?.nombre,
          tipo_clase: a.tipo_clase,
          horas_asignadas: a.horas_asignadas,
          estado: a.estado,
          tiene_horarios: (a.horas_asignadas ?? 0) > 0,
        })),
        total: asignaciones.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Error consultando asignaciones lectivas: ${error.message}`,
        error.stack,
      );
      return {
        error: `Error al consultar asignaciones lectivas: ${error.message}`,
      };
    }
  }
}