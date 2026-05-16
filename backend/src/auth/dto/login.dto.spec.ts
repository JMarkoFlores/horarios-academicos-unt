import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  describe("validaciones exitosas", () => {
    it("debe validar un login con credenciales correctas", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "admin@unitru.edu.pe",
        password: "Admin123!",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar email con formato estándar", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "user@example.com",
        password: "password123",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar contraseña con mínimo 6 caracteres", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "test@example.com",
        password: "123456",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar contraseña larga", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "test@example.com",
        password: "una-contrasena-muy-larga-y-compleja",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });
  });

  describe("validaciones fallidas", () => {
    it("debe rechazar email inválido sin @", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "adminexample.com",
        password: "Admin123!",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("isEmail");
    });

    it("debe rechazar email inválido sin dominio", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin@",
        password: "Admin123!",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar email vacío", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "",
        password: "Admin123!",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar contraseña con menos de 6 caracteres", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin@example.com",
        password: "12345",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("minLength");
    });

    it("debe rechazar contraseña vacía", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin@example.com",
        password: "",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si email no es string", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: 12345,
        password: "Admin123!",
      } as any);

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si password no es string", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin@example.com",
        password: 123456,
      } as any);

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si faltan campos requeridos", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin@example.com",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar email con espacios", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin @example.com",
        password: "Admin123!",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar email con caracteres especiales inválidos", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "admin#example.com",
        password: "Admin123!",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("casos límite", () => {
    it("debe aceptar contraseña exactamente de 6 caracteres", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "test@example.com",
        password: "123456",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe rechazar contraseña de 5 caracteres", async () => {
      const invalidDto = plainToInstance(LoginDto, {
        email: "test@example.com",
        password: "12345",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe aceptar email con subdominio", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "user@mail.example.com",
        password: "password123",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar email con números", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "user123@example.com",
        password: "password123",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar email con guiones", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "user-name@example.com",
        password: "password123",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar email con puntos en el nombre", async () => {
      const validDto = plainToInstance(LoginDto, {
        email: "user.name@example.com",
        password: "password123",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });
  });
});
