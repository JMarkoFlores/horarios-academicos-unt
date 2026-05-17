import { Page } from '@playwright/test';

/**
 * Helper function to login
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[data-cy="email"]', email);
  await page.fill('[data-cy="password"]', password);
  await page.click('[data-cy="login-button"]');
}

/**
 * Helper function to logout
 */
export async function logout(page: Page) {
  await page.click('[data-cy="logout-button"]');
}
