import { test, expect } from '@playwright/test';

test('smoke test - load login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Horarios/);
  const title = await page.textContent('h1');
  console.log('Page title:', title);
});
