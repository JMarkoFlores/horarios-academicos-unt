import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EntityType = 'cursos' | 'ambientes' | 'docentes' | 'grupos' | 'docente_curso' | 'curso_ambiente';

export interface ImportError {
  row: number;
  field: string;
  error: string;
}

export interface ImportPreview {
  valid: any[];
  invalid: any[];
  duplicates: { codigo: string; rows: number[] }[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImportadorService {
  private apiUrl = '/api/data-import';

  constructor(private http: HttpClient, private apiService: ApiService) {}

  uploadFile(file: File, entityType: EntityType): Observable<{ sessionId: string; preview: ImportPreview }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);

    return this.http.post<{ sessionId: string; preview: ImportPreview }>(`${this.apiUrl}/upload`, formData);
  }

  getPreview(sessionId: string): Observable<ImportPreview> {
    return this.http.get<ImportPreview>(`${this.apiUrl}/preview/${sessionId}`);
  }

  confirmImport(sessionId: string, periodoId?: number): Observable<ImportResult> {
    const body = { periodoId };
    return this.http.post<ImportResult>(`${this.apiUrl}/confirm/${sessionId}`, body);
  }

  getStatus(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status/${sessionId}`);
  }
}
