import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ConfirmarDatosComponent } from './confirmar-datos.component';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente } from '../../models/carga-horaria.models';

const DOCENTE_MOCK: Docente = {
  id: 42,
  nombre: 'Ana Torres',
  dni: '44556677',
  ibm: '99001',
  facultad: 'FISI',
  departamento: 'Ing. Sistemas',
  condicion: 'Ordinario',
  categoria: 'Principal',
  dedicacion: 'DE',
};

describe('ConfirmarDatosComponent', () => {
  let fixture: ComponentFixture<ConfirmarDatosComponent>;
  let component: ConfirmarDatosComponent;
  let cargaHorariaSpy: jasmine.SpyObj<CargaHorariaService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    cargaHorariaSpy = jasmine.createSpyObj('CargaHorariaService', ['getDocenteActual', 'getSemestres']);
    cargaHorariaSpy.getDocenteActual.and.returnValue(of(DOCENTE_MOCK));
    cargaHorariaSpy.getSemestres.and.returnValue(of([]));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ConfirmarDatosComponent, NoopAnimationsModule],
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

    fixture = TestBed.createComponent(ConfirmarDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('campos visibles', () => {
    it('se renderiza el valor "Ana Torres" en el DOM', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Ana Torres');
    });

    it('se renderiza el valor "99001" en el DOM', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('99001');
    });

    it('se renderiza el valor "FISI" en el DOM', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('FISI');
    });

    it('se renderizan exactamente 7 secciones de campo (label + valor)', () => {
      const campos = fixture.nativeElement.querySelectorAll('.datos-grid .dato');
      expect(campos.length).toBe(7);
    });
  });

  describe('solo lectura', () => {
    it('no existe ningún input[type=text] habilitado en el template', () => {
      const inputs = fixture.nativeElement.querySelectorAll('input[type="text"]:not([disabled])');
      expect(inputs.length).toBe(0);
    });

    it('no existe ningún mat-select habilitado en el template', () => {
      const selects = fixture.nativeElement.querySelectorAll('mat-select:not([disabled])');
      expect(selects.length).toBe(0);
    });
  });

  describe('botones', () => {
    it('existe un botón con texto "Solicitar corrección"', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.includes('Solicitar corrección'),
      );
      expect(button).toBeTruthy();
    });

    it('existe un botón con texto que incluya "Continuar"', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.toLowerCase().includes('continuar'),
      );
      expect(button).toBeTruthy();
    });

    it('al hacer click en "Guardar y continuar" navega a lista de formatos', () => {
      const button = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((btn) =>
        btn.textContent?.includes('Guardar y continuar'),
      ) as HTMLButtonElement;

      button.click();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/carga-horaria/lista-formatos']);
    });
  });
});
