import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatSelect } from '@angular/material/select';
import { of } from 'rxjs';

import { SeleccionarSemestreComponent } from './seleccionar-semestre.component';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

const SEMESTRES_MOCK: Semestre[] = [
  { id: 1, nombre: '2024-I', fechaInicio: '2024-03-01', fechaFin: '2024-07-31' },
  { id: 2, nombre: '2024-II', fechaInicio: '2024-08-15', fechaFin: '2024-12-20' },
];

const DOCENTE_MOCK: Docente = {
  id: 10,
  nombre: 'Juan Pérez',
  dni: '12345678',
  ibm: '12345',
  facultad: 'Ingeniería',
  departamento: 'Sistemas',
  condicion: 'Nombrado',
  categoria: 'Principal',
  dedicacion: 'TC',
};

describe('SeleccionarSemestreComponent', () => {
  let fixture: ComponentFixture<SeleccionarSemestreComponent>;
  let component: SeleccionarSemestreComponent;
  let cargaHorariaServiceSpy: jasmine.SpyObj<CargaHorariaService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let overlayContainer: OverlayContainer;
  let overlayElement: HTMLElement;

  beforeEach(async () => {
    cargaHorariaServiceSpy = jasmine.createSpyObj('CargaHorariaService', ['getSemestres', 'getDocenteActual']);
    cargaHorariaServiceSpy.getSemestres.and.returnValue(of(SEMESTRES_MOCK));
    cargaHorariaServiceSpy.getDocenteActual.and.returnValue(of(DOCENTE_MOCK));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [SeleccionarSemestreComponent, NoopAnimationsModule],
      providers: [
        { provide: CargaHorariaService, useValue: cargaHorariaServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionarSemestreComponent);
    component = fixture.componentInstance;
    overlayContainer = TestBed.inject(OverlayContainer);
    overlayElement = overlayContainer.getContainerElement();
    fixture.detectChanges();
  });

  describe('renderizado', () => {
    it('el componente compila sin errores', () => {
      expect(component).toBeTruthy();
    });

    it('existe un elemento con texto "Carga Horaria"', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Carga Horaria');
    });

    it('el select muestra 2 opciones con los nombres de los semestres mock', () => {
      const matSelect = fixture.debugElement.query(By.css('mat-select')).componentInstance as MatSelect;
      matSelect.open();
      fixture.detectChanges();

      const optionTexts = Array.from(overlayElement.querySelectorAll('mat-option')).map((option) =>
        option.textContent?.trim(),
      );

      expect(optionTexts).toEqual(['2024-I', '2024-II']);
      matSelect.close();
    });

    it('se muestra el nombre del docente "Juan Pérez"', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Juan Pérez');
    });

    it('se muestra el IBM "12345"', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('12345');
    });
  });

  describe('botón Continuar', () => {
    it('está deshabilitado al inicio', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button.continuar-btn') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('se habilita después de seleccionar el semestre con id=1', () => {
      component.semestreControl.setValue(1);
      fixture.detectChanges();
      const selectDebug = fixture.debugElement.query(By.css('mat-select'));
      selectDebug.triggerEventHandler('selectionChange', { value: 1 });
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button.continuar-btn') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('al hacer click navega con los queryParams correctos', () => {
      component.semestreControl.setValue(1);
      fixture.detectChanges();
      const selectDebug = fixture.debugElement.query(By.css('mat-select'));
      selectDebug.triggerEventHandler('selectionChange', { value: 1 });
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button.continuar-btn') as HTMLButtonElement;
      button.click();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/carga-horaria/confirmar-datos'], {
        queryParams: { semestreId: 1 },
      });
    });
  });
});
