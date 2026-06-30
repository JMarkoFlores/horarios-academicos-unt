import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { ChatbotService, ChatMessage } from './chatbot.service';
import DOMPurify from 'dompurify';
import { catchError, retry } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isVisible = true;
  isOpen = false;
  isLoading = false;
  userInput = '';
  history: ChatMessage[] = [];
  private readonly HISTORY_KEY = 'chatbot_history';
  private readonly MAX_HISTORY_ITEMS = 50;
  isOnline = true;
  suggestions = [
    '¿Qué aulas están libres hoy?',
    '¿Cuál es mi horario?',
    '¿Cómo declaro mi carga?',
    '¿Qué cursos hay disponibles?',
  ];

  private roleSuggestions: Record<string, string[]> = {
    admin: [
      '¿Cómo genero un reporte de horarios?',
      '¿Cómo configuro un nuevo periodo académico?',
      '¿Qué aulas están libres hoy?',
      '¿Cómo gestiono los usuarios del sistema?',
    ],
    docente: [
      '¿Cuál es mi horario de este semestre?',
      '¿Cómo declaro mi carga lectiva?',
      '¿Qué cursos me han sido asignados?',
      '¿Cuál es mi disponibilidad actual?',
    ],
    coordinador: [
      '¿Qué aulas están libres hoy?',
      '¿Cómo asigno un horario a un docente?',
      '¿Qué docentes tienen carga pendiente?',
      '¿Cómo verifico las declaraciones de carga?',
    ],
    operador: [
      '¿Qué aulas están libres hoy?',
      '¿Cómo abro una ventana de asignación?',
      '¿Qué docentes están en cola para asignar?',
      '¿Cómo controlo el sistema de turnos?',
    ],
    director: [
      '¿Qué aulas están libres hoy?',
      '¿Cómo genero un reporte de horarios?',
      '¿Qué docentes no han declarado su carga?',
      '¿Cuál es el estado de la asignación?',
    ],
  };

  isListening = false;
  speechSupported = false;
  isSpeaking = false;
  ttsEnabled = false; // Desactivado por defecto
  recognition: any;
  synth: SpeechSynthesis;

  constructor(private chatbotService: ChatbotService, private cdr: ChangeDetectorRef, private authService: AuthService) { 
    this.synth = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.speechSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-PE';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.userInput = transcript;
        this.cdr.detectChanges();
        this.sendMessage(); // Enviar automáticamente
      };

      this.recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        this.isListening = false;
        this.cdr.detectChanges();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.cdr.detectChanges();
      };
    }
  }

  toggleListening() {
    if (!this.speechSupported) return;

    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.error('El micrófono no pudo iniciar:', e);
      }
    }
  }

  speakText(text: string) {
    if (!this.ttsEnabled || !this.synth) return;
    
    // Detener cualquier audio previo
    this.synth.cancel();

    // Limpiar formato markdown básico antes de leer
    const plainText = text.replace(/[*_~`]/g, '').replace(/<[^>]*>?/gm, '');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'es-PE';
    utterance.rate = 1;
    
    this.isSpeaking = true;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.cdr.detectChanges();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.cdr.detectChanges();
    };
    
    this.synth.speak(utterance);
  }

  toggleTTS(): void {
    this.ttsEnabled = !this.ttsEnabled;
    if (!this.ttsEnabled) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  ngOnInit(): void {
    this.isVisible = this.chatbotService.getChatVisibility();
    
    // Cargar historial desde localStorage
    this.loadHistory();
    
    // Cargar sugerencias según rol
    this.loadRoleSuggestions();
    
    // Escuchar cambios de visibilidad desde el servicio (para el menú)
    window.addEventListener('storage', (event) => {
      if (event.key === 'chatbot_visible') {
        this.isVisible = this.chatbotService.getChatVisibility();
      }
    });
    
    // Escuchar cambios de conexión
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.cdr.detectChanges();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.cdr.detectChanges();
    });
  }

  private loadRoleSuggestions(): void {
    const user = this.authService.getUsuarioActual();
    const userRole = user?.rol || 'default';
    const normalizedRole = this.normalizeRole(userRole);
    
    if (this.roleSuggestions[normalizedRole]) {
      this.suggestions = this.roleSuggestions[normalizedRole];
    }
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
    
    return roleMap[role?.toLowerCase()] || 'default';
  }

  private loadHistory(): void {
    try {
      const saved = localStorage.getItem(this.HISTORY_KEY);
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error al cargar historial:', e);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.error('Error al guardar historial:', e);
    }
  }

  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(this.HISTORY_KEY);
    this.cdr.detectChanges();
  }

  useSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  hideChatPermanently() {
    this.isVisible = false;
    this.isOpen = false;
    this.chatbotService.setChatVisibility(false);
    // Disparar evento para que otros componentes se enteren
    window.dispatchEvent(new Event('chatbotVisibilityChanged'));
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const userMsg = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    // Agregar al historial local
    this.history.push({ role: 'user', parts: [{ text: userMsg }] });
    this.saveHistory();

    // Obtener rol del usuario
    const user = this.authService.getUsuarioActual();
    const userRole = user?.rol || 'default';

    this.chatbotService.sendMessage(userMsg, this.history.slice(0, -1), userRole).pipe(
      retry(2),
      catchError((err) => {
        console.error('Chatbot error:', err);
        let errorMsg = 'Lo siento, he tenido un problema técnico. Por favor, intenta de nuevo más tarde.';
        
        if (err.status === 429) {
          errorMsg = 'El servicio está saturado. Por favor, espera unos minutos antes de intentar nuevamente.';
        } else if (err.status === 401) {
          errorMsg = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (!navigator.onLine) {
          errorMsg = 'No tienes conexión a internet. Por favor, verifica tu conexión.';
        } else if (err.status === 0) {
          errorMsg = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión.';
        }
        
        this.history.push({ 
          role: 'model', 
          parts: [{ text: errorMsg }] 
        });
        this.saveHistory();
        this.speakText(errorMsg);
        this.isLoading = false;
        return of({ response: errorMsg });
      })
    ).subscribe({
      next: (res: any) => {
        console.log('Respuesta cruda del backend:', res);
        // El backend NestJS usa un interceptor que envuelve la respuesta en { data: ... }
        const backendText = res?.data?.response || res?.response || ' ';
        this.history.push({ role: 'model', parts: [{ text: backendText }] });
        
        // Limitar tamaño del historial
        if (this.history.length > this.MAX_HISTORY_ITEMS) {
          this.history = this.history.slice(-this.MAX_HISTORY_ITEMS);
        }
        
        this.saveHistory();
        this.speakText(backendText);
        this.isLoading = false;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  formatResponse(text: string): string {
    if (!text) return '';
    // Escapar caracteres HTML básicos para prevenir problemas de renderizado y XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Negritas: **texto** -> <strong>texto</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Código: `código` -> <code>código</code>
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Formatear viñetas: líneas que inician con * o -
    html = html.replace(/^[*\-]\s+(.*?)$/gm, '• $1');

    // Convertir saltos de línea en etiquetas <br> para HTML
    html = html.replace(/\n/g, '<br>');

    // Sanitizar HTML para prevenir XSS
    return DOMPurify.sanitize(html);
  }
}
