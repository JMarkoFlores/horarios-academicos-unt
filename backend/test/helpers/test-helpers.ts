import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";

/**
 * Helper function to create a testing application
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * Helper function to close a testing application
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}

/**
 * Helper function to generate mock user data
 */
export function generateMockUser(overrides = {}) {
  return {
    id: 1,
    email: "test@example.com",
    nombre: "Test User",
    rol: "docente",
    ...overrides,
  };
}

/**
 * Helper function to generate mock course data
 */
export function generateMockCourse(overrides = {}) {
  return {
    id: 1,
    codigo: "CS101",
    nombre: "Introduction to Computer Science",
    creditos: 4,
    ...overrides,
  };
}
