import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import {
  createTestApp,
  closeTestApp,
  startTransaction,
  rollbackTransaction,
} from "./test-helper";
import { getSeededData } from "./seeders/test-data";
import { Repository } from "typeorm";
import { Usuario } from "../../src/entities/usuario.entity";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("Auth Integration Tests", () => {
  let app: INestApplication;
  let usuarioRepository: Repository<Usuario>;

  beforeAll(async () => {
    app = await createTestApp();
    usuarioRepository = app.get(getRepositoryToken(Usuario));
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await startTransaction(app);
    const seededData = await getSeededData();
    await usuarioRepository.save(seededData.users);
  });

  afterEach(async () => {
    await rollbackTransaction(app);
  });

  describe("POST /auth/login", () => {
    it("debe autenticar usuario exitosamente con credenciales válidas", async () => {
      const loginDto = {
        email: "admin@unitru.edu.pe",
        password: "Admin123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("usuario");
      expect(response.body.usuario).toHaveProperty("id");
      expect(response.body.usuario).toHaveProperty("email", loginDto.email);
      expect(response.body.usuario).toHaveProperty("nombre", "Admin User");
      expect(response.body.usuario).toHaveProperty("rol", "ADMIN");
      expect(response.body.usuario).not.toHaveProperty("password_hash");
    });

    it("debe rechazar login con email incorrecto", async () => {
      const loginDto = {
        email: "nonexistent@unitru.edu.pe",
        password: "Admin123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty("statusCode", 401);
      expect(response.body).toHaveProperty("message", "Credenciales inválidas");
    });

    it("debe rechazar login con contraseña incorrecta", async () => {
      const loginDto = {
        email: "admin@unitru.edu.pe",
        password: "WrongPassword!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty("statusCode", 401);
      expect(response.body).toHaveProperty("message", "Credenciales inválidas");
    });

    it("debe rechazar login con usuario inactivo", async () => {
      const seededData = await getSeededData();
      const inactiveUser = seededData.users[0];
      inactiveUser.activo = false;
      await usuarioRepository.save(inactiveUser);

      const loginDto = {
        email: "admin@unitru.edu.pe",
        password: "Admin123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty("statusCode", 401);
      expect(response.body).toHaveProperty("message", "Usuario inactivo");
    });

    it("debe rechazar login con email inválido", async () => {
      const loginDto = {
        email: "invalid-email",
        password: "Admin123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty("statusCode", 400);
    });

    it("debe rechazar login sin contraseña", async () => {
      const loginDto = {
        email: "admin@unitru.edu.pe",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty("statusCode", 400);
    });

    it("debe generar token JWT válido", async () => {
      const loginDto = {
        email: "admin@unitru.edu.pe",
        password: "Admin123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(200);

      const token = response.body.access_token;
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT tiene 3 partes
    });

    it("debe incluir información correcta del usuario en la respuesta", async () => {
      const loginDto = {
        email: "coordinador@unitru.edu.pe",
        password: "Coord123!",
      };

      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send(loginDto)
        .expect(200);

      expect(response.body.usuario).toMatchObject({
        email: "coordinador@unitru.edu.pe",
        nombre: "Coordinador User",
        rol: "COORDINADOR",
      });
      expect(response.body.usuario).not.toHaveProperty("password_hash");
      expect(response.body.usuario).not.toHaveProperty("created_at");
      expect(response.body.usuario).not.toHaveProperty("updated_at");
    });
  });
});
