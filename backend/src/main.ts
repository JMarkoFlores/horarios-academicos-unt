import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { DataSource } from "typeorm";

async function bootstrap() {
  const start = Date.now();
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");
  const frontendUrl = process.env.FRONTEND_URL;

  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          connectSrc: ["'self'", ...(frontendUrl ? [frontendUrl] : [])],
          upgradeInsecureRequests:
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: frontendUrl || "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;

  if (process.env.DISABLE_SWAGGER !== "true") {
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
      .addTag(
        "cursos",
        "Gestión de cursos y asignación de ambientes compatibles",
      )
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
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
  app
    .getHttpAdapter()
    .getInstance()
    .get("/health", (_req: any, res: any) => {
      res.status(200).json({ status: "ok" });
    });

  // Auto-seed if DB is empty
  if (process.env.AUTO_SEED === "true") {
    try {
      const dataSource = app.get(DataSource);
      const count = await dataSource.query(`SELECT COUNT(*) FROM usuario`);
      if (parseInt(count[0].count, 10) === 0) {
        logger.log("BD vacía — ejecutando seed inicial...");
        const { seed } = await import("./database/seed-auto");
        await seed(dataSource);
        logger.log("✅ Seed inicial completado");
      }
    } catch (e) {
      logger.error("Error en auto-seed:", (e as any).message);
    }
  }

  await app.listen(port);

  logger.log(`Servidor corriendo en: http://localhost:${port}`);
  logger.log(`Bootstrap completado en ${Date.now() - start}ms`);
}

bootstrap();
