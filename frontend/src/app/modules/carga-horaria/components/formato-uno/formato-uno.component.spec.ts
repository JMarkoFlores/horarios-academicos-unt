import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { FormatoUnoComponent } from './formato-uno.component';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

const DOCENTE_MOCK: Docente = {
  id: 1,
  nombre: 'Dra. María Fernanda Rojas',
  dni: '42158796',
  ibm: 'IBM-20201',
  facultad: 'Ingeniería',
  departamento: 'Sistemas y Computación',
  condicion: 'Ordinaria',
  categoria: 'Principal',
  dedicacion: 'Tiempo Completo',
};

const SEMESTRES_MOCK: Semestre[] = [
  { id: 1, nombre: '2024-I', fechaInicio: '2024-03-01', fechaFin: '2024-07-31' },
];

const CURSOS_LECTIVOS_MOCK = [
  {
    codigo: 'CS101',
    nombre: 'Algoritmos',
    seccion: 'A',
    escuela: 'Sistemas',
    ciclo: 3,
    alumnos: 30,
    ht: 2,
    hp: 2,
    hl: 0,
    total: 4,
  },
  {
    codigo: 'CS202',
    nombre: 'BD',
    seccion: 'B',
    escuela: 'Sistemas',
    ciclo: 5,
    alumnos: 25,
    ht: 3,
    hp: 0,
    hl: 2,
    total: 5,
  },
];

class CargaHorariaServiceMock {
  getDocenteActual() {
    return of(DOCENTE_MOCK);
  }
  getSemestres() {
    return of(SEMESTRES_MOCK);
  }
}

