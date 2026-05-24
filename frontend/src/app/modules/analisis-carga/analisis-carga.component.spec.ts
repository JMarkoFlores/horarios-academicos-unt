import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject, of } from "rxjs";
import { AnalisisCargaComponent } from "./analisis-carga.component";
import { ApiService } from "../../core/services/api.service";
import { PeriodoService } from "../../core/services/periodo.service";
import { DisponibilidadService } from "../disponibilidad/disponibilidad.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { By } from "@angular/platform-browser";
import { Docente } from "../../core/interfaces/entities";

describe("AnalisisCargaComponent", () => {
  let component: AnalisisCargaComponent;
  let fixture: ComponentFixture<AnalisisCargaComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let disponibilidadService: jasmine.SpyObj<DisponibilidadService>;
  let periodoService: PeriodoService;

  const period$ = new BehaviorSubject<string>("2026-I");
  const periodos$ = new BehaviorSubject<string[]>(["2025-II", "2026-I"]);

  const docentesMock: Docente[] = [
    {
      id: 11,
      codigo: "DOC-11",
      nombres: "Maria",
      apellidos: "Lopez",
      email: "maria.lopez@unt.edu.pe",
      telefono: "999999998",
      tipo_docente: "ORDINARIO",
      categoria: "ASOCIADO",
      tipo_contrato: "NOMBRADO",
      modalidad: "Presencial",
      fecha_ingreso: "2023-01-01",
      activo: true,
    },
    {
      id: 22,
      codigo: "DOC-22",
      nombres: "Luis",
      apellidos: "Sanchez",
      email: "luis.sanchez@unt.edu.pe",
      telefono: "999999997",
      tipo_docente: "CONTRATADO",
      categoria: "AUXILIAR",
      tipo_contrato: "CONTRATADO",
      modalidad: "Presencial",
      fecha_ingreso: "2022-01-01",
      activo: true,
    },
  ];

  beforeEach(async () => {
    apiService = jasmine.createSpyObj("ApiService", ["get"]);
    apiService.get.and.callFake(((path: string) => {
      if (path === "/docentes/carga-desequilibrada") {
        return of({
          data: [
            {
              docenteId: docentesMock[0].id,
              nombre: "Maria Lopez",
              distribucion: {
                lunes: 2,
                martes: 1,
                miercoles: 0,
                jueves: 0,
                viernes: 1,
                sabado: 0,
              },
              desequilibrio: 5,
            },
            {
              docenteId: docentesMock[1].id,
              nombre: "Luis Sanchez",
              distribucion: {
                lunes: 1,
                martes: 2,
                miercoles: 1,
                jueves: 0,
                viernes: 0,
                sabado: 0,
              },
              desequilibrio: 4,
            },
          ],
        });
      }
      if (path.startsWith("/docentes/") && path.endsWith("/carga-por-dia")) {
        return of({
          data: {
            lunes: 2,
            martes: 1,
            miercoles: 0,
            jueves: 0,
            viernes: 1,
            sabado: 0,
            promedioHorasPorDia: 0.67,
          },
        });
      }
      if (path === "/horarios/ocupacion-heatmap") {
        return of({ data: [] });
      }
      return of({ data: [] });
    }) as any);

    disponibilidadService = jasmine.createSpyObj("DisponibilidadService", [
      "obtenerDocentes",
      "obtenerDiasActivos",
      "obtenerTurnos",
    ]);
    disponibilidadService.obtenerDocentes.and.returnValue(of(docentesMock));
    disponibilidadService.obtenerDiasActivos.and.returnValue(
      of([
        { dia_semana: 1, nombre: "Lunes", activo: true },
        { dia_semana: 2, nombre: "Martes", activo: true },
      ]),
    );
    disponibilidadService.obtenerTurnos.and.returnValue(
      of([
        { id: 1, nombre: "Turno 1", hora_inicio: "08:00", hora_fin: "10:00", activo: true },
      ]),
    );

    periodoService = {
      periodo: "2026-I",
      periodo$: period$.asObservable(),
      periodos$: periodos$.asObservable(),
      cambiarPeriodo: () => undefined,
      cargarPeriodos: () => undefined,
    } as unknown as PeriodoService;

    await TestBed.configureTestingModule({
      imports: [AnalisisCargaComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: DisponibilidadService, useValue: disponibilidadService },
        { provide: PeriodoService, useValue: periodoService },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj("MatSnackBar", ["open"]) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalisisCargaComponent);
    component = fixture.componentInstance;
  });

  it("debe renderizar 2 filas en la tabla de desequilibrio", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll("tr.mat-mdc-row, tr.mat-row");
    expect(rows.length).toBe(2);
    flush();
  }));

  it("debe llamar a cargaPorDia al hacer click en una fila", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    apiService.get.calls.reset();

    const rows = fixture.debugElement.queryAll(By.css("tr.mat-mdc-row, tr.mat-row"));
    rows[1].triggerEventHandler("click", {});
    tick();

    expect(apiService.get).toHaveBeenCalledWith(
      `/docentes/${docentesMock[1].id}/carga-por-dia`,
      { periodo: "2026-I" },
    );
    flush();
  }));
});
