import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject, of } from "rxjs";
import { DisponibilidadComponent } from "./disponibilidad.component";
import { DisponibilidadService } from "./disponibilidad.service";
import { PeriodoService } from "../../core/services/periodo.service";
import { SharedModule } from "../../shared/shared.module";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Docente } from "../../core/interfaces/entities";

describe("DisponibilidadComponent", () => {
  let component: DisponibilidadComponent;
  let fixture: ComponentFixture<DisponibilidadComponent>;
  let disponibilidadService: jasmine.SpyObj<DisponibilidadService>;
  let periodoService: PeriodoService;

  const period$ = new BehaviorSubject<string>("2026-I");

  const docenteMock: Docente = {
    id: 1,
    codigo: "DOC-01",
    nombres: "Juan",
    apellidos: "Perez",
    email: "juan.perez@unt.edu.pe",
    telefono: "999999999",
    tipo_docente: "ORDINARIO",
    categoria: "PRINCIPAL",
    tipo_contrato: "NOMBRADO",
    modalidad: "Presencial",
    fecha_ingreso: "2024-01-01",
    activo: true,
  };

  const turnosMock = [
    {
      id: 1,
      nombre: "Manana",
      hora_inicio: "08:00",
      hora_fin: "10:00",
      activo: true,
    },
    {
      id: 2,
      nombre: "Tarde",
      hora_inicio: "10:00",
      hora_fin: "12:00",
      activo: true,
    },
  ];

  const diasMock = [
    { dia_semana: 1, nombre: "Lunes", activo: true },
    { dia_semana: 2, nombre: "Martes", activo: true },
    { dia_semana: 3, nombre: "Miercoles", activo: true },
    { dia_semana: 4, nombre: "Jueves", activo: true },
    { dia_semana: 5, nombre: "Viernes", activo: true },
  ];

  beforeEach(async () => {
    disponibilidadService = jasmine.createSpyObj("DisponibilidadService", [
      "obtenerTurnos",
      "obtenerDiasActivos",
      "obtenerDocentes",
      "obtenerParametrosCarga",
      "obtenerDisponibilidadDocente",
      "guardarDisponibilidadDocente",
    ]);

    disponibilidadService.obtenerTurnos.and.returnValue(of(turnosMock));
    disponibilidadService.obtenerDiasActivos.and.returnValue(of(diasMock));
    disponibilidadService.obtenerDocentes.and.returnValue(of([docenteMock]));
    disponibilidadService.obtenerParametrosCarga.and.returnValue(of([]));
    disponibilidadService.obtenerDisponibilidadDocente.and.returnValue(
      of({
        docente: {
          id: docenteMock.id,
          nombres: docenteMock.nombres,
          apellidos: docenteMock.apellidos,
          codigo: docenteMock.codigo,
        },
        periodo: "2026-I",
        slots: [],
      }),
    );
    disponibilidadService.guardarDisponibilidadDocente.and.returnValue(
      of({
        data: {
          docente: {
            id: docenteMock.id,
            nombres: docenteMock.nombres,
            apellidos: docenteMock.apellidos,
            codigo: docenteMock.codigo,
          },
          periodo: "2026-I",
          slots: [],
        },
        message: "OK",
        statusCode: 200,
      }),
    );

    periodoService = {
      periodo: "2026-I",
      periodo$: period$.asObservable(),
      cambiarPeriodo: () => undefined,
    } as unknown as PeriodoService;

    await TestBed.configureTestingModule({
      declarations: [DisponibilidadComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: DisponibilidadService, useValue: disponibilidadService },
        { provide: PeriodoService, useValue: periodoService },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj("MatSnackBar", ["open"]) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisponibilidadComponent);
    component = fixture.componentInstance;
  });

  it("debe renderizar 10 celdas checkbox (2x5)", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarDocente(docenteMock);
    tick();
    fixture.detectChanges();

    const checkboxes = fixture.debugElement.queryAll(By.css("mat-checkbox"));
    expect(checkboxes.length).toBe(10);
    flush();
  }));

  it("debe limpiar toda la selección al hacer click en Limpiar selección", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarDocente(docenteMock);
    tick();
    component.grilla.set([
      [true, false],
      [true, true],
      [false, false],
      [true, false],
      [false, true],
    ]);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css("button"));
    const clearBtn = buttons.find((btn) =>
      btn.nativeElement.textContent.includes("Limpiar selección"),
    );
    expect(clearBtn).toBeTruthy();
    clearBtn?.triggerEventHandler("click", {});
    fixture.detectChanges();

    const allUnchecked = component.grilla().flat().every((value) => !value);
    expect(allUnchecked).toBeTrue();
    flush();
  }));

  it("debe llamar a guardar con el payload correcto", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarDocente(docenteMock);
    tick();

    const matrix = [
      [true, false],
      [false, true],
      [false, false],
      [true, true],
      [false, false],
    ];
    component.grilla.set(matrix);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css("button"));
    const saveBtn = buttons.find((btn) =>
      btn.nativeElement.textContent.includes("Guardar Cambios"),
    );
    expect(saveBtn).toBeTruthy();
    saveBtn?.triggerEventHandler("click", {});
    fixture.detectChanges();

    const expectedSlots = diasMock.flatMap((dia, diaIndex) =>
      turnosMock.map((turno, turnoIndex) => ({
        dia_semana: dia.dia_semana,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        disponible: matrix[diaIndex][turnoIndex],
      })),
    );

    expect(disponibilidadService.guardarDisponibilidadDocente).toHaveBeenCalledWith(
      docenteMock.id,
      {
        slots: expectedSlots,
        periodo: "2026-I",
      },
    );
    flush();
  }));
});
