import { ResponseInterceptor } from "./response.interceptor";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
    } as any;
    mockCallHandler = {
      handle: jest.fn(),
    };
    (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));
  });

  describe("intercept", () => {
    it("debe transformar respuesta con estructura estándar cuando payload tiene data", () => {
      const payload = {
        data: { id: 1, name: "Test" },
        message: "Success",
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: { id: 1, name: "Test" },
            message: "Success",
            statusCode: 200,
          });
        });
    });

    it("debe usar payload como data cuando no tiene propiedad data", () => {
      const payload = { id: 1, name: "Test" };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: { id: 1, name: "Test" },
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe usar mensaje por defecto cuando payload no tiene message", () => {
      const payload = { data: { id: 1 } };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: { id: 1 },
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe usar mensaje personalizado cuando payload tiene message", () => {
      const payload = { data: { id: 1 }, message: "Custom message" };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: { id: 1 },
            message: "Custom message",
            statusCode: 200,
          });
        });
    });

    it("debe incluir statusCode de la respuesta HTTP", () => {
      const payload = { data: { id: 1 } };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result.statusCode).toBe(200);
        });
    });

    it("debe manejar payload null", () => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(null));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: null,
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe manejar payload undefined", () => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(undefined));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: undefined,
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe manejar array como payload", () => {
      const payload = [{ id: 1 }, { id: 2 }];
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: [{ id: 1 }, { id: 2 }],
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe manejar string como payload", () => {
      const payload = "Simple string";
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: "Simple string",
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });

    it("debe manejar número como payload", () => {
      const payload = 42;
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(payload));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            data: 42,
            message: "Operación exitosa",
            statusCode: 200,
          });
        });
    });
  });
});
