import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TestDummyComponent } from "./test-dummy.component";

describe("TestDummyComponent", () => {
  let component: TestDummyComponent;
  let fixture: ComponentFixture<TestDummyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestDummyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestDummyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
