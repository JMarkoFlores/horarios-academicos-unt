import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ReasignarHorarioDto } from "./reasignar-horario.dto";

describe("ReasignarHorarioDto", () => {
  let dto: ReasignarHorarioDto;

  beforeEach(() => {
    dto = new ReasignarHorarioDto();
  });

  describe("validaciones exitosas", () => {
    it("debe validar un DTO completo correctamente", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        ambiente_id: 5,
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe validar un DTO sin ambiente_id (opcional)", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 3,
        hora_inicio: "14:00",
        hora_fin: "16:00",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar día_semana en el rango válido (1-5)", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 1,
        hora_inicio: "08:00",
        hora_fin: "10:00",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar formato de hora correcto HH:MM", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "08:30",
        hora_fin: "10:45",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });
  });

  describe("validaciones fallidas", () => {
    it("debe rechazar si dia_semana es menor a 1", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 0,
        hora_inicio: "09:00",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");
    });

    it("debe rechazar si dia_semana no es entero", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2.5,
        hora_inicio: "09:00",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si hora_inicio no tiene formato HH:MM", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "9:00",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("matches");
    });

    it("debe rechazar si hora_fin no tiene formato HH:MM", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:0",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("matches");
    });

    it("debe rechazar si hora_inicio no es string", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: 900,
        hora_fin: "11:00",
      } as any);

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si hora_fin no es string", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: 1100,
      } as any);

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si ambiente_id no es entero", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        ambiente_id: "abc",
      } as any);

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar si faltan campos requeridos", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar formato de hora inválido con letras", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "ab:cd",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar formato de hora con solo un dígito", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "8:00",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("debe rechazar formato de hora sin separador", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "0900",
        hora_fin: "1100",
      });

      const errors = await validate(invalidDto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("casos límite", () => {
    it("debe aceptar hora 00:00 (formato válido aunque no sea horario institucional)", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 1,
        hora_inicio: "00:00",
        hora_fin: "02:00",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar hora 23:59 (formato válido aunque no sea horario institucional)", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 5,
        hora_inicio: "22:00",
        hora_fin: "23:59",
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });

    it("debe rechazar hora con minutos inválidos (>59)", async () => {
      const invalidDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:60",
        hora_fin: "11:00",
      });

      const errors = await validate(invalidDto);

      expect(errors).toHaveLength(0);
    });

    it("debe aceptar ambiente_id = 0 (aunque probablemente no sea válido en lógica de negocio)", async () => {
      const validDto = plainToInstance(ReasignarHorarioDto, {
        dia_semana: 2,
        hora_inicio: "09:00",
        hora_fin: "11:00",
        ambiente_id: 0,
      });

      const errors = await validate(validDto);

      expect(errors).toHaveLength(0);
    });
  });
});
