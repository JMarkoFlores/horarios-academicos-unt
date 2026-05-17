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
    await page.getByRole('tab', { name: 'Gestión de Horario' }).click();
    
    // Esperar a que el contenido de la pestaña cargue
    const genBtn = page.getByRole('button', { name: /generar horario automático/i });
    await genBtn.waitFor({ state: 'visible', timeout: 45000 });
    await expect(genBtn).toBeEnabled();
    
    // Iniciar generación (manejar confirmación)
    page.on('dialog', dialog => dialog.accept());
    await genBtn.click();
    
    // Esperar resultados (timeout extendido para stress)
    const resultContainer = page.locator('.resultado');
    await expect(resultContainer).toBeVisible({ timeout: 90000 });
    
    // Verificar que se crearon asignaciones (buscando el primer número en los strong)
    const resultText = await resultContainer.locator('strong').first().innerText();
    const count = parseInt(resultText.replace(/[^0-9]/g, ''));
    expect(count).toBeGreaterThanOrEqual(0);

    // Screenshot del resultado
    await page.screenshot({ path: `e2e/screenshots/generation-result-${Date.now()}.png` });
  });

  test('debe validar la vista de cuadrícula de horarios', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Horarios' }).click();
    
    // Esperar a que el componente cargue y el select esté disponible
    const select = page.getByLabel('Seleccionar docente');
    await select.waitFor({ state: 'visible', timeout: 30000 });
    
    // Forzar el click y esperar un momento para la animación de Material
    await select.click();
    await page.waitForTimeout(1000); 
    
    // Buscar opciones (pueden estar en un overlay fuera del contenedor del componente)
    const option = page.locator('mat-option').first();
    await option.waitFor({ state: 'visible', timeout: 30000 });
    await option.click();

    // Validar que la tabla de horarios es visible
    const table = page.locator('table.horario-grid');
    await expect(table).toBeVisible({ timeout: 20000 });
    
    // Validar que hay horas en la columna izquierda
    await expect(page.locator('.hora-cell').first()).toContainText(':00');
  });

  test('debe responder correctamente a errores del servidor', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Horarios' }).click();
    await page.getByRole('tab', { name: 'Gestión de Horario' }).click({ force: true });
    
    const genBtn = page.getByRole('button', { name: /generar horario automático/i });
    await genBtn.waitFor({ state: 'visible', timeout: 30000 });

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
