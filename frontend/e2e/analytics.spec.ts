import { test, expect } from '@playwright/test';

test('analytics dashboard loads and shows metrics', async ({ page }) => {
  // Login
  await page.goto('http://localhost:4200/login');
  await page.getByLabel('Correo electrónico').fill('admin@unt.edu.pe');
  await page.getByLabel('Contraseña').fill('Admin123!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForLoadState('networkidle');

  // Navigate to Analytics
  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page).toHaveURL(/.*analytics/);

  // Wait for loading to finish
  await expect(page.locator('.loading-overlay')).not.toBeVisible({ timeout: 10000 });

  // Verify KPIs
  await expect(page.getByText('Eficiencia')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Cursos')).toBeVisible({ timeout: 20000 });

  // Verify Charts (looking for any canvas or chart container)
  const charts = page.locator('canvas');
  await expect(charts.first()).toBeVisible({ timeout: 20000 });

  // Verify Suggestions
  const suggestions = page.locator('.suggestion-card');
  console.log('Suggestions found:', await suggestions.count());
});
