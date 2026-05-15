import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Horarios UNT API")
    .setDescription(
      "API para el sistema de gestión de horarios académicos — Escuela de Ingeniería de Sistemas, UNT",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "JWT",
    )
    .addTag("auth", "Autenticación y autorización")
    .addTag("docentes", "Gestión de docentes (CRUD + jerarquía + antigüedad)")
    .addTag("cursos", "Gestión de cursos y asignación de ambientes compatibles")
    .addTag("ambientes", "Gestión de ambientes y grilla de disponibilidad")
    .addTag(
      "disponibilidad",
      "Disponibilidad horaria de docentes y restricciones",
    )
    .addTag("periodos", "Períodos académicos")
    .addTag("grupos", "Grupos / secciones académicas")
    .addTag("horarios", "Motor de asignación y gestión de horarios")
    .addTag("ventanas", "Ventanas de atención y cola por turnos")
    .addTag("reportes", "Generación de reportes PDF")
    .addTag("dashboard", "KPIs y estadísticas del sistema")
    .addTag("notificaciones", "Notificaciones y preferencias de docentes")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Servidor corriendo en: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
