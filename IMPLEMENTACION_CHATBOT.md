# Implementación del Asistente IA - Análisis y Mejoras

## Estado Actual - Cambios Implementados

### Backend (NestJS + Groq) - ✅ Completados

**Archivos modificados:**
- `backend/src/chatbot/chatbot.controller.ts` - Agregado ThrottlerGuard
- `backend/src/chatbot/chatbot.service.ts` - Corregido parámetro hora_inicio, mejorado system prompt
- `backend/src/chatbot/chatbot.module.ts` - Agregado ThrottlerModule
- `backend/package.json` - Agregada dependencia @nestjs/throttler

**Mejoras implementadas:**
- ✅ **B2-10:** Corregido parámetro `hor-inicio` → `hora_inicio` para consistencia
- ✅ **B2-2:** System prompt mejorado con contexto del sistema UNT, módulos, roles, periodos, tipos de ambientes, días, horarios, reglas de respuesta, y ejemplos de consultas
- ✅ **B2-4:** Rate limiting implementado con @nestjs/throttler (20 peticiones/minuto por usuario)

**Pendientes (prioridad media):**
- ⏳ B2-7: Validación robusta de parámetros (zod)
- ⏳ B2-3: Agregar más herramientas (cursos, docentes, horarios)
- ⏳ B2-6: Logging estructurado con métricas

### Frontend (Angular + Angular Material) - ✅ Completados

**Archivos modificados:**
- `frontend/src/app/modules/chatbot/chatbot.component.ts` - Agregado DOMPurify, persistencia de historial, manejo de errores mejorado, indicador de conexión, sugerencias, TTS toggle, envío de rol de usuario
- `frontend/src/app/modules/chatbot/chatbot.component.html` - Agregado botón limpiar historial, indicador de conexión, sugerencias, botón TTS toggle
- `frontend/src/app/modules/chatbot/chatbot.component.scss` - Glassmorphism, dark mode, estilos mejorados, TTS active state
- `frontend/src/app/modules/chatbot/chatbot.service.ts` - Agregado parámetro userRole a sendMessage
- `frontend/package.json` - Agregadas dependencias dompurify y @types/dompurify

**Mejoras implementadas:**
- ✅ **F2-12:** Sanitización HTML con DOMPurify para prevenir XSS
- ✅ **F2-1:** Persistencia del historial en localStorage (con límite de 50 mensajes)
- ✅ **F2-7:** Botón para limpiar historial
- ✅ **F2-2:** Manejo de errores mejorado con retry(2) y mensajes específicos (429, 401, offline, servidor)
- ✅ **F2-3:** Indicador de conexión (wifi/wifi_off) en el header
- ✅ **F2-5:** Diseño glassmorphism con backdrop-filter, sombras modernas, bordes suaves
- ✅ **F2-11:** Soporte para dark mode con variables CSS
- ✅ **F2-6:** Sugerencias de preguntas rápidas (4 sugerencias predefinidas)
- ✅ **TTS desactivado por defecto:** TTS ahora está desactivado por defecto con botón toggle para activar/desactivar
- ✅ **Envío de rol de usuario:** El frontend envía el rol del usuario al backend para respuestas personalizadas

**Pendientes (prioridad media):**
- ⏳ F2-4: Implementar streaming
- ⏳ F2-8: Botón de copiar respuestas
- ⏳ F2-10: Configuración de TTS (velocidad, voz)
- ⏳ F2-9: Mejorar accesibilidad (ARIA labels, keyboard navigation)

---

## Estado Original (Para Referencia)

### Backend (NestJS + Groq)

**Archivos:**
- `backend/src/chatbot/chatbot.controller.ts`
- `backend/src/chatbot/chatbot.service.ts`
- `backend/src/chatbot/chatbot.module.ts`
- `backend/src/chatbot/dto/chat-request.dto.ts`

**Características actuales:**
- Usa Groq SDK con modelo `llama-3.3-70b-versatile` (primera llamada) y `llama-3.1-8b-instant` (segunda llamada)
- Una herramienta: `consultar_disponibilidad_ambiente`
- System prompt básico
- Manejo de errores básico
- Formato de historial: `{ role: "user" | "model", parts: [{ text: string }] }`

**Problemas identificados:**

