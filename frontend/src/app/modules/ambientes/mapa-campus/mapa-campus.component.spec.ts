import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
} from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { of } from "rxjs";
import { RouterTestingModule } from "@angular/router/testing";
import { MapaCampusComponent } from "./mapa-campus.component";
import { ApiService } from "../../../core/services/api.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { SharedModule } from "../../../shared/shared.module";

describe("MapaCampusComponent", () => {
  let component: MapaCampusComponent;
  let fixture: ComponentFixture<MapaCampusComponent>;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiService = jasmine.createSpyObj("ApiService", ["get"]);
    apiService.get.and.returnValue(
      of({
        data: [
          {
            id: 1,
            nombre: "Aula 101",
            coordX: 10,
            coordY: 20,
            edificio: "A",
            capacidad: 30,
          },
          {
            id: 2,
            nombre: "Aula 202",
            coordX: 15,
            coordY: 25,
            edificio: "B",
            capacidad: 40,
          },
          {
            id: 3,
            nombre: "Aula 303",
            coordX: null,
            coordY: null,
            edificio: "C",
            capacidad: 25,
          },
        ],
      }),
    );

    await TestBed.configureTestingModule({
      declarations: [MapaCampusComponent],
      imports: [SharedModule, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj("MatSnackBar", ["open"]) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapaCampusComponent);
    component = fixture.componentInstance;
  });

  it("debe renderizar 2 círculos en el SVG", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const circles = fixture.nativeElement.querySelectorAll("svg circle");
    expect(circles.length).toBe(2);
    flush();
  }));

  it("debe listar 1 ambiente sin ubicación", fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll(".sin-item");
    expect(items.length).toBe(1);
    flush();
  }));
});
