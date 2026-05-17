import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService, UsuarioItem } from '../../../core/services/usuarios.service';
import { EditarUsuarioDialogComponent } from '../dialogs/editar-usuario-dialog/editar-usuario-dialog.component';
import { RegistrarUsuarioDialogComponent } from '../../../layout/dialogs/registrar-usuario-dialog/registrar-usuario-dialog.component';

@Component({
  selector: 'app-usuarios-list',
  templateUrl: './usuarios-list.component.html',
  styleUrls: ['./usuarios-list.component.scss'],
})
export class UsuariosListComponent implements OnInit {
  displayedColumns = ['nombre', 'email', 'rol', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<UsuarioItem>();
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  rolesMap: Record<string, string> = {
    administradorsistema: 'Administrador del Sistema',
    directorescuela: 'Director de Escuela',
    coordinadoracademico: 'Coordinador Académico',
    operadorhorarios: 'Operador de Horarios',
    docente: 'Docente',
  };

  constructor(
    private usuariosService: UsuariosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.usuariosService.listar().subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (u, filter) =>
          u.nombre.toLowerCase().includes(filter) ||
          u.email.toLowerCase().includes(filter) ||
          (this.rolesMap[u.rol] || u.rol).toLowerCase().includes(filter);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar usuarios', 'Cerrar', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  aplicarFiltro(event: Event): void {
    const valor = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = valor;
  }

  abrirCrear(): void {
    const ref = this.dialog.open(RegistrarUsuarioDialogComponent, {
      width: '480px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((creado) => {
      if (creado) this.cargarUsuarios();
    });
  }

  abrirEditar(usuario: UsuarioItem): void {
    const ref = this.dialog.open(EditarUsuarioDialogComponent, {
      width: '480px',
      disableClose: true,
      data: usuario,
    });
    ref.afterClosed().subscribe((actualizado) => {
      if (actualizado) this.cargarUsuarios();
    });
  }

  confirmarEliminar(usuario: UsuarioItem): void {
    if (!confirm(`¿Eliminar al usuario "${usuario.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.usuariosService.eliminar(usuario.id).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado', 'Cerrar', { duration: 3000 });
        this.cargarUsuarios();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar usuario';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  getRolLabel(rol: string): string {
    return this.rolesMap[rol] || rol;
  }
}