#### Backend - Errores y Limitaciones

1. **B1-1: Dependencia única de Groq**
   - No hay soporte para múltiples proveedores (Gemini, OpenAI, etc.)
   - Si Groq falla, no hay fallback

2. **B1-2: System prompt básico**
   - Falta contexto específico del sistema UNT
   - No tiene información sobre roles, facultades, periodos académicos
   - No tiene ejemplos de consultas frecuentes

3. **B1-3: Herramientas limitadas**
   - Solo consulta disponibilidad de ambientes
   - Falta: consultar cursos, docentes, horarios, asignaciones, declaraciones
   - No hay herramientas para información general del sistema

4. **B1-4: Sin rate limiting**
   - No hay límite de peticiones por usuario
   - Vulnerable a abuso y costos excesivos

5. **B1-5: Sin caché**
   - Preguntas frecuentes se procesan cada vez
   - Desperdicio de tokens y tiempo

6. **B1-6: Logging básico**
   - Solo usa `Logger` de NestJS
   - No hay logs estructurados para análisis
   - No tracking de métricas (tiempo de respuesta, tokens usados)

7. **B1-7: Validación débil de parámetros**
   - El mapeo de tipos de ambiente es manual y limitado
   - No valida que el día sea válido
   - No valida formato de horas

8. **B1-8: Sin streaming**
   - Respuestas completas solo al final
   - Mala experiencia de usuario para respuestas largas

9. **B1-9: Sin contexto de usuario**
   - No pasa información del usuario (rol, facultad, periodo)
   - Respuestas genéricas sin personalización

10. **B1-10: Error en formato de parámetros**
    - El parámetro se llama `hor-inicio` en la herramienta pero `horaInicio` en el DTO
    - Inconsistencia que puede causar errores

### Frontend (Angular + Angular Material)

**Archivos:**
- `frontend/src/app/modules/chatbot/chatbot.component.ts`
- `frontend/src/app/modules/chatbot/chatbot.component.html`
- `frontend/src/app/modules/chatbot/chatbot.component.scss`
- `frontend/src/app/modules/chatbot/chatbot.service.ts`
- `frontend/src/app/modules/chatbot/chatbot.module.ts`

**Características actuales:**
- Chat flotante con FAB
- Reconocimiento de voz (Web Speech API)
- Síntesis de voz (TTS)
- Formato básico de markdown (negritas, código)
- Persistencia de visibilidad en localStorage

**Problemas identificados:**

#### Frontend - Errores y Limitaciones

1. **F1-1: Sin persistencia del historial**
   - El historial se pierde al recargar la página
   - Usuario pierde contexto de conversación

2. **F1-2: Manejo de errores básico**
   - Solo muestra mensaje genérico
   - No distingue entre tipos de error (red, API, validación)
   - No reintenta automáticamente

3. **F1-3: Sin indicador de conexión**
   - Usuario no sabe si hay problemas de red
   - No hay feedback visual del estado

4. **F1-4: Sin streaming**
   - Espera respuesta completa antes de mostrar
   - Mala UX para respuestas largas

