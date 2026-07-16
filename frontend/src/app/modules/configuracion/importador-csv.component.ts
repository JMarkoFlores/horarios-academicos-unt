import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImportadorService, EntityType, ImportPreview, ImportResult } from '../../core/services/importador.service';
import { NotifToastService } from '../../core/services/notif-toast.service';
import { ConfiguracionGeneralService } from '../../core/services/configuracion-general.service';

interface CsvTemplate {
  entityType: EntityType;
  label: string;
  description: string;
  icon: string;
  order: number;
  dependencies: string[];
  columns: CsvColumn[];
  sampleRows: string[][];
}

interface CsvColumn {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'enum';
  enumValues?: string[];
  description: string;
  example: string;
}

@Component({
  selector: 'app-importador-csv',
  templateUrl: './importador-csv.component.html',
  styleUrls: ['./importador-csv.component.scss'],
})
export class ImportadorCsvComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  step: 'upload' | 'preview' | 'confirming' | 'result' = 'upload';

  uploadForm!: FormGroup;
  selectedFile: File | null = null;
  uploadProgress = 0;
  loadingPreview = false;
  loadingConfirm = false;

  sessionId: string | null = null;
  preview: ImportPreview | null = null;
  result: ImportResult | null = null;

  primaryColor = '#1a237e';
  accentColor = '#e91e63';

  templates: CsvTemplate[] = [
    {
      entityType: 'cursos',
      label: 'Cursos',
      description: 'Materias académicas con créditos, horas y ciclo',
      icon: 'menu_book',
      order: 1,
      dependencies: [],
      columns: [
        { name: 'codigo', required: true, type: 'string', description: 'Código único (ej: CS101)', example: 'CS101' },
        { name: 'nombre', required: true, type: 'string', description: 'Nombre del curso', example: 'Programación I' },
        { name: 'creditos', required: true, type: 'number', description: 'Créditos académicos (≥1)', example: '4' },
        { name: 'horas_teoria', required: true, type: 'number', description: 'Horas de teoría por semana', example: '4' },
        { name: 'horas_practica', required: false, type: 'number', description: 'Horas de práctica por semana (default: 0)', example: '0' },
        { name: 'horas_laboratorio', required: false, type: 'number', description: 'Horas de laboratorio por semana (default: 0)', example: '2' },
        { name: 'ciclo', required: true, type: 'number', description: 'Ciclo académico (1-10)', example: '1' },
        { name: 'tiene_laboratorio', required: true, type: 'boolean', description: '¿Tiene laboratorio? (true/false)', example: 'true' },
        { name: 'prerequisitos', required: false, type: 'string', description: 'Código de curso prerrequisito', example: 'CS101' },
      ],
      sampleRows: [
        ['CS101', 'Programación I', '4', '4', '0', '2', '1', 'true', ''],
        ['CS102', 'Programación II', '4', '4', '0', '2', '1', 'true', 'CS101'],
        ['CS201', 'Estructura de Datos', '4', '4', '0', '2', '3', 'true', 'CS102'],
      ],
    },
    {
      entityType: 'ambientes',
      label: 'Ambientes',
      description: 'Aulas, laboratorios, talleres y auditorios',
      icon: 'meeting_room',
      order: 2,
      dependencies: [],
      columns: [
        { name: 'codigo', required: true, type: 'string', description: 'Código único (ej: A-301)', example: 'A-301' },
        { name: 'nombre', required: true, type: 'string', description: 'Nombre del ambiente', example: 'Aula 301' },
        { name: 'tipo', required: true, type: 'enum', enumValues: ['AULA', 'LABORATORIO', 'AUDITORIO', 'TALLER', 'SEMINARIO', 'SALA_COMPUTACION'], description: 'Tipo de ambiente', example: 'AULA' },
        { name: 'capacidad', required: true, type: 'number', description: 'Capacidad máxima (≥1)', example: '40' },
        { name: 'estado', required: false, type: 'enum', enumValues: ['ACTIVO', 'MANTENIMIENTO', 'RESERVADO', 'INACTIVO'], description: 'Estado (default: ACTIVO)', example: 'ACTIVO' },
        { name: 'piso', required: false, type: 'number', description: 'Número de piso', example: '3' },
        { name: 'pabellon', required: false, type: 'string', description: 'Pabellón', example: 'Pabellón A' },
        { name: 'sede', required: false, type: 'string', description: 'Sede', example: 'Campus Central' },
        { name: 'equipamiento', required: false, type: 'string', description: 'Equipamiento disponible', example: 'Proyector' },
        { name: 'edificio', required: false, type: 'string', description: 'Edificio', example: '' },
        { name: 'coordX', required: false, type: 'number', description: 'Coordenada X (mapa)', example: '' },
        { name: 'coordY', required: false, type: 'number', description: 'Coordenada Y (mapa)', example: '' },
      ],
      sampleRows: [
        ['A-301', 'Aula 301', 'AULA', '40', 'ACTIVO', '3', 'Pabellón A', 'Campus Central', 'Proyector', '', '', ''],
        ['LAB-1', 'Laboratorio 1', 'LABORATORIO', '30', 'ACTIVO', '1', 'Pabellón B', 'Campus Central', '30 PCs, Proyector, Aire acondicionado', '', '', ''],
        ['AUD-1', 'Auditorio Principal', 'AUDITORIO', '200', 'ACTIVO', '0', 'Pabellón D', 'Campus Central', 'Sonido, Proyector, Iluminación', '', '', ''],
      ],
    },
    {
      entityType: 'docentes',
      label: 'Docentes',
      description: 'Profesores y personal académico',
      icon: 'person',
      order: 3,
      dependencies: [],
      columns: [
        { name: 'codigo', required: false, type: 'string', description: 'Código docente (se autogenera si vacío)', example: 'DOC001' },
        { name: 'nombres', required: true, type: 'string', description: 'Nombres', example: 'Juan Carlos' },
        { name: 'apellidos', required: true, type: 'string', description: 'Apellidos', example: 'Pérez García' },
        { name: 'email', required: true, type: 'string', description: 'Email @unt.edu.pe', example: 'juan.perez@unt.edu.pe' },
        { name: 'telefono', required: false, type: 'string', description: 'Teléfono 9 dígitos', example: '987654321' },
        { name: 'tipo_docente', required: true, type: 'enum', enumValues: ['ORDINARIO', 'CONTRATADO', 'JEFE_PRACTICA_CONTRATADO'], description: 'Tipo de docente', example: 'ORDINARIO' },
        { name: 'categoria', required: true, type: 'enum', enumValues: ['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'SIN_CATEGORIA', 'JEFE_PRACTICA'], description: 'Categoría académica', example: 'PRINCIPAL' },
        { name: 'modalidad', required: true, type: 'enum', enumValues: ['DEDICACION_EXCLUSIVA', 'TIEMPO_COMPLETO_40', 'TIEMPO_PARCIAL_20', 'TIEMPO_PARCIAL_12', 'TIEMPO_PARCIAL_10', 'TIEMPO_PARCIAL_8'], description: 'Modalidad de trabajo', example: 'DEDICACION_EXCLUSIVA' },
        { name: 'fecha_ingreso', required: true, type: 'string', description: 'Fecha ingreso (YYYY-MM-DD)', example: '2010-03-01' },
        { name: 'dni', required: true, type: 'string', description: 'DNI 8 dígitos', example: '12345678' },
        { name: 'ibm', required: true, type: 'number', description: 'Código IBM 4 dígitos', example: '1001' },
      ],
      sampleRows: [
        ['DOC001', 'Juan Carlos', 'Pérez García', 'juan.perez@unt.edu.pe', '987654321', 'ORDINARIO', 'PRINCIPAL', 'DEDICACION_EXCLUSIVA', '2010-03-01', '40', '12345678', '1001'],
        ['DOC002', 'María Elena', 'López Rodríguez', 'maria.lopez@unt.edu.pe', '987654322', 'ORDINARIO', 'ASOCIADO', 'TIEMPO_COMPLETO_40', '2012-04-15', '40', '23456789', '1002'],
        ['DOC003', 'Carlos Alberto', 'Martínez Silva', 'carlos.martinez@unt.edu.pe', '987654323', 'ORDINARIO', 'AUXILIAR', 'TIEMPO_COMPLETO_40', '2015-08-01', '40', '34567890', '1003'],
      ],
    },
    {
      entityType: 'grupos',
      label: 'Grupos',
      description: 'Secciones de cursos (requiere Cursos y Períodos creados)',
      icon: 'group',
      order: 4,
      dependencies: ['cursos', 'periodos'],
      columns: [
        { name: 'codigo', required: true, type: 'string', description: 'Código del grupo (ej: A, B, 1, 2)', example: 'A' },
        { name: 'nombre', required: true, type: 'string', description: 'Nombre del grupo', example: 'Grupo A' },
        { name: 'tipo', required: false, type: 'enum', enumValues: ['TEORIA', 'PRACTICA', 'LABORATORIO'], description: 'Tipo (default: TEORIA)', example: 'TEORIA' },
        { name: 'ciclo', required: true, type: 'number', description: 'Ciclo académico', example: '1' },
        { name: 'cupo_maximo', required: true, type: 'number', description: 'Cupo máximo (≥1)', example: '35' },
        { name: 'periodo_academico_id', required: true, type: 'number', description: 'ID del período académico', example: '1' },
        { name: 'curso_id', required: true, type: 'number', description: 'ID del curso', example: '1' },
      ],
      sampleRows: [
        ['A', 'Grupo A', 'TEORIA', '1', '35', '1', '1'],
        ['B', 'Grupo B', 'TEORIA', '1', '35', '1', '1'],
        ['A', 'Grupo A', 'LABORATORIO', '1', '20', '1', '2'],
      ],
    },
    {
      entityType: 'docente_curso',
      label: 'Docente-Curso',
      description: 'Asignación de docentes a cursos (requiere Docentes, Cursos y Períodos)',
      icon: 'assignment_ind',
      order: 5,
      dependencies: ['docentes', 'cursos', 'periodos'],
      columns: [
        { name: 'docente_id', required: true, type: 'number', description: 'ID del docente', example: '1' },
        { name: 'curso_id', required: true, type: 'number', description: 'ID del curso', example: '1' },
        { name: 'tipo_clase', required: false, type: 'enum', enumValues: ['TEORIA', 'PRACTICA', 'LABORATORIO'], description: 'Tipo (default: TEORIA)', example: 'TEORIA' },
        { name: 'periodo_id', required: false, type: 'number', description: 'ID del período', example: '1' },
      ],
      sampleRows: [
        ['1', '1', 'TEORIA', '1'],
        ['1', '1', 'LABORATORIO', '1'],
        ['2', '2', 'TEORIA', '1'],
      ],
    },
    {
      entityType: 'curso_ambiente',
      label: 'Curso-Ambiente',
      description: 'Ambientes compatibles para cada curso (requiere Cursos y Ambientes)',
      icon: 'location_on',
      order: 6,
      dependencies: ['cursos', 'ambientes'],
      columns: [
        { name: 'curso_id', required: true, type: 'number', description: 'ID del curso', example: '1' },
        { name: 'ambiente_id', required: true, type: 'number', description: 'ID del ambiente', example: '1' },
      ],
      sampleRows: [
        ['1', '1'],
        ['1', '4'],
        ['2', '2'],
      ],
    },
  ];

  displayedColumns = ['campo', 'valor', 'error'];
  displayedColumnsValid = ['campo', 'valor'];

  currentTemplate: CsvTemplate | null = null;

  constructor(
    private fb: FormBuilder,
    private importadorService: ImportadorService,
    private notifService: NotifToastService,
    private configService: ConfiguracionGeneralService,
  ) {}

  ngOnInit(): void {
    this.uploadForm = this.fb.group({
      entityType: ['cursos', Validators.required],
    });

    this.configService.config$.subscribe(config => {
      if (config) {
        this.primaryColor = config.color_primario || '#1a237e';
        this.accentColor = config.color_acento || '#e91e63';
      }
    });

    this.onEntityTypeChange('cursos');
  }

  onEntityTypeChange(entityType: EntityType): void {
    this.currentTemplate = this.templates.find(t => t.entityType === entityType) || null;
    this.uploadForm.get('entityType')?.setValue(entityType);
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

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  async uploadCSV(): Promise<void> {
    if (!this.selectedFile) {
      this.notifService.error('Selecciona un archivo CSV');
      return;
    }

    const entityType = this.uploadForm.get('entityType')?.value;
    this.loadingPreview = true;

    try {
      const response: any = await this.importadorService
        .uploadFile(this.selectedFile, entityType)
        .toPromise();

      const responseData = response?.data || response;

      if (responseData) {
        this.sessionId = responseData.sessionId;
        this.preview = responseData.preview;
        this.step = 'preview';

        const validCount = responseData.preview?.stats?.valid || 0;
        const invalidCount = responseData.preview?.stats?.invalid || 0;

        if (validCount > 0) {
          this.notifService.success(`${validCount} registros válidos para importar`);
        }
        if (invalidCount > 0) {
          this.notifService.info(`${invalidCount} registros con errores`);
        }
      }
    } catch (error: any) {
      console.error('Error uploadCSV:', error);
      const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
      this.notifService.error(`Error al procesar archivo: ${errorMsg}`);
      this.selectedFile = null;
      this.loadingPreview = false;
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
      const response: any = await this.importadorService
        .confirmImport(this.sessionId)
        .toPromise();

      const result = response?.data || response;

      if (result) {
        this.result = result;
        this.step = 'result';
        this.notifService.success(result.message);
      }
    } catch (error: any) {
      this.step = 'preview';
      const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
      this.notifService.error(`Error al confirmar importación: ${errorMsg}`);
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
    this.onEntityTypeChange('cursos');
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

  downloadTemplate(): void {
    if (!this.currentTemplate) return;

    const csv = [
      this.currentTemplate.columns.map(c => c.name),
      ...this.currentTemplate.sampleRows,
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-${this.currentTemplate.entityType}.csv`;
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

  getEnumValues(column: CsvColumn): string[] {
    return column.enumValues || [];
  }

  isValidEnumValue(column: CsvColumn, value: string): boolean {
    if (!column.enumValues) return true;
    return column.enumValues.some(v => v.toLowerCase() === value.toLowerCase());
  }

trackByIndex(index: number): number {
    return index;
  }

  formatRecord(record: any): string {
    const entries = Object.entries(record).map(([k, v]) => 
      `<span class="json-key">${k}</span>: <span class="json-value">${JSON.stringify(v)}</span>`
    );
    return `{<br>&nbsp;&nbsp;${entries.join(',<br>&nbsp;&nbsp;')}<br>}`;
  }
}
