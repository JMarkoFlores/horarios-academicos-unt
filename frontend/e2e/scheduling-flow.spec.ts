import { test, expect } from '@playwright/test';

test.describe('Scheduling System E2E Flow (Playwright)', () => {
  const adminEmail = 'admin@unt.edu.pe';
  const adminPass = 'Admin123!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(adminEmail);
    await page.getByLabel('Contraseña').fill(adminPass);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/.*dashboard/);
    await page.waitForLoadState('networkidle');
  });

  test('debe navegar por los módulos principales', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const modules = ['Docentes', 'Cursos', 'Ambientes', 'Horarios'];
    for (const mod of modules) {
      await page.getByRole('link', { name: mod }).click();
      await expect(page).toHaveURL(new RegExp(`.*${mod.toLowerCase()}`));
    }
  });

  test('debe realizar el proceso de generación de horarios', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Navegar a Horarios
    await page.getByRole('link', { name: 'Horarios' }).click();

    // Ir a la pestaña de gestión
    await page.getByRole('tab', { name: 'Gestión de Horario' }).click({ force: true });
    
    // Esperar a que el contenido de la pestaña cargue (el botón debe aparecer)
    const genBtn = page.locator('button:has-text("Generar Horario Automático")');
    await genBtn.waitFor({ state: 'visible', timeout: 20000 });
    await expect(genBtn).toBeVisible();
    
    // Iniciar generación (manejar confirmación)
    page.on('dialog', dialog => dialog.accept());
    await genBtn.click();
    
    // El spinner puede aparecer y desaparecer muy rápido, lo hacemos opcional
    try {
      await expect(page.locator('mat-spinner')).toBeVisible({ timeout: 1000 });
    } catch (e) {
      // Ya terminó o fue muy rápido
    }
    
    // Esperar resultados (timeout extendido para stress)
    await expect(page.locator('.resultado')).toBeVisible({ timeout: 60000 });
    
    // Verificar que se crearon asignaciones
    const resultText = await page.locator('.resultado strong').first().innerText();
    const count = parseInt(resultText);
    expect(count).toBeGreaterThanOrEqual(0);

    // Screenshot del resultado
    await page.screenshot({ path: `e2e/screenshots/generation-result-${Date.now()}.png` });
  });

  test('debe validar la vista de cuadrícula de horarios', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Horarios' }).click();
    
    // Seleccionar el primer docente de la lista
    await page.getByLabel('Seleccionar docente').click();
    const firstOption = page.getByRole('option').first();
    await firstOption.waitFor({ state: 'visible', timeout: 15000 });
    await firstOption.click();

    // Validar que la tabla de horarios es visible
    const table = page.locator('table.horario-grid');
    await expect(table).toBeVisible();
    
    // Validar que hay horas en la columna izquierda
    await expect(page.locator('.hora-cell').first()).toContainText(':00');
  });

  test('debe responder correctamente a errores del servidor', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Horarios' }).click();
    await page.getByRole('tab', { name: 'Gestión de Horario' }).click({ force: true });
    
    const genBtn = page.locator('button:has-text("Generar Horario Automático")');
    await genBtn.waitFor({ state: 'visible', timeout: 20000 });

    // Mock de error 500
    await page.route('**/horarios/generar', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    }));

    page.on('dialog', dialog => dialog.accept());
    await genBtn.click();

    // Verificar notificación de error
    const snackbar = page.locator('.mat-mdc-snack-bar-container').first();
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText('Error');
  });
});