5. **F1-5: Diseño básico**
   - Colores hardcodeados (#1a237e)
   - No usa variables CSS del tema
   - No tiene glassmorphism ni animaciones modernas
   - No responsive optimizado

6. **F1-6: Sin sugerencias de preguntas**
   - Usuario no sabe qué preguntar
   - No hay quick actions

7. **F1-7: Sin opción de limpiar historial**
   - No se puede reiniciar conversación
   - Historial acumula indefinidamente

8. **F1-8: Sin opción de copiar respuestas**
   - Usuario no puede copiar texto fácilmente
   - No hay botón de copiar

9. **F1-9: Accesibilidad limitada**
   - No hay ARIA labels
   - No hay keyboard navigation completa
   - No hay focus management

10. **F1-10: Síntesis de voz no configurable**
    - No hay opción de desactivar TTS
    - No hay selección de voz
    - No hay control de velocidad

11. **F1-11: Sin modo oscuro/claro**
    - No se adapta al tema de la aplicación
    - Header color hardcodeado

12. **F1-12: Vulnerabilidad XSS**
    - Usa `innerHTML` con `formatResponse`
    - Aunque escapa HTML básico, no es suficiente
    - Debería usar DOMPurify o similar

## Mejoras Propuestas

### Backend - Mejoras Prioritarias

#### B2-1: Soporte para múltiples proveedores de IA
```typescript
// Crear factory para proveedores
interface AIProvider {
  chat(messages: any[], options?: any): Promise<any>;
  streamChat(messages: any[], options?: any): AsyncIterable<any>;
}

class GroqProvider implements AIProvider { }
class GeminiProvider implements AIProvider { }
class OpenAIProvider implements AIProvider { }
```

#### B2-2: System mejorado con contexto del sistema
```typescript
const SYSTEM_PROMPT = `
Eres el asistente virtual inteligente del "Sistema de Gestión de Horarios Académicos - UNT".

CONTEXTO DEL SISTEMA:
- Sistema para gestionar horarios académicos de la Universidad Nacional de Trujillo
- Módulos principales: Docentes, Cursos, Ambientes, Horarios, Disponibilidad, Declaraciones
- Roles: admin, director, coordinador, operador, docente
- Periodos académicos: semestrales (I, II, III, V, VII, IX)
- Tipos de ambientes: AULA, LABORATORIO, AUDITORIO, SALA_COMPUTACION
- Días: lunes, martes, miércoles, jueves, viernes, sábado, domingo

REGLAS DE RESPUESTA:
- Sé amable, profesional y conciso
- Si no sabes algo, indica que pueden contactar al soporte técnico
- No respondas consultas fuera del ámbito de este sistema
- Responde siempre en español
- Usa formato markdown para mejorar legibilidad
- Si la respuesta es larga, usa viñetas y secciones

EJEMPLOS DE CONSULTAS:
- "¿Qué aulas están libres el lunes de 14:00 a 16:00?"
- "¿Qué cursos imparte el docente Pérez?"
- "¿Cuál es mi horario de este semestre?"
- "¿Cómo declaro mi carga lectiva?"
`;
```

#### B2-3: Agregar más herramientas
```typescript
const tools = [
  // Existente
  consultar_disponibilidad_ambiente,
  
  // Nuevas herramientas
  consultar_cursos_docente,
  consultar_horarios_curso,
  consultar_disponibilidad_docente,
  consultar_informacion_curso,
  consultar_periodo_actual,
  consultar_declaraciones_usuario,
];
```

#### B2-4: Implementar rate limiting
```typescript
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto
      limit: 10,  // 10 peticiones por minuto
    }]),
  ],
})
export class ChatbotModule {}

@UseGuards(ThrottlerGuard)
@Controller('chatbot')
export class ChatbotController {}
```

#### B2-5: Implementar caché con Redis
```typescript
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 3600, // 1 hora
    }),
  ],
})
export class ChatbotModule {}

// En el servicio
async chat(message: string, history: any[] = []) {
  const cacheKey = `chat:${hash(message)}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;
  
  const response = await this.processChat(message, history);
  await this.cacheManager.set(cacheKey, response);
  return response;
}
```

#### B2-6: Logging estructurado con métricas
```typescript
import { LoggerService } from '@nestjs/common';

class ChatbotLogger implements LoggerService {
  log(message: string, context?: string, meta?: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: 'Chatbot',
      message,
      ...meta,
    }));
  }
  
  // ... otros métodos
}

// Métricas
const metrics = {
  requestCount: 0,
  avgResponseTime: 0,
  totalTokens: 0,
  toolCalls: 0,
};
```

#### B2-7: Validación robusta de parámetros
```typescript
import { z } from 'zod';

const DisponibilidadSchema = z.object({
  tipo: z.enum(['AULA', 'LABORATORIO', 'AUDITORIO', 'SALA_COMPUTACION']),
  dia: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  horaInicio: z.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  horaFin: z.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
}).refine(data => data.horaInicio < data.horaFin, {
  message: "horaInicio debe ser menor que horaFin",
});
```

#### B2-8: Implementar streaming
```typescript
async chatStream(message: string, history: any[] = []) {
  const stream = await this.groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    stream: true,
  });
  
  return stream; // AsyncIterable
}
```

#### B2-9: Agregar contexto de usuario
```typescript
interface ChatRequestDto {
  message: string;
  history?: ChatMessage[];
  userContext?: {
    id: number;
    rol: string;
    facultad?: string;
    periodoActual?: string;
  };
}

