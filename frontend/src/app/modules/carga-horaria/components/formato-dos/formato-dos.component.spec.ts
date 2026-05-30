import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FormatoDosComponent, DialogoConfirmacionComponent } from './formato-dos.component';
import { CargaHorariaService } from '../../services/carga-horaria.service';
import { Docente, Semestre } from '../../models/carga-horaria.models';

const DOCENTE_MOCK: Docente = {
  id: 1,
  nombre: 'Luis Ramírez',
  dni: '18990011',
  ibm: '55432',
  facultad: 'FISI',
  departamento: 'Sistemas',
  condicion: 'Ordinario',
  categoria: 'Principal',
  dedicacion: 'DE',
};

const SEMESTRE_MOCK = '2024-I';
const SEMESTRE_OBJ: Semestre = { id: 1, nombre: SEMESTRE_MOCK, fechaInicio: '', fechaFin: '' };

describe('FormatoDosComponent', () => {
  let fixture: ComponentFixture<FormatoDosComponent>;
  let component: FormatoDosComponent;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dialogAfterClosedResult: boolean;
  let snackBar: MatSnackBar;

  beforeEach(async () => {
    dialogAfterClosedResult = false;
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogSpy.open.and.callFake(() => ({
      afterClosed: () => of(dialogAfterClosedResult),
    }) as unknown as ReturnType<MatDialog['open']>);

    await TestBed.configureTestingModule({
      imports: [FormatoDosComponent, BrowserAnimationsModule],
      providers: [
        {
          provide: CargaHorariaService,
          useValue: {
            getDocenteActual: () => of(DOCENTE_MOCK),
            getSemestres: () => of([SEMESTRE_OBJ]),
          },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ semestreId: '1' })) } },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormatoDosComponent);
    component = fixture.componentInstance;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    (component as unknown as { dialog: MatDialog }).dialog = dialogSpy;
    (component as unknown as { snackBar: MatSnackBar }).snackBar = snackBar;
    fixture.detectChanges();
  });

  describe('texto del documento', () => {
    it('incluye el nombre del docente', () => {
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain(DOCENTE_MOCK.nombre);
    });

    it('incluye el IBM del docente', () => {
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain(DOCENTE_MOCK.ibm);
    });

    it('incluye el semestre', () => {
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain(SEMESTRE_MOCK);
    });

    it('incluye el DNI', () => {
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain(DOCENTE_MOCK.dni);
    });
  });

  describe('toggle de sede', () => {
    it('por defecto no muestra el párrafo de sede desconcentrada', () => {
      expect(fixture.nativeElement.querySelector('.nota-desconcentrada')).toBeNull();
    });

    it('al cambiar a sede desconcentrada se muestra el párrafo', () => {
      component.sedeControl.setValue('desconcentrada');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.nota-desconcentrada')).toBeTruthy();
    });

    it('al volver a sede central el párrafo desaparece', () => {
      component.sedeControl.setValue('desconcentrada');
      fixture.detectChanges();
      component.sedeControl.setValue('central');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.nota-desconcentrada')).toBeNull();
    });
  });

  describe('checkbox y botón', () => {
    it('el botón "Firmar y enviar" está deshabilitado al inicio', () => {
      const button = fixture.nativeElement.querySelector('button.accion-principal') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('al marcar el checkbox se habilita el botón', () => {
      const button = fixture.nativeElement.querySelector('button.accion-principal') as HTMLButtonElement;
      component.aceptaControl.setValue(true);
      fixture.detectChanges();

      expect(button.disabled).toBeFalse();
    });

    it('al desmarcar el checkbox se vuelve a deshabilitar', () => {
      const button = fixture.nativeElement.querySelector('button.accion-principal') as HTMLButtonElement;
      component.aceptaControl.setValue(true);
      fixture.detectChanges();
      component.aceptaControl.setValue(false);
      fixture.detectChanges();

      expect(button.disabled).toBeTrue();
    });
  });

  describe('confirmación', () => {
    beforeEach(() => {
      component.docente = DOCENTE_MOCK;
      component.semestre = SEMESTRE_OBJ;
    });

    const enableButton = () => {
      component.aceptaControl.setValue(true);
      fixture.detectChanges();
      dialogSpy.open.calls.reset();
    };

    it('click en "Firmar y enviar" con checkbox marcado llama a dialog.open', () => {
      enableButton();
      component.firmarDeclaracion();

      expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('dialog.open recibe datos que incluyen el docente (con nombre e IBM correctos)', () => {
      enableButton();
      component.firmarDeclaracion();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        DialogoConfirmacionComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            docente: DOCENTE_MOCK,
          }),
        }),
      );
    });

    it('después de confirmar en el dialog, MatSnackBar muestra un mensaje de éxito', fakeAsync(() => {
      enableButton();
      (snackBar.open as jasmine.Spy).calls.reset();
      dialogAfterClosedResult = true;

      component.firmarDeclaracion();
      tick(); // permite que la suscripción a afterClosed() emita

      expect(snackBar.open).toHaveBeenCalled();
      const mensaje = (snackBar.open as jasmine.Spy).calls.mostRecent().args[0] as string;
      expect(mensaje.toLowerCase()).toContain('declaración');
    }));
  });
});