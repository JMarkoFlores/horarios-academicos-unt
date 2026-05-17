import { test, expect } from '@playwright/test';

test.describe('App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application', async ({ page }) => {
    const appRoot = page.locator('app-root');
    await expect(appRoot).toBeVisible();
  });

  test('should have a title', async ({ page }) => {
    const title = await page.title();
    expect(title).not.toBe('');
  });
});
