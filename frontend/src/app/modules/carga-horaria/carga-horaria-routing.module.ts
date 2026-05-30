import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeleccionarSemestreComponent } from './components/seleccionar-semestre/seleccionar-semestre.component';
import { ConfirmarDatosComponent } from './components/confirmar-datos/confirmar-datos.component';
import { ListaFormatosComponent } from './components/lista-formatos/lista-formatos.component';
import { FormatoUnoComponent } from './components/formato-uno/formato-uno.component';
import { FormatoDosComponent } from './components/formato-dos/formato-dos.component';

const routes: Routes = [
  { path: '', redirectTo: 'seleccionar-semestre', pathMatch: 'full' },
  { path: 'seleccionar-semestre', component: SeleccionarSemestreComponent },
  { path: 'confirmar-datos', component: ConfirmarDatosComponent },
  { path: 'lista-formatos', component: ListaFormatosComponent },
  { path: 'formato-uno/:id', component: FormatoUnoComponent },
  { path: 'formato-dos', component: FormatoDosComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SeleccionarSemestreComponent,
    ConfirmarDatosComponent,
    ListaFormatosComponent,
    FormatoUnoComponent,
    FormatoDosComponent,
  ],
  exports: [RouterModule],
})
export class CargaHorariaRoutingModule {}
