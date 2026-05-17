export const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
};

export const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

export const mockUser = {
  id: 1,
  email: "test@example.com",
  nombre: "Test User",
  rol: "docente",
  password: "hashedPassword",
};
