import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImportadorService, EntityType, ImportPreview, ImportResult } from '../../core/services/importador.service';
import { NotifToastService } from '../../core/services/notif-toast.service';

@Component({
  selector: 'app-importador-csv',
  templateUrl: './importador-csv.component.html',
  styleUrls: ['./importador-csv.component.scss'],
})
export class ImportadorCsvComponent implements OnInit {
  step: 'upload' | 'preview' | 'confirming' | 'result' = 'upload';

  uploadForm!: FormGroup;
  selectedFile: File | null = null;
  uploadProgress = 0;
  loadingPreview = false;
  loadingConfirm = false;

  sessionId: string | null = null;
  preview: ImportPreview | null = null;
  result: ImportResult | null = null;

  entityTypes: { value: EntityType; label: string }[] = [
    { value: 'cursos', label: 'Cursos' },
    { value: 'ambientes', label: 'Ambientes' },
    { value: 'docentes', label: 'Docentes' },
    { value: 'grupos', label: 'Grupos' },
    { value: 'docente_curso', label: 'Docente-Curso' },
    { value: 'curso_ambiente', label: 'Curso-Ambiente' },
  ];

  displayedColumns = ['campo', 'valor', 'error'];
  displayedColumnsValid = ['campo', 'valor'];

  constructor(
    private fb: FormBuilder,
    private importadorService: ImportadorService,
    private notifService: NotifToastService,
  ) {}

  ngOnInit(): void {
    this.uploadForm = this.fb.group({
      entityType: ['cursos', Validators.required],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.csv')) {
        this.selectedFile = file;
      } else {
        this.notifService.error('Solo se aceptan archivos CSV');
        this.selectedFile = null;
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        this.selectedFile = file;
      } else {
        this.notifService.error('Solo se aceptan archivos CSV');
      }
    }
  }

  async uploadCSV(): Promise<void> {
    if (!this.selectedFile) {
      this.notifService.error('Selecciona un archivo CSV');
      return;
    }

    const entityType = this.uploadForm.get('entityType')?.value;
    this.loadingPreview = true;

    try {
      const response = await this.importadorService
        .uploadFile(this.selectedFile, entityType)
        .toPromise();

      if (response) {
        this.sessionId = response.sessionId;
        this.preview = response.preview;
        this.step = 'preview';

        const validCount = response.preview.stats.valid;
        const invalidCount = response.preview.stats.invalid;

        if (validCount > 0) {
          this.notifService.success(`${validCount} registros válidos para importar`);
        }
        if (invalidCount > 0) {
          this.notifService.info(`${invalidCount} registros con errores`);
        }
      }
    } catch (error: any) {
      this.notifService.error(`Error al procesar archivo: ${error.error?.message || 'Error desconocido'}`);
    } finally {
      this.loadingPreview = false;
    }
  }

  async confirmImport(): Promise<void> {
    if (!this.sessionId) {
      this.notifService.error('Sesión no válida');
      return;
    }

    this.loadingConfirm = true;
    this.step = 'confirming';

    try {
      const result = await this.importadorService
        .confirmImport(this.sessionId)
        .toPromise();

      if (result) {
        this.result = result;
        this.step = 'result';
        this.notifService.success(result.message);
      }
    } catch (error: any) {
      this.step = 'preview';
      this.notifService.error(`Error al confirmar importación: ${error.error?.message || 'Error desconocido'}`);
    } finally {
      this.loadingConfirm = false;
    }
  }

  cancelAndReset(): void {
    this.step = 'upload';
    this.selectedFile = null;
    this.sessionId = null;
    this.preview = null;
    this.result = null;
    this.uploadForm.reset({ entityType: 'cursos' });
  }

  downloadErrorReport(): void {
    if (!this.result || !this.result.errors || this.result.errors.length === 0) {
      this.notifService.info('No hay errores para descargar');
      return;
    }

    const csv = [
      ['Fila', 'Campo', 'Error'],
      ...this.result.errors.map(e => [e.row, e.field, e.error]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `errores-importacion-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getInvalidRowsForDisplay() {
    if (!this.preview || !this.preview.invalid) {
      return [];
    }
    return this.preview.invalid.slice(0, 10);
  }

  getValidRowsForDisplay() {
    if (!this.preview || !this.preview.valid) {
      return [];
    }
    return this.preview.valid.slice(0, 5);
  }
}
