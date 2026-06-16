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
          "hor-inicio": {
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
        required: ["tipo", "dia", "hor-inicio", "hora_fin"],
      },
    },
  },
];

@Injectable()
export class ChatbotService {
  private groq: Groq;
  private readonly systemPrompt: string;
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private configService: ConfigService,
    private ambientesService: AmbientesService,
  ) {
    const apiKey = this.configService.get<string>("GROQ_API_KEY");
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }

    this.systemPrompt = `
      Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT". 
      Tu objetivo es ayudar a los usuarios a resolver dudas sobre el funcionamiento del sistema y a realizar consultas específicas.

      REGLAS DE RESPUESTA:
      - Sé amable, profesional y conciso.
      - Si no sabes algo, indica que pueden contactar al soporte técnico.
      - No respondas consultas fuera del ámbito de este sistema.
      - Responde siempre en español.

      HERRAMIENTAS DISPONIBLES:
      - Tienes una herramienta llamada 'consultar_disponibilidad_ambiente' para encontrar aulas o laboratorios libres.
      - Cuando un usuario pregunte por disponibilidad, DEBES usar esta herramienta.
      - Extrae los parámetros (tipo, dia, hor-inicio, hora_fin) de la pregunta del usuario para llamar a la herramienta.
      - Si falta algún parámetro, DEBES pedírselo amablemente al usuario antes de usar la herramienta.
      - Una vez que la herramienta te devuelva los datos, formatea el resultado en una respuesta clara y legible para el usuario.
    `;
  }

  async chat(message: string, history: any[] = []) {
    const apiKey = this.configService.get<string>("GROQ_API_KEY");
    if (!apiKey || apiKey === "tu_api_key_aqui") {
      throw new InternalServerErrorException(
        "API Key de Groq no válida o no configurada en el archivo .env.",
      );
    }
    if (!this.groq) {
      this.groq = new Groq({ apiKey });
    }

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt },
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
        horaInicio: args["hor-inicio"],
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
