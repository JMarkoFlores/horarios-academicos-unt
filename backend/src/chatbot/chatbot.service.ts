import { Injectable, InternalServerErrorException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class ChatbotService {
  private groq: Groq;
  private readonly systemPrompt: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }

    this.systemPrompt = `
      Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT". 
      Tu objetivo es ayudar a los usuarios (docentes, directores, administrativos) a resolver dudas sobre el funcionamiento del sistema.

      CONOCIMIENTO DEL SISTEMA:
      - Propósito: Gestionar horarios, declaraciones de carga horaria, disponibilidad docente y ambientes.
      - Roles: 
        * Administrador del Sistema: Gestión total, configuración de periodos.
        * Decano/Director: Aprobación de horarios y declaraciones.
        * Docente: Registro de disponibilidad y llenado de declaración de carga horaria.
      - Procesos clave:
        1. Declaración de Carga Horaria: 
           * Sección 1 (Lectivo): Se llena automáticamente desde los horarios.
           * Sección 2 (Preparación): Llenado manual, máximo 50% de las horas lectivas (redondeo hacia abajo).
        2. Disponibilidad: Los docentes marcan sus horas preferidas.
        3. Seeds: El sistema usa seeds para cargar datos base de ciclos impares (I, III, V, VII, IX) al inicio de año.
      - Infraestructura: Usa PostgreSQL (puerto 5433 en Docker) y Redis.

      REGLAS DE RESPUESTA:
      - Sé amable, profesional y conciso.
      - Si no sabes algo específico del sistema, indica que pueden contactar al soporte técnico de la Escuela de Ingeniería de Sistemas.
      - No respondas consultas fuera del ámbito de este sistema.
      - Responde siempre en español.
    `;
  }

  async chat(message: string, history: any[] = []) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey || apiKey === 'tu_api_key_aqui') {
      throw new InternalServerErrorException('API Key de Groq no válida o no configurada en el archivo .env.');
    }

    // Reinicializar si la API KEY cambió o no estaba cargada
    if (!this.groq) {
      this.groq = new Groq({ apiKey });
    }

    // Mapeamos el historial que viene del formato original (Google) al formato que acepta Groq/OpenAI
    const formattedHistory = [
      { role: 'system', content: this.systemPrompt },
      ...(history || [])
        .filter(msg => msg.role && msg.parts && msg.parts[0]?.text)
        .map(msg => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.parts[0].text
        })),
      { role: 'user', content: message }
    ];

    try {
      const completion = await this.groq.chat.completions.create({
        messages: formattedHistory as any,
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Error detallado de Groq API:', error);

      // Si Groq responde con error de límite de peticiones (429)
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit')) {
        throw new HttpException('Servicio de IA sobrecargado (límite de peticiones de Groq). Por favor, intenta de nuevo más tarde.', HttpStatus.TOO_MANY_REQUESTS);
      }

      throw new InternalServerErrorException(`Error al procesar la consulta: ${error.message || 'Desconocido'}`);
    }
  }
}
