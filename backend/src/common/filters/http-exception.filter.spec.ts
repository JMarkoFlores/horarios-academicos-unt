import { HttpExceptionFilter } from "./http-exception.filter";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ArgumentsHost } from "@nestjs/common";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      method: "GET",
      url: "/test",
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe("catch", () => {
    it("debe manejar HttpException con mensaje string", () => {
      const exception = new HttpException("Not found", HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        message: "Not found",
        statusCode: HttpStatus.NOT_FOUND,
        errors: undefined,
        timestamp: expect.any(String),
        path: "/test",
      });
    });

    it("debe manejar HttpException con mensaje en objeto", () => {
      const exception = new HttpException(
        { message: "Validation failed" },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        message: "Validation failed",
        statusCode: HttpStatus.BAD_REQUEST,
        errors: undefined,
        timestamp: expect.any(String),
        path: "/test",
      });
    });

    it("debe manejar HttpException con array de mensajes", () => {
      const exception = new HttpException(
        { message: ["Error 1", "Error 2"] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        message: "Error 1",
        statusCode: HttpStatus.BAD_REQUEST,
        errors: ["Error 1", "Error 2"],
        timestamp: expect.any(String),
        path: "/test",
      });
    });

    it("debe manejar HttpException sin mensaje", () => {
      const exception = new HttpException(
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: null,
        message: "Error interno del servidor",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errors: undefined,
        timestamp: expect.any(String),
        path: "/test",
      });
    });

    it("debe incluir timestamp en formato ISO", () => {
      const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      const responseJson = mockResponse.json.mock.calls[0][0];
      expect(responseJson.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("debe incluir el path de la solicitud", () => {
      mockRequest.url = "/api/cursos/1";
      const exception = new HttpException("Test error", HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      const responseJson = mockResponse.json.mock.calls[0][0];
      expect(responseJson.path).toBe("/api/cursos/1");
    });

    it("debe incluir el método HTTP", () => {
      mockRequest.method = "POST";
      const exception = new HttpException("Created", HttpStatus.CREATED);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });
  });
});
