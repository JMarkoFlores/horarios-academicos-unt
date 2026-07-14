import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  userRole?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) { }

  sendMessage(message: string, history: ChatMessage[], userRole?: string): Observable<{ response: string }> {
    const body: ChatRequest = { message, history };
    if (userRole) {
      body.userRole = userRole;
    }
    return this.http.post<{ response: string }>(`${this.apiUrl}/query`, body);
  }

  setChatVisibility(visible: boolean): void {
    localStorage.setItem('chatbot_visible', JSON.stringify(visible));
  }

  getChatVisibility(): boolean {
    const stored = localStorage.getItem('chatbot_visible');
    return stored ? JSON.parse(stored) : true;
  }
}
