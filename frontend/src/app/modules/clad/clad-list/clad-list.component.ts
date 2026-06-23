import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CladService } from '../../../core/services/clad.service';
import { DeclaracionClad, EstadoClad } from '../../../core/interfaces/clad.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ROLES } from '../../../core/constants/roles';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-clad-list',
  templateUrl: './clad-list.component.html',
  styleUrls: ['./clad-list.component.scss']
})
export class CladListComponent implements OnInit {
  displayedColumns: string[] = ['docente', 'periodo', 'dependencia', 'horas', 'estado', 'acciones'];
  dataSource: MatTableDataSource<DeclaracionClad> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private cladService: CladService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cladService.findAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => console.error(err)
    });
  }

  isDocente(): boolean {
    return this.authService.hasRole(ROLES.DOCENTE);
  }

  getEstadoClass(estado: EstadoClad): string {
    switch (estado) {
      case EstadoClad.BORRADOR: return 'borrador';
      case EstadoClad.ENVIADO_DPTO: return 'enviado';
      case EstadoClad.OBSERVADO_DPTO: 
      case EstadoClad.OBSERVADO_DEPENDENCIA: return 'observado';
      case EstadoClad.VALIDADO_DPTO:
      case EstadoClad.VALIDADO_DEPENDENCIA: return 'validado';
      case EstadoClad.APROBADO_FINAL: return 'aprobado';
      default: return '';
    }
  }

  canEdit(clad: DeclaracionClad): boolean {
    if (!this.isDocente()) return false;
    return [EstadoClad.BORRADOR, EstadoClad.OBSERVADO_DPTO, EstadoClad.OBSERVADO_DEPENDENCIA].includes(clad.estado);
  }

  canDelete(clad: DeclaracionClad): boolean {
    if (!this.isDocente() && !this.authService.hasRole(ROLES.ADMINISTRADOR_SISTEMA)) return false;
    return clad.estado === EstadoClad.BORRADOR;
  }

  eliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar esta declaración CLAD?')) {
      this.cladService.remove(id).subscribe({
        next: () => this.cargarDatos(),
        error: (err) => console.error(err)
      });
    }
  }

  descargarPDF(id: number): void {
    const token = localStorage.getItem('token');
    const url = `${environment.apiUrl}/reportes/clad/${id}/pdf`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CLAD-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    })
    .catch(err => console.error('Error al descargar PDF', err));
  }
}
