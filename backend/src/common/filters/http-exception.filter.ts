import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message ?? 'Error interno del servidor';

    this.logger.error(
      `${request.method} ${request.url} — ${statusCode}: ${JSON.stringify(message)}`,
    );

    response.status(statusCode).json({
      data: null,
      message: Array.isArray(message) ? message[0] : message,
      statusCode,
      errors: Array.isArray(message) ? message : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
