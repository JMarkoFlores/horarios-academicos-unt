import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { ChatbotService, ChatMessage } from './chatbot.service';

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

  isListening = false;
  speechSupported = false;
  isSpeaking = false;
  recognition: any;
  synth: SpeechSynthesis;

  constructor(private chatbotService: ChatbotService, private cdr: ChangeDetectorRef) { 
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
    if (!this.synth) return;
    
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

  ngOnInit(): void {
    this.isVisible = this.chatbotService.getChatVisibility();
    
    // Escuchar cambios de visibilidad desde el servicio (para el menú)
    window.addEventListener('storage', (event) => {
      if (event.key === 'chatbot_visible') {
        this.isVisible = this.chatbotService.getChatVisibility();
      }
    });
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

    this.chatbotService.sendMessage(userMsg, this.history.slice(0, -1)).subscribe({
      next: (res: any) => {
        console.log('Respuesta cruda del backend:', res);
        // El backend NestJS usa un interceptor que envuelve la respuesta en { data: ... }
        const backendText = res?.data?.response || res?.response || ' ';
        this.history.push({ role: 'model', parts: [{ text: backendText }] });
        this.speakText(backendText);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Chatbot error:', err);
        const errorMsg = 'Lo siento, he tenido un problema técnico. Por favor, intenta de nuevo más tarde.';
        this.history.push({ 
          role: 'model', 
          parts: [{ text: errorMsg }] 
        });
        this.speakText(errorMsg);
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

    return html;
  }
}