describe('FormatoUnoComponent', () => {
  let component: FormatoUnoComponent;
  let fixture: ComponentFixture<FormatoUnoComponent>;
  let routerNavigateSpy: jasmine.Spy<Router['navigate']>;
  const getTotalesCells = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[data-bloque="II"] .tabla-lectivo.totales td') as NodeListOf<HTMLElement>,
    ).map((cell) => cell.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormatoUnoComponent, BrowserAnimationsModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: CargaHorariaService, useClass: CargaHorariaServiceMock },
        {
          provide: MatSnackBar,
          useValue: {
            open: jasmine.createSpy('open'),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FormatoUnoComponent);
    component = fixture.componentInstance;
    (component as unknown as { cursosLectivos: typeof CURSOS_LECTIVOS_MOCK }).cursosLectivos =
      CURSOS_LECTIVOS_MOCK;
    routerNavigateSpy = spyOn(TestBed.inject(Router), 'navigate');
    TestBed.runInInjectionContext(() => fixture.detectChanges());
  });

  describe('Bloque I - datos del docente', () => {
    it('se renderiza el nombre del docente mock', () => {
      fixture.detectChanges();
      const bloqueI = fixture.debugElement.query(By.css('[data-bloque="I"]')).nativeElement as HTMLElement;
      expect(bloqueI.textContent).toContain(DOCENTE_MOCK.nombre);
    });

    it('se renderiza el IBM del docente mock', () => {
      fixture.detectChanges();
      const bloqueI = fixture.debugElement.query(By.css('[data-bloque="I"]')).nativeElement as HTMLElement;
      expect(bloqueI.textContent).toContain(DOCENTE_MOCK.ibm);
    });

    it('no existe ningún input habilitado en Bloque I', () => {
      fixture.detectChanges();
      const inputs = fixture.debugElement.queryAll(
        By.css('[data-bloque="I"] input:not([disabled]), [data-bloque="I"] textarea:not([disabled])'),
      );
      expect(inputs.length).toBe(0);
    });
  });

  describe('Bloque II - tabla lectiva', () => {
    it('la tabla tiene las columnas esperadas', () => {
      fixture.detectChanges();
      const headers = Array.from(
        fixture.nativeElement.querySelectorAll('[data-bloque="II"] th[mat-header-cell]') as NodeListOf<HTMLElement>,
      ).map((th) => th.textContent?.trim());

      expect(headers).toEqual(['Código', 'Asignatura', 'Sección', 'Escuela', 'Ciclo', 'Alumnos', 'HT', 'HP', 'HL', 'Total']);
    });

    it('renderiza exactamente 2 filas de datos', () => {
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('[data-bloque="II"] tr[mat-row]');
      expect(rows.length).toBe(2);
    });

    it('existe una fila de totales al final de la tabla', () => {
      fixture.detectChanges();
      const totalesRow = fixture.nativeElement.querySelector('[data-bloque="II"] .tabla-lectivo.totales .fila-totales');
      expect(totalesRow).toBeTruthy();
    });
  });

  describe('Bloque II - cálculo de totales', () => {
    it('el total de HT es 5', () => {
      fixture.detectChanges();
      const totales = getTotalesCells();

      expect(totales[2]).toBe('5');
    });

    it('el total de HP es 2', () => {
      fixture.detectChanges();
      const totales = getTotalesCells();

      expect(totales[3]).toBe('2');
    });

    it('el total general es 9', () => {
      fixture.detectChanges();
      const totales = getTotalesCells();

      expect(totales[5]).toBe('9');
    });
  });

  describe('Bloque II - inmutabilidad', () => {
    it('no existe ningún input editable dentro de la tabla lectiva', () => {
      fixture.detectChanges();
      const inputs = fixture.debugElement.queryAll(
        By.css('[data-bloque="II"] input:not([disabled]), [data-bloque="II"] textarea:not([disabled])'),
      );
      expect(inputs.length).toBe(0);
    });

    it('existe un botón con texto "Reportar inconsistencia"', () => {
      fixture.detectChanges();
      const button = fixture.debugElement
        .queryAll(By.css('[data-bloque="II"] button'))
        .map((debug) => debug.nativeElement as HTMLButtonElement)
        .find((btn) => btn.textContent?.includes('Reportar inconsistencia'));

      expect(button).toBeTruthy();
    });
  });

  describe('Formulario reactivo', () => {
    it('el formulario tiene exactamente 9 grupos', () => {
      expect(component.bloquesFormArray.length).toBe(9);
    });

    it('cada grupo tiene el control horasSemanales', () => {
      component.bloquesFormArray.controls.forEach((group) => {
        expect(group.get('horas')).toBeTruthy();
      });
    });

    it('cada grupo tiene el control descripcion', () => {
      component.bloquesFormArray.controls.forEach((group) => {
        expect(group.get('descripcion')).toBeTruthy();
      });
    });

    it('horasSemanales con valor -1 es inválido', () => {
      const control = component.bloquesFormArray.at(0).get('horas');
      control?.setValue(-1);
      expect(control?.valid).toBeFalse();
    });

    it('horasSemanales con valor 0 es válido', () => {
      const control = component.bloquesFormArray.at(0).get('horas');
      control?.setValue(0);
      expect(control?.valid).toBeTrue();
    });
  });

  describe('Campos adicionales', () => {
    it('bloques con requiereCodigo tienen numeroResolucion', () => {
      const indicesConCodigo = [2, 6, 8];
      indicesConCodigo.forEach((indice) => {
        expect(component.bloquesFormArray.at(indice).get('codigo')).toBeTruthy();
      });
    });

    it('bloques sin requiereCodigo no tienen numeroResolucion', () => {
      const indicesSinCodigo = [0, 1, 3, 4, 5, 7];
      indicesSinCodigo.forEach((indice) => {
        expect(component.bloquesFormArray.at(indice).get('codigo')).toBeNull();
      });
    });
  });

  describe('Cálculo de totales dinámico', () => {
    const setHoras = (values: number[]) => {
      component.bloquesFormArray.controls.forEach((group, index) => {
        group.get('horas')?.setValue(values[index] ?? 0);
      });
      fixture.detectChanges();
    };

    it('con todos en 0, total no lectivo es 0 y total general 9', () => {
      setHoras(Array(9).fill(0));
      expect(component.totalNoLectivo()).toBe(0);
      expect(component.totalGeneral()).toBe(9);
    });

    it('bloque 2 con 5 horas produce total no lectivo 5 y general 14', () => {
      setHoras([0, 5, ...Array(7).fill(0)]);
      expect(component.totalNoLectivo()).toBe(5);
      expect(component.totalGeneral()).toBe(14);
    });

    it('bloques 2 y 3 con 3 y 4 horas suman 7, general 16', () => {
      setHoras([0, 3, 4, ...Array(6).fill(0)]);
      expect(component.totalNoLectivo()).toBe(7);
      expect(component.totalGeneral()).toBe(16);
    });
  });

  describe('Botones footer', () => {
    it('existe botón "Guardar borrador"', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.includes('Guardar borrador'),
      );
      expect(button).toBeTruthy();
    });

    it('existe botón que incluya "Declaración Jurada" o "Continuar"', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.includes('Declaración Jurada') || btn.textContent?.includes('Continuar'),
      );
      expect(button).toBeTruthy();
    });

    it('click en Continuar navega a formato-dos', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.includes('Declaración Jurada') || btn.textContent?.includes('Continuar'),
      ) as HTMLButtonElement;
      button.click();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/carga-horaria/formato-dos']);
    });
  });
});
