import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ApiService } from '../../../core/services/api.service';
import { PeriodoService } from '../../../core/services/periodo.service';
import { ApiResponse, Docente } from '../../../core/interfaces/entities';

interface CursoLectivo {
  id: number;
  codigo: string;
  nombre: string;
  seccion: string;
  escuela: string;
  ciclo: number;
  nroAlumnos: number;
  hrsTeo: number;
  hrsPra: number;
  hrsLab: number;
  totalHrs: number;
}

interface ActividadNoLectiva {
  id: number;
  codigo: string;
  descripcion: string;
  detalle: string;
  horas: number;
}

interface DeclaracionEstadoDetalle {
  estado?: string;
  fecha_firma_director?: string | null;
  carga_no_lectiva?: {
    actividades?: ActividadNoLectiva[];
    total_horas?: number;
  } | null;
  usuario_firmante?: {
    nombre?: string;
  } | null;
}

interface DocumentoConferir {
  nombre: string;
  sede: string;
  estado: string;
  tipo: 'declaracion' | 'horario' | 'jurada' | 'jurada2';
}

@Component({
  selector: 'app-verificar-aprobacion',
  templateUrl: './verificar-aprobacion.component.html',
  styleUrls: ['./verificar-aprobacion.component.scss'],
})
export class VerificarAprobacionComponent implements OnInit {
  docenteId = 0;
  docente: Docente | null = null;
  periodo = '';
  estado = 'SIN_DECLARACION';
  directorValidador = 'No validado';
  fechaValidacion = 'No validado';
  loading = true;
  cursosLectivos: CursoLectivo[] = [];
  actividadesNoLectivas: ActividadNoLectiva[] = [];
  totalHorasLectivas = 0;
  totalHorasNoLectivas = 0;
  documentosColumns = ['nombre', 'sede', 'estado', 'conferir'];
  descargandoDocumento: string | null = null;