// Inyectar en system prompt
const contextualPrompt = `
${SYSTEM_PROMPT}

CONTEXTO DEL USUARIO ACTUAL:
- Rol: ${userContext.rol}
- Facultad: ${userContext.facultad || 'No especificada'}
- Periodo actual: ${userContext.periodoActual || 'No especificado'}
`;
```

#### B2-10: Corregir parámetro hora_inicio
```typescript
// Corregir en la definición de la herramienta
hora_inicio: {
  type: "string",
  description: 'La hora de inicio del rango de búsqueda, en formato HH:mm (24 horas). Por ejemplo: "15:00".',
},

// Y en la ejecución
const params: FindDisponiblesDto = {
  tipo: tipo,
  dia: args.dia,
  horaInicio: args.hora_inicio, // Corregido
  horaFin: args.hora_fin,
};
```

### Frontend - Mejoras Prioritarias

#### F2-1: Persistencia del historial en localStorage
```typescript
private readonly HISTORY_KEY = 'chatbot_history';

ngOnInit(): void {
  const saved = localStorage.getItem(this.HISTORY_KEY);
  if (saved) {
    this.history = JSON.parse(saved);
  }
}

private saveHistory(): void {
  localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history));
}

clearHistory(): void {
  this.history = [];
  localStorage.removeItem(this.HISTORY_KEY);
}
```

#### F2-2: Manejo de errores mejorado
```typescript
sendMessage() {
  // ... código existente
  
  this.chatbotService.sendMessage(userMsg, this.history.slice(0, -1)).pipe(
    retry(2),
    catchError((error) => {
      let errorMsg = 'Lo siento, he tenido un problema técnico.';
      
      if (error.status === 429) {
        errorMsg = 'El servicio está saturado. Por favor, espera unos minutos.';
      } else if (error.status === 401) {
        errorMsg = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (!navigator.onLine) {
        errorMsg = 'No tienes conexión a internet.';
      }
      
      this.notifService.error(errorMsg);
      return of({ response: errorMsg });
    })
  ).subscribe({
    // ... manejo de respuesta
  });
}
```

#### F2-3: Indicador de conexión
```typescript
isOnline = true;

ngOnInit(): void {
  this.isOnline = navigator.onLine;
  window.addEventListener('online', () => this.isOnline = true);
  window.addEventListener('offline', () => this.isOnline = false);
}

// En HTML
<div class="connection-status" [class.offline]="!isOnline">
  <mat-icon>{{ isOnline ? 'wifi' : 'wifi_off' }}</mat-icon>
</div>
```

#### F2-4: Implementar streaming
```typescript
async sendMessageStream() {
  this.isLoading = true;
  
  const response = await fetch(`${this.apiUrl}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: this.userInput, history: this.history }),
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  this.history.push({ role: 'model', parts: [{ text: '' }] });
  const currentMsg = this.history[this.history.length - 1];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    currentMsg.parts[0].text += chunk;
    this.cdr.detectChanges();
  }
  
  this.isLoading = false;
}
```

#### F2-5: Diseño mejorado con glassmorphism
```scss
.chat-window {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  .chat-header {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  }
  
  .message-bubble {
    backdrop-filter: blur(10px);
  }
}

.dark-theme .chat-window {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### F2-6: Sugerencias de preguntas
```typescript
suggestions = [
  '¿Qué aulas están libres hoy?',
  '¿Cuál es mi horario?',
  '¿Cómo declaro mi carga?',
  '¿Qué cursos hay disponibles?',
];

// En HTML
<div class="suggestions">
  <button *ngFor="let suggestion of suggestions" 
          mat-stroked-button 
          (click)="useSuggestion(suggestion)">
    {{ suggestion }}
  </button>
</div>
```

#### F2-7: Opción de limpiar historial
```typescript
// En HTML
<button mat-icon-button (click)="clearHistory()" title="Limpiar conversación">
  <mat-icon>delete_sweep</mat-icon>
</button>
```

#### F2-8: Botón de copiar
```typescript
copyToClipboard(text: string, index: number) {
  navigator.clipboard.writeText(text);
  this.copiedIndex = index;
  setTimeout(() => this.copiedIndex = -1, 2000);
}

// En HTML
<button mat-icon-button (click)="copyToClipboard(msg.parts[0].text, i)" 
        [matTooltip]="copiedIndex === i ? '¡Copiado!' : 'Copiar'">
  <mat-icon>{{ copiedIndex === i ? 'check' : 'content_copy' }}</mat-icon>
</button>
```

#### F2-9: Mejorar accesibilidad
```html
<button mat-fab 
        class="chatbot-fab" 
        (click)="toggleChat()" 
        *ngIf="!isOpen"
        aria-label="Abrir asistente de IA"
        matTooltip="Asistente IA">
  <mat-icon>smart_toy</mat-icon>
</button>

<div class="chat-window" 
     [class.open]="isOpen"
     role="dialog"
     aria-label="Ventana de chat con asistente">
  <!-- ... -->
</div>
```

#### F2-10: Configuración de TTS
```typescript
ttsEnabled = true;
ttsVoice: SpeechSynthesisVoice | null = null;

ngOnInit(): void {
  const voices = this.synth.getVoices();
  this.ttsVoice = voices.find(v => v.lang === 'es-PE') || voices[0];
}

toggleTTS(): void {
  this.ttsEnabled = !this.ttsEnabled;
  if (!this.ttsEnabled) this.synth.cancel();
}

speakText(text: string) {
  if (!this.ttsEnabled || !this.synth) return;
  // ... código existente
}
```

#### F2-11: Modo oscuro/claro
```scss
.chat-header {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.dark-theme .chat-header {
  background: linear-gradient(135deg, #1a237e, #311b92);
}
```

#### F2-12: Sanitización HTML con DOMPurify
```typescript
import DOMPurify from 'dompurify';

formatResponse(text: string): string {
  if (!text) return '';
  
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/^[*\-]\s+(.*?)$/gm, '• $1');
  html = html.replace(/\n/g, '<br>');
  
  return DOMPurify.sanitize(html);
}
```

## Plan de Implementación

### Fase 1: Backend - Correcciones Críticas (Prioridad Alta)
1. Corregir parámetro `hor-inicio` → `hora_inicio` (B2-10)
2. Mejorar system prompt con contexto del sistema (B2-2)
3. Implementar rate limiting (B2-4)
4. Validación robusta de parámetros (B2-7)

### Fase 2: Backend - Mejoras Funcionales (Prioridad Alta)
5. Agregar más herramientas (cursos, docentes, horarios) (B2-3)
6. Agregar contexto de usuario (B2-9)
7. Logging estructurado con métricas (B2-6)

### Fase 3: Backend - Mejoras Avanzadas (Prioridad Media)
8. Implementar caché con Redis (B2-5)
9. Soporte para múltiples proveedores (B2-1)
10. Implementar streaming (B2-8)

### Fase 4: Frontend - Correcciones Críticas (Prioridad Alta)
1. Sanitización HTML con DOMPurify (F2-12)
2. Persistencia del historial (F2-1)
3. Manejo de errores mejorado (F2-2)
4. Indicador de conexión (F2-3)

### Fase 5: Frontend - Mejoras UX (Prioridad Alta)
5. Diseño mejorado con glassmorphism (F2-5)
6. Modo oscuro/claro (F2-11)
7. Sugerencias de preguntas (F2-6)
8. Opción de limpiar historial (F2-7)

### Fase 6: Frontend - Mejoras Avanzadas (Prioridad Media)
9. Implementar streaming (F2-4)
10. Botón de copiar (F2-8)
11. Configuración de TTS (F2-10)
12. Mejorar accesibilidad (F2-9)

## Dependencias Requeridas

### Backend
```bash
npm install @nestjs/throttler cache-manager cache-manager-redis-store zod
npm install --save-dev @types/cache-manager
```

### Frontend
```bash
npm install dompurify @types/dompurify
```

## Notas Adicionales

- Antes de implementar streaming, verificar que el frontend tiene soporte para Server-Sent Events (SSE)
- Para Redis, asegurar que el servicio esté corriendo en Docker Compose
- Considerar agregar tests unitarios para las herramientas del chatbot
- Documentar las nuevas herramientas en Swagger/OpenAPI
- Considerar agregar analytics para rastrear las consultas más frecuentes
