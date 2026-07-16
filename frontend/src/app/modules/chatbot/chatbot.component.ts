import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { ChatbotService, ChatMessage } from './chatbot.service';
import DOMPurify from 'dompurify';
import { catchError, retry } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { takeUntil } from 'rxjs/operators';
import { ASSISTANT_AVATAR_URL } from '../../core/constants/assistant-avatar';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Estado
  isVisible = true;
  readonly assistantAvatarUrl = ASSISTANT_AVATAR_URL;
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
  isListening = false;
  speechSupported = false;
  isSpeaking = false;
  ttsEnabled = false;
  isDarkTheme = false;
  private recognition: any;
  private synth: SpeechSynthesis;
  private destroy$ = new Subject<void>();
  lastToolResult: any = null;

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

  connectionStatus = 'Conectado';

  constructor(
    private chatbotService: ChatbotService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {
    this.synth = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.speechSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-PE';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.zoneRun(() => {
          this.userInput = transcript;
          this.isListening = false;
          this.cdr.detectChanges();
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.zoneRun(() => {
          this.isListening = false;
          this.cdr.detectChanges();
        });
      };

      this.recognition.onend = () => {
        this.zoneRun(() => {
          this.isListening = false;
          this.cdr.detectChanges();
        });
      };
    }
  }

  private zoneRun(fn: () => void): void {
    // Angular's zone will catch this automatically in most cases
    fn();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.toggleChat();
    }
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      if (!this.isOpen) this.toggleChat();
    }
  }

  ngOnInit(): void {
    this.isDarkTheme = document.documentElement.classList.contains('dark') || 
                       localStorage.getItem('theme') === 'dark';
    
    this.isVisible = this.chatbotService.getChatVisibility();
    this.loadHistory();
    this.loadRoleSuggestions();

    // Escuchar cambios de visibilidad
    window.addEventListener('storage', (event) => {
      if (event.key === 'chatbot_visible') {
        this.isVisible = this.chatbotService.getChatVisibility();
        this.cdr.detectChanges();
      }
    });

    // Abrir desde topbar
    window.addEventListener('openChatbot', () => {
      this.isVisible = true;
      this.isOpen = true;
      this.chatbotService.setChatVisibility(true);
      this.cdr.detectChanges();
    });

    // Recibir pregunta pre-llenada (desde sugerencias IA)
    window.addEventListener('chatbot:ask', ((event: CustomEvent) => {
      const { question } = event.detail || {};
      if (question) {
        this.isVisible = true;
        this.isOpen = true;
        this.chatbotService.setChatVisibility(true);
        this.userInput = question;
        this.cdr.detectChanges();
        setTimeout(() => this.sendMessage(), 100);
      }
    }) as EventListener);

    // Conexión
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.connectionStatus = 'Conectado';
      this.cdr.detectChanges();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.connectionStatus = 'Sin conexión';
      this.cdr.detectChanges();
    });

    // Detectar tema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      this.isDarkTheme = e.matches;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.recognition) {
      this.recognition.abort();
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // ==================== UI Methods ====================

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.chatbotService.setChatVisibility(true);
    }
    this.cdr.detectChanges();
  }

  hideChatPermanently(): void {
    this.isVisible = false;
    this.isOpen = false;
    this.chatbotService.setChatVisibility(false);
    this.cdr.detectChanges();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    document.documentElement.classList.toggle('dark', this.isDarkTheme);
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }

  clearHistory(): void {
    this.history = [];
    this.lastToolResult = null;
    localStorage.removeItem(this.HISTORY_KEY);
    this.loadRoleSuggestions();
    this.cdr.detectChanges();
  }

  toggleTTS(): void {
    this.ttsEnabled = !this.ttsEnabled;
    if (!this.ttsEnabled) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  // ==================== Message Handling ====================

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      parts: [{ text }],
    };

    this.history.push(userMsg);
    this.userInput = '';
    this.isLoading = true;
    this.lastToolResult = null;
    this.saveHistory();
    this.cdr.detectChanges();
    this.scheduleScrollToBottom();

    const userRole = this.authService.getUsuarioActual()?.rol || 'default';
    const normalizedRole = this.normalizeRole(userRole);

    this.chatbotService.sendMessage(text, this.history.slice(0, -1), normalizedRole)
      .pipe(
        takeUntil(this.destroy$),
        retry(1),
        catchError(err => {
          console.error('Chatbot error:', err);
          return of({ 
            response: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, inténtalo de nuevo o contacta al soporte técnico.' 
          });
        })
      )
      .subscribe({
        next: (res: any) => {
          console.log('[Chatbot] Response received:', JSON.stringify(res).substring(0, 200));
          this.zoneRun(() => {
            this.isLoading = false;
            // ResponseInterceptor wraps as { data: { response }, message, statusCode }
            const responseText = res?.data?.response ?? res?.response;
            if (!responseText) {
              console.error('[Chatbot] Empty response object:', res);
              return;
            }
            const botMsg: ChatMessage = {
              role: 'model',
              parts: [{ text: responseText }],
            };
            console.log('[Chatbot] Bot message created, text length:', botMsg.parts[0].text.length);
            this.history.push(botMsg);
            console.log('[Chatbot] History length:', this.history.length);
            this.saveHistory();
            this.cdr.detectChanges();
            this.scheduleScrollToBottom(true);
            console.log('[Chatbot] detectChanges done');

            if (this.ttsEnabled) {
              this.speak(responseText);
            }
          });
        },
        error: (err) => {
          console.error('[Chatbot] Error in subscribe:', err);
          this.zoneRun(() => {
            this.isLoading = false;
            const errorMsg: ChatMessage = {
              role: 'model',
              parts: [{ text: 'Lo siento, ocurrió un error. Por favor, inténtalo de nuevo.' }],
            };
            this.history.push(errorMsg);
            this.saveHistory();
            this.cdr.detectChanges();
            this.scheduleScrollToBottom(true);
          });
        }
      });
  }

  useSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  // ==================== Voice ====================

  toggleListening(): void {
    if (!this.speechSupported || this.isLoading || this.isSpeaking) return;

    if (this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    } else {
      this.isListening = true;
      this.recognition.start();
    }
    this.cdr.detectChanges();
  }

  speak(text: string): void {
    if (!this.ttsEnabled || this.isSpeaking) return;
    
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => this.zoneRun(() => { this.isSpeaking = true; this.cdr.detectChanges(); });
    utterance.onend = () => this.zoneRun(() => { this.isSpeaking = false; this.cdr.detectChanges(); });
    utterance.onerror = () => this.zoneRun(() => { this.isSpeaking = false; this.cdr.detectChanges(); });

    this.synth.speak(utterance);
  }

  // ==================== History ====================

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored).slice(-this.MAX_HISTORY_ITEMS);
      }
    } catch {
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history.slice(-this.MAX_HISTORY_ITEMS)));
    } catch { /* ignore quota exceeded */ }
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
      'administradorsistema': 'admin',
      'coordinadoracademico': 'coordinador',
      'directordepartamento': 'director',
      'directorescuela': 'director',
      'decanofacultad': 'director',
      'secretaria': 'coordinador',
      'operadorhorarios': 'operador',
      'docente': 'docente',
    };
    return roleMap[role] || 'default';
  }

  // ==================== Utils ====================

  formatResponse(text: string): string {
    if (!text) return '';
    
    let html = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'br', 'p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });

    // Convert markdown-like syntax
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    return html;
  }

  formatToolResult(result: any): string {
    if (!result) return '';
    try {
      return DOMPurify.sanitize(JSON.stringify(result, null, 2), { ALLOWED_TAGS: ['code', 'pre', 'br', 'b', 'em'] });
    } catch {
      return String(result);
    }
  }

  dismissToolResult(): void {
    this.lastToolResult = null;
    this.cdr.detectChanges();
  }

  copyMessage(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could show toast notification
    });
  }

  regenerateResponse(lastMsg: ChatMessage): void {
    // Remove last assistant message and re-send user message
    let lastUserIdx = -1;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx > -1) {
      this.history = this.history.slice(0, lastUserIdx + 1);
      this.userInput = this.history[lastUserIdx].parts[0].text;
      this.sendMessage();
    }
  }

  getTime(msg: ChatMessage): string {
    // Could store timestamp in message, for now return current time
    return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  trackByMsg(index: number, msg: ChatMessage): string {
    const text = msg?.parts?.[0]?.text ?? '';
    return `${msg?.role ?? 'unknown'}-${index}-${text.slice(0, 20)}`;
  }

  private scheduleScrollToBottom(smooth = false): void {
    setTimeout(() => this.scrollToBottom(smooth));
  }

  private scrollToBottom(smooth = false): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTo({
        top: this.scrollContainer.nativeElement.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }
}