  documentos: DocumentoConferir[] = [
    {
      nombre: 'Declaracion de la carga horaria',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'declaracion',
    },
    {
      nombre: 'Horario semanal del docente',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'horario',
    },
    {
      nombre: 'Declaracion jurada tipo 1',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'jurada',
    },
    {
      nombre: 'Declaracion jurada tipo 2',
      sede: 'Central',
      estado: 'Aprobada',
      tipo: 'jurada2',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.periodo = this.periodoService.periodo;
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.api.get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`).subscribe({
      next: (docenteRes) => {
        this.docente = docenteRes.data;
        this.api
          .get<ApiResponse<DeclaracionEstadoDetalle>>(
            `/declaraciones/docentes/${this.docenteId}/declaracion?periodo=${this.periodo}`,
          )
          .subscribe({
            next: (declaracionRes) => {
              this.estado = declaracionRes.data?.estado || 'SIN_DECLARACION';
              this.directorValidador = this.resolverDirectorValidador(
                declaracionRes.data,
              );
              this.fechaValidacion = this.resolverFechaValidacion(
                declaracionRes.data,
              );
              this.cargarCargaNoLectiva(declaracionRes.data?.carga_no_lectiva);
              this.cargarCursosAsignados();
              this.loading = false;
            },
            error: () => {
              this.estado = 'SIN_DECLARACION';
              this.directorValidador = 'No validado';
              this.fechaValidacion = 'No validado';
              this.cursosLectivos = [];
              this.actividadesNoLectivas = [];
              this.loading = false;
            },
          });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudo cargar el docente', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  private cargarCursosAsignados(): void {
    this.api
      .get<ApiResponse<any[]>>(
        `/declaraciones/docentes/${this.docenteId}/cursos?periodo=${this.periodo}`,
      )
      .subscribe({
        next: (res) => {
          this.cursosLectivos = (res.data || []).map((c: any) => ({
            id: c.id,
            codigo: c.codigo || '',
            nombre: c.nombre || '',
            seccion: c.seccion || '',
            escuela: c.escuela || '',
            ciclo: c.ciclo || 0,
            nroAlumnos: c.nroAlumnos || 0,
            hrsTeo: c.hrsTeo || 0,
            hrsPra: c.hrsPra || 0,
            hrsLab: c.hrsLab || 0,
            totalHrs: c.totalHrs || 0,
          }));
          this.totalHorasLectivas = this.cursosLectivos.reduce(
            (sum, curso) => sum + (curso.totalHrs || 0),
            0,
          );
        },
      });
  }

  private cargarCargaNoLectiva(
    data: DeclaracionEstadoDetalle['carga_no_lectiva'],
  ): void {
    this.actividadesNoLectivas = (data?.actividades || []).map((actividad) => ({
      id: actividad.id,
      codigo: actividad.codigo,
      descripcion: actividad.descripcion,
      detalle: actividad.detalle || '',
      horas: Number(actividad.horas) || 0,
    }));
    this.totalHorasNoLectivas = Number(data?.total_horas || 0);
  }

  get estadoLabel(): string {
    const labels: Record<string, string> = {
      BORRADOR: 'Borrador',
      PENDIENTE_ENVIO: 'Pendiente de envio',
      ENVIADO_DOCENTE: 'Enviado por docente',
      OBSERVADO_DPTO: 'Observado por departamento',
      SUBSANADO: 'Subsanado',
      VALIDADO_DPTO: 'Validado por departamento',
      OBSERVADO_FACULTAD: 'Observado por facultad',
      APROBADO_FACULTAD: 'Aprobado por facultad',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
      SIN_DECLARACION: 'Sin declaracion registrada',
    };
    return labels[this.estado] || this.estado;
  }

  private resolverDirectorValidador(
    declaracion: DeclaracionEstadoDetalle | null | undefined,
  ): string {
    const nombreFirmante = declaracion?.usuario_firmante?.nombre;
    if (
      this.estaValidadaPorDepartamento(declaracion?.estado) &&
      nombreFirmante
    ) {
      return nombreFirmante;
    }

    return 'No validado';
  }

  private resolverFechaValidacion(
    declaracion: DeclaracionEstadoDetalle | null | undefined,
  ): string {
    if (
      this.estaValidadaPorDepartamento(declaracion?.estado) &&
      declaracion?.fecha_firma_director
    ) {
      return new Date(declaracion.fecha_firma_director).toLocaleString('es-PE');
    }

    return 'No validado';
  }

  private estaValidadaPorDepartamento(estado?: string): boolean {
    return [
      'VALIDADO_DPTO',
      'OBSERVADO_FACULTAD',
      'APROBADO_FACULTAD',
      'CERRADO',
    ].includes(estado || '');
  }

  get mostrarDocumentosConferir(): boolean {
    return this.estaValidadaPorDepartamento(this.estado);
  }

  conferirDocumento(documento: DocumentoConferir): void {
    this.descargandoDocumento = documento.tipo;

    if (documento.tipo === 'declaracion') {
      this.generarPdfDeclaracion();
      this.descargandoDocumento = null;
      return;
    }

    if (documento.tipo === 'horario') {
      this.api
        .getBlob(`/reportes/docente/${this.docenteId}/excel`, {
          periodo: this.periodo,
        })
        .subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `horario_${this.docente?.apellidos || 'docente'}_${this.periodo}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            this.descargandoDocumento = null;
          },
          error: () => {
            this.snackBar.open('No se pudo descargar el horario semanal', 'Cerrar', {
              duration: 3000,
            });
            this.descargandoDocumento = null;
          },
        });
      return;
    }

    if (documento.tipo === 'jurada2') {
      this.generarPdfDeclaracionJuradaTipo2();
      this.descargandoDocumento = null;
      return;
    }

    this.generarPdfDeclaracionJurada();
    this.descargandoDocumento = null;
  }

  private generarPdfDeclaracion(): void {
    if (!this.docente) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 15;
    let y = 20;

    const centerText = (text: string, yPos: number, fontSize = 10, bold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
    };

    centerText('FORMATO N° 1', y, 10, true);
    y += 5;
    centerText('DECLARACION DE CARGA HORARIA ASIGNADA', y, 12, true);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      body: [
        ['Periodo', this.periodo],
        ['Docente', `${this.docente.apellidos}, ${this.docente.nombres}`],
        ['IBM', String(this.docente.ibm || '—')],
        ['Departamento', this.docente.departamento?.nombre || 'No asignado'],
        ['Facultad', this.docente.facultad?.nombre || 'No asignada'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      showHead: false,
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[
        'CODIGO',
        'CURSO',
        'CICLO',
        'N° AL.',
        'H.T.',
        'H.P.',
        'H.L.',
        'TOTAL',
      ]],
      body: this.cursosLectivos.map((curso) => [
        curso.codigo,
        curso.nombre,
        String(curso.ciclo || ''),
        String(curso.nroAlumnos || 0),
        String(curso.hrsTeo || 0),
        String(curso.hrsPra || 0),
        String(curso.hrsLab || 0),
        String(curso.totalHrs || 0),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: 20 },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['COD.', 'ACTIVIDAD', 'DETALLE', 'HORAS']],
      body: this.actividadesNoLectivas.map((actividad) => [
        actividad.codigo,
        actividad.descripcion,
        actividad.detalle || '',
        String(actividad.horas || 0),
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: 20 },
    });

    doc.save(`declaracion_carga_horaria_${this.docente.apellidos}_${this.periodo}.pdf`);
  }

  private generarPdfDeclaracionJurada(): void {
    if (!this.docente) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const marginX = 12;
    let y = 11;
    const lineHeight = 3.8;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nombreCompleto = `${this.docente.apellidos.toUpperCase()}, ${this.docente.nombres.toUpperCase()}`;
    const departamento = this.docente.departamento?.nombre || 'Dpto. no asignado';
    const facultad = this.docente.facultad?.nombre || 'Facultad no asignada';
    const ibm = this.docente.ibm || '—';
    const textoWidth = pageWidth - marginX * 2;

    const writeParagraph = (
      text: string,
      fontSize = 8,
      options?: { bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' | 'justify' },
    ) => {
      doc.setFontSize(fontSize);
      const fontStyle = options?.bold
        ? options?.italic
          ? 'bolditalic'
          : 'bold'
        : options?.italic
          ? 'italic'
          : 'normal';
      doc.setFont('times', fontStyle as 'normal' | 'bold' | 'italic' | 'bolditalic');
      const lines = doc.splitTextToSize(text, textoWidth);
      doc.text(lines, marginX, y, { align: options?.align || 'justify', maxWidth: textoWidth });
      y += lines.length * lineHeight + 2;
    };

    const writeClause = (text: string) => {
      writeParagraph(text, 7.7, { align: 'justify' });
    };

    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.text(
      'DECLARACION JURADA DE LOS DOCENTES QUE PRESTAN SERVICIOS EN SEDES',
      pageWidth / 2,
      y,
      { align: 'center' },
    );
    y += 4.2;
    doc.text('DESCENTRALIZADAS', pageWidth / 2, y, { align: 'center' });
    y += 7.5;

    writeParagraph(
      `Yo, ${nombreCompleto} identificado con Código IBM Nro ${ibm} del Departamento Académico ${departamento} Facultad de ${facultad}; en el marco del reglamento de funcionamiento de Sedes Descentralizadas (RCU Nro 072 CU-COG-2005/UNT) y la Directiva Nro 01-2007-VAC/UNT sobre Racionalización Académica del Personal Docentes que labora en las Sedes descentralizadas (R.C.U. Nro 576-2007/UNT) DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD QUE:`,
      7.8,
    );

    writeParagraph(
      'EN MI PRESTACION DE SERVICIOS EN SEDES DESCENTRALIZADAS NO ESTOY INCURSO EN INCOMPATIBILIDAD HORARIA NI CONTRAVENGO LA SIGUIENTE NORMATIVIDAD INSTITUCIONAL:',
      7.8,
      { bold: true },
    );

    writeClause(
      'Los docentes ordinarios a Dedicación Exclusiva y Tiempo Completo solo pueden tener carga horaria máxima de diez (10) horas semanales (num. 1 de la Directiva).',
    );

    writeClause(
      'Los docentes que ejercen cargos académicos y administrativos de: Jefe de Departamento Académico, Director de Escuela Académico Profesional, Director de Sección de Postgrado, Profesor Secretario de Facultad, Jefe de Oficina General, o cargos Directivos en Centros de Producción o líneas de Rentabilidad pueden asumir carga máxima de 05 horas semanales, siempre que sea en forma excepcional y por no contar con docente de la especialidad habilitada para asumir dicha carga. (num. 2 y 3 de la Directiva RCU Nro 005-2009/UNT y art.23 del Reglamento).',
    );

    writeClause(
      'Los docentes que ejercen cargo de Decano o Director de Postgrado y aquellos que prestan servicios en Centros de Producción y línea de Rentabilidad no pueden asumir carga horaria en Sedes Descentralizadas. (num. 3 de la Directiva ya art 23 del Reglamento).',
    );

    writeClause(
      'Los docentes beneficiados con becas de estudio de maestria o doctorado o Segunda especialidad solo pueden tener carga horaria máxima de tres (03) horas semanales. (num. 4 de la Directiva).',
    );

    writeClause(
      'El desarrollo de la carga en sede descentralizada no puede inferir con la carga lectiva y no lectiva asignada en la Sede Central; salvo el caso de las Sedes de Cascas, Huamachuco, Tayabamba y Santiago de Chuco en que se debe contar con Licencia por comisión de servicios y carta de compromiso del docente que asumiría la carga horaria en la Sede Central (num. 5 y 7 de la Directiva y art. 23 del Reglamento).',
    );

    writeClause(
      'Los docentes que asumen carga horaria en las Sedes de Huamachuco, Cascas, Santiago de Chuco y Tayabamba no pueden asumir labores labores durante el mismo periodo en otra Sede (num. 6 de la Directiva).',
    );

    writeClause(
      'En caso de faltar a la verdad así como de incurrir en incompatibilidad horaria contraviniendo los dispositivos pre-citados me avengo a las sanciones que correspondan,',
    );

    writeParagraph(
      'y autorizo al funcionario competente disponga el descuento del pago por mis servicios en Sedes Descentralizadas,',
      7.7,
      { italic: true, bold: true },
    );

    writeParagraph(
      'conforme al monto que la unidad de remuneraciones liquide como pago indebido por el periodo ilegalmente laborado.',
      7.7,
      { italic: true, bold: true },
    );

    y += 7;
    doc.setFont('times', 'normal');
    doc.setFontSize(7.8);
    doc.text(
      `Trujillo, ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      pageWidth - marginX,
      y,
      { align: 'right' },
    );

    y = Math.max(y + 24, pageHeight - 38);
    doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
    y += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(7.8);
    doc.text('FIRMA DEL DECLARANTE', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`IBM: ${ibm}`, pageWidth / 2, y, { align: 'center' });

    y = pageHeight - 10;
    doc.setFontSize(6.6);
    doc.text(
      'Nota: Los docentes deben suscribir de forma obligatoria el presente formato para prestar servicios en cada Sede Descentralizada, al reverso de la Declaración de la Carga Horaria',
      marginX,
      y,
      { maxWidth: pageWidth - marginX * 2 },
    );

    doc.save(`declaracion_jurada_tipo_1_${this.docente.apellidos}_${this.periodo}.pdf`);
  }

  private generarPdfDeclaracionJuradaTipo2(): void {
    if (!this.docente) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const marginX = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const textWidth = pageWidth - marginX * 2;
    let y = 12;

    const nombreCompleto = `${this.docente.apellidos.toUpperCase()}, ${this.docente.nombres.toUpperCase()}`;
    const departamento = this.docente.departamento?.nombre || 'Dpto. no asignado';
    const facultad = this.docente.facultad?.nombre || 'Facultad no asignada';
    const ibm = this.docente.ibm || 'No registrado';
    const dni = 'No registrado';
    const condicion =
      this.docente.tipo_contrato === 'NOMBRADO' ? 'Nombrado' : 'Contratado';
    const modalidad = this.docente.modalidad || 'Tiempo Completo 40 H';

    const writeText = (
      text: string,
      fontSize = 7.9,
      options?: { bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right' | 'justify' },
    ) => {
      const style = options?.bold
        ? options?.italic
          ? 'bolditalic'
          : 'bold'
        : options?.italic
          ? 'italic'
          : 'normal';
      doc.setFont('times', style as 'normal' | 'bold' | 'italic' | 'bolditalic');
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, textWidth);
      doc.text(lines, marginX, y, { align: options?.align || 'justify', maxWidth: textWidth });
      y += lines.length * 4 + 2;
    };

    doc.setFont('times', 'normal');
    doc.setFontSize(8.3);
    doc.text('FORMATO N° 2', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(
      'DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES',
      pageWidth / 2,
      y,
      { align: 'center' },
    );
    y += 4.5;
    doc.text('DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL', pageWidth / 2, y, {
      align: 'center',
    });
    y += 10;

    writeText(
      `Yo, ${nombreCompleto} identificado con DNI. Nro ${dni} con Código IBM Nro ${ibm} del Departamento Académico ${departamento} Facultad de ${facultad}; en el marco del programa de Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:`,
      7.8,
    );

    writeText(
      'NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capitulo VII de las Incompatibilidades e Impedimentos, del Titulo VI: Los Profesores, del Estatuto Institucional vigente.',
      7.8,
    );

    writeText(
      `Soy docente ${condicion}, a ${modalidad} y NO desempeño cargo público o privado en horas que coincidan con el horario establecido en la Universidad Nacional de Trujillo (De conformidad con los articulos 270ro y 277ro del Estatuto Institucional vigente).`,
      7.8,
    );

    writeText(
      'EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME INCURSO EN SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO,',
      7.8,
      { bold: true },
    );

    writeText(
      'Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO ILEGALMENTE.',
      7.8,
      { bold: true, italic: true },
    );

    y += 10;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.text(
      `Trujillo, ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      pageWidth - marginX,
      y,
      { align: 'right' },
    );

    y = Math.max(y + 26, pageHeight - 38);
    doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
    y += 5;
    doc.setFontSize(8);
    doc.text('FIRMA DEL DECLARANTE', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`DNI: ${dni}`, pageWidth / 2, y, { align: 'center' });

    doc.setFontSize(6.5);
    doc.text(
      'Nota: Los docentes deben suscribir de forma obligatoria el presente formato en cada Semestre Académico, en el reverso de la Declaracion de Carga Horaria Asignada',
      marginX,
      pageHeight - 10,
      { maxWidth: textWidth },
    );

    doc.save(`declaracion_jurada_tipo_2_${this.docente.apellidos}_${this.periodo}.pdf`);
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
