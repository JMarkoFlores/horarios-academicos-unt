import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { Usuario } from "../entities/usuario.entity";
import { LoginDto } from "./dto/login.dto";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let usuarioRepository: Repository<Usuario>;
  let jwtService: JwtService;

  const mockUsuarioRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUsuario: Usuario = {
    id: 1,
    email: "test@example.com",
    nombre: "Test User",
    rol: RolUsuario.OPERADOR,
    password_hash: "hashedPassword",
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as Usuario;

  const mockLoginDto: LoginDto = {
    email: "test@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usuarioRepository = module.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe("login", () => {
    it("debe retornar token y usuario cuando las credenciales son válidas", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(mockUsuario);
      mockJwtService.sign.mockReturnValue("jwt-token");
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      const result = await service.login(mockLoginDto);

      expect(result).toEqual({
        access_token: "jwt-token",
        usuario: {
          id: mockUsuario.id,
          nombre: mockUsuario.nombre,
          email: mockUsuario.email,
          rol: mockUsuario.rol,
        },
      });
      expect(usuarioRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUsuario.id,
        email: mockUsuario.email,
        rol: mockUsuario.rol,
      });
      compareSpy.mockRestore();
    });

    it("debe lanzar UnauthorizedException si el usuario no existe", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        "Credenciales inválidas",
      );
    });

    it("debe lanzar UnauthorizedException si el usuario está inactivo", async () => {
      const inactiveUser = { ...mockUsuario, activo: false };
      mockUsuarioRepository.findOne.mockResolvedValue(inactiveUser);
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        "Usuario inactivo",
      );
      compareSpy.mockRestore();
    });

    it("debe lanzar UnauthorizedException si la contraseña es incorrecta", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(mockUsuario);
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(false as never);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        "Credenciales inválidas",
      );
      compareSpy.mockRestore();
    });
  });

  describe("refreshToken", () => {
    it("debe generar un nuevo token para el usuario", async () => {
      mockJwtService.sign.mockReturnValue("new-jwt-token");

      const result = await service.refreshToken(mockUsuario);

      expect(result).toEqual({
        access_token: "new-jwt-token",
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUsuario.id,
        email: mockUsuario.email,
        rol: mockUsuario.rol,
      });
    });
  });

  describe("validateUser", () => {
    it("debe validar usuario exitosamente", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(mockUsuario);
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      const result = await service.validateUser(
        "test@example.com",
        "password123",
      );

      expect(result).toEqual(mockUsuario);
      compareSpy.mockRestore();
    });

    it("debe lanzar UnauthorizedException si usuario no existe", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser("test@example.com", "password123"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("debe lanzar UnauthorizedException si usuario está inactivo", async () => {
      const inactiveUser = { ...mockUsuario, activo: false };
      mockUsuarioRepository.findOne.mockResolvedValue(inactiveUser);
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      await expect(
        service.validateUser("test@example.com", "password123"),
      ).rejects.toThrow(UnauthorizedException);
      compareSpy.mockRestore();
    });

    it("debe lanzar UnauthorizedException si contraseña es incorrecta", async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(mockUsuario);
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(false as never);

      await expect(
        service.validateUser("test@example.com", "wrongpassword"),
      ).rejects.toThrow(UnauthorizedException);
      compareSpy.mockRestore();
    });
  });

  describe("hashPassword", () => {
    it("debe hashear contraseña", async () => {
      const hashSpy = jest
        .spyOn(bcrypt, "hash")
        .mockResolvedValue("hashedPassword" as never);

      const result = await service.hashPassword("password123");

      expect(result).toBe("hashedPassword");
      hashSpy.mockRestore();
    });
  });

  describe("comparePassword", () => {
    it("debe comparar contraseñas exitosamente", async () => {
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(true as never);

      const result = await service.comparePassword(
        "password123",
        "hashedPassword",
      );

      expect(result).toBe(true);
      compareSpy.mockRestore();
    });

    it("debe retornar false si contraseñas no coinciden", async () => {
      const compareSpy = jest
        .spyOn(bcrypt, "compare")
        .mockResolvedValue(false as never);

      const result = await service.comparePassword(
        "wrongpassword",
        "hashedPassword",
      );

      expect(result).toBe(false);
      compareSpy.mockRestore();
    });
  });
});
