import {
  Injectable,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { AmbientesService } from "../ambientes/ambientes.service";
import { FindDisponiblesDto } from "../ambientes/dto/find-disponibles.dto";

// Definición de la herramienta para el LLM
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
];

@Injectable()
export class ChatbotService {
  private groq: Groq;
  private readonly systemPrompts: Record<string, string>;
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private configService: ConfigService,
    private ambientesService: AmbientesService,
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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, usa esta herramienta automáticamente sin anunciarlo.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, pídeselo amablemente al usuario antes de usar la herramienta.
        - Una vez que la herramienta te devuelva los datos, responde directamente con la información formateada, no menciones que usaste una herramienta.

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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.

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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.

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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.

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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.

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
        - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
        - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
        - Extrae los parámetros (tipo, dia, hora_inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
        - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.

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
      'admin': 'admin',
      'administrador': 'admin',
      'administrador_sistema': 'admin',
      'docente': 'docente',
      'coordinador': 'coordinador',
      'coordinador_academico': 'coordinador',
      'operador': 'operador',
      'operador_horarios': 'operador',
      'director': 'director',
      'director_escuela': 'director',
      'director_departamento': 'director',
      'decano': 'director',
    };
    
    const normalized = roleMap[role?.toLowerCase()] || 'default';
    return this.systemPrompts[normalized] ? normalized : 'default';
  }

  async chat(message: string, history: any[] = [], userRole: string = 'default') {
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
    const systemPrompt = this.systemPrompts[normalizedRole] || this.systemPrompts.default;

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.formatHistory(history),
      { role: "user", content: message },
    ];

    try {
      // 1. Primera llamada a Groq para ver si usa una herramienta
      const initialResponse = await this.groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        tools: tools,
        tool_choice: "auto",
      });

      const responseMessage = initialResponse.choices[0]?.message;

      // 2. Si el LLM decide usar una herramienta
      if (responseMessage?.tool_calls) {
        this.logger.log("Groq decidió usar una herramienta. Procesando...");
        messages.push(responseMessage); // Añadir la decisión de la IA al historial

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          if (functionName === "consultar_disponibilidad_ambiente") {
            const toolResult =
              await this.ejecutarConsultaDisponibilidad(functionArgs);

            // Añadir el resultado de la herramienta al historial
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify(toolResult),
            });
          }
        }

        // 3. Segunda llamada a Groq con el resultado de la herramienta
        this.logger.log(
          "Enviando resultado de la herramienta a Groq para obtener respuesta final.",
        );
        const finalResponse = await this.groq.chat.completions.create({
          messages,
          model: "llama-3.1-8b-instant",
        });

        return (
          finalResponse.choices[0]?.message?.content ||
          "No se pudo generar una respuesta."
        );
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
}
