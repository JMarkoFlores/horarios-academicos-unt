import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { ListaFormatosComponent } from './lista-formatos.component';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, EstadoDeclaracion, FormatoItem, Semestre } from '../../models/carga-horaria.models';

const FORMATOS_MOCK: FormatoItem[] = [
  {
    id: 1,
    numero: 1,
    formato: 'Formato 1',
    sede: 'Central',
    estado: EstadoDeclaracion.NO_INICIADO,
    ultimaActualizacion: '2024-01-01',
  },
  {
    id: 2,
    numero: 2,
    formato: 'Formato 2',
    sede: 'Central',
    estado: EstadoDeclaracion.BORRADOR,
    ultimaActualizacion: '2024-01-02',
  },
  {
    id: 3,
    numero: 3,
    formato: 'Formato 3',
    sede: 'Norte',
    estado: EstadoDeclaracion.APROBADO_FACULTAD,
    ultimaActualizacion: '2024-01-03',
  },
];

const DOCENTE_MOCK: Docente = {
  id: 10,
  nombre: 'Docente Demo',
  dni: '12345678',
  ibm: 'IBM-1',
  facultad: 'Facultad X',
  departamento: 'Departamento Y',
  condicion: 'Ordinario',
  categoria: 'Principal',
  dedicacion: 'TC',
};

const SEMESTRES_MOCK: Semestre[] = [{ id: 1, nombre: '2024-I', fechaInicio: '2024-01-01', fechaFin: '2024-06-30' }];

describe('ListaFormatosComponent', () => {
  let fixture: ComponentFixture<ListaFormatosComponent>;
  let component: ListaFormatosComponent;
  let cargaHorariaSpy: jasmine.SpyObj<CargaHorariaService>;
  let routerSpy: jasmine.SpyObj<Router>;
  const renderTabla = () => {
    component.formatos = FORMATOS_MOCK;
    component.loadingFormatos = false;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    cargaHorariaSpy = jasmine.createSpyObj('CargaHorariaService', [
      'getFormatos',
      'getDocenteActual',
      'getSemestres',
    ]);
    cargaHorariaSpy.getFormatos.and.returnValue(of(FORMATOS_MOCK));
    cargaHorariaSpy.getDocenteActual.and.returnValue(of(DOCENTE_MOCK));
    cargaHorariaSpy.getSemestres.and.returnValue(of(SEMESTRES_MOCK));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ListaFormatosComponent, NoopAnimationsModule],
      providers: [
        { provide: CargaHorariaService, useValue: cargaHorariaSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ semestreId: '1' })),
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaFormatosComponent);
    component = fixture.componentInstance;
    renderTabla();
  });

  describe('tabla', () => {
    it('se renderizan exactamente 3 filas de datos', () => {
      renderTabla();
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
      expect(rows.length).toBe(3);
    });

    it('las columnas esperadas están presentes', () => {
      renderTabla();
      const headers = Array.from(
        fixture.nativeElement.querySelectorAll('th[mat-header-cell]') as NodeListOf<HTMLElement>,
      ).map((th) => th.textContent?.trim());

      expect(headers).toEqual(['N°', 'Formato', 'Sede', 'Estado', 'Última actualización', 'Acción']);
    });
  });

  describe('chips de estado', () => {
    it('marca correctamente los estilos para cada estado', () => {
      renderTabla();
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
      const chipNoIniciado = rows[0].querySelector('mat-chip');
      const chipBorrador = rows[1].querySelector('mat-chip');
      const chipAprobado = rows[2].querySelector('mat-chip');

      const hasNeutralClass = chipNoIniciado?.classList.contains('chip-neutro') ||
        chipNoIniciado?.classList.contains('estado-no-iniciado');
      const hasBorradorClass = chipBorrador?.classList.contains('chip-azul') ||
        chipBorrador?.classList.contains('estado-borrador');
      const hasAprobadoClass = chipAprobado?.classList.contains('chip-verde-oscuro') ||
        chipAprobado?.classList.contains('estado-aprobado');

      expect(hasNeutralClass).toBeTrue();
      expect(hasBorradorClass).toBeTrue();
      expect(hasAprobadoClass).toBeTrue();
    });
  });

  describe('botones de acción', () => {
    it('muestra los textos esperados según el estado', () => {
      renderTabla();
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
      const textos = Array.from(rows).map((row: HTMLTableRowElement) =>
        (row.querySelector('button.accion-btn') as HTMLButtonElement).textContent?.trim(),
      );

      expect(textos[0]).toBe('Iniciar');
      expect(textos[1]).toBe('Continuar');
      expect(textos[2]).toBe('Descargar PDF');
    });
  });

  describe('navegación', () => {
    it('click en "Iniciar" navega al formato con id=1', () => {
      renderTabla();
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
      const iniciarBtn = rows[0].querySelector('button.accion-btn') as HTMLButtonElement;

      iniciarBtn.click();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/carga-horaria/formato-uno', 1]);
    });

    it('click en "Continuar" navega al formato con id=2', () => {
      routerSpy.navigate.calls.reset();
      renderTabla();
      const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
      const continuarBtn = rows[1].querySelector('button.accion-btn') as HTMLButtonElement;

      continuarBtn.click();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/carga-horaria/formato-uno', 2]);
    });
  });
});
