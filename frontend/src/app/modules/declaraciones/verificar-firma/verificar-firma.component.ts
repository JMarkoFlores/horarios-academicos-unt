import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { Docente, ApiResponse } from '../../../core/interfaces/entities';

interface FirmaInfo {
  archivo?: File;
  nombre: string;
  extension: string;
  urlPreview?: string;
  fechaSubida?: string;
}

@Component({
  selector: 'app-verificar-firma',
  templateUrl: './verificar-firma.component.html',
  styleUrls: ['./verificar-firma.component.scss'],
})
export class VerificarFirmaComponent implements OnInit {
  docenteId = 0;
  docente: Docente | null = null;
  loading = true;
  enviando = false;

  firma: FirmaInfo = {
    nombre: '',
    extension: '',
  };
  firmaExistente: string | null = null;
  mostrarFormularioSubida = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.docenteId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDocente();
  }

  cargarDocente(): void {
    this.api
      .get<ApiResponse<Docente>>(`/docentes/${this.docenteId}`)
      .subscribe({
        next: (res) => {
          this.docente = res.data;
          this.cargarFirmaExistente();
        },
        error: () => {
          this.snackBar.open('Error al cargar datos del docente', 'Cerrar', {
            duration: 3000,
          });
          this.loading = false;
        },
      });
  }

  cargarFirmaExistente(): void {
    this.api
      .get<
        ApiResponse<{ firma_url: string | null }>
      >(`/declaraciones/firma/${this.docenteId}`)
      .subscribe({
        next: (res) => {
          const url = res.data?.firma_url || null;
          if (url) {
            this.api.getBlob(url).subscribe({
              next: (blob) => {
                this.firmaExistente = URL.createObjectURL(blob);
                this.loading = false;
              },
              error: () => {
                this.firmaExistente = null;
                this.loading = false;
              },
            });
          } else {
            this.firmaExistente = null;
            this.loading = false;
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  mostrarActualizar(): void {
    this.mostrarFormularioSubida = true;
  }

  cancelarActualizar(): void {
    this.mostrarFormularioSubida = false;
    this.firma = { nombre: '', extension: '' };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];
      const nombre = archivo.name;
      const parts = nombre.split('.');
      const extension =
        parts.length > 1
          ? parts[parts.length - 1].toUpperCase()
          : 'Desconocida';

      this.firma = {
        archivo: archivo,
        nombre: nombre,
        extension: extension,
        fechaSubida: new Date().toLocaleString('es-PE'),
      };

      // Crear preview si es imagen
      if (archivo.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.firma.urlPreview = e.target?.result as string;
        };
        reader.readAsDataURL(archivo);
      }
    }
  }

  enviar(): void {
    if (!this.firma.archivo) {
      this.snackBar.open('Debe subir una imagen de firma primero', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.enviando = true;

    const formData = new FormData();
    formData.append('firma', this.firma.archivo);
    formData.append('docente_id', this.docenteId.toString());

    this.api
      .post<ApiResponse<any>>('/declaraciones/firma', formData)
      .subscribe({
        next: () => {
          this.snackBar.open('Firma enviada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.enviando = false;
          this.router.navigate(['/app/declaraciones']);
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al enviar la firma',
            'Cerrar',
            { duration: 3000 },
          );
          this.enviando = false;
        },
      });
  }

  volver(): void {
    this.router.navigate(['/app/declaraciones']);
  }
}
