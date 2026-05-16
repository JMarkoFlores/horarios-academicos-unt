import { INestApplication } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

// Global test setup
beforeAll(async () => {
  // Global setup before all tests
  console.log("Starting test suite...");
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log("Test suite completed");
});

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
