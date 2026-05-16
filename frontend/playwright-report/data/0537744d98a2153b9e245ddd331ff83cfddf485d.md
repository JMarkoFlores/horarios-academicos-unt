# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: analytics.spec.ts >> analytics dashboard loads and shows metrics
- Location: e2e\analytics.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Eficiencia')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText('Eficiencia')

```

```yaml
- text: Horarios UNT EIS — Sistema Académico
- separator
- navigation:
  - link "Dashboard":
    - /url: /app/dashboard
  - link "Docentes":
    - /url: /app/docentes
  - link "Cursos":
    - /url: /app/cursos
  - link "Ambientes":
    - /url: /app/ambientes
  - link "Disponibilidad":
    - /url: /app/disponibilidad
  - link "Reportes":
    - /url: /app/reportes
  - link "Horarios":
    - /url: /app/horarios
  - link "Analytics":
    - /url: /app/analytics
  - link "Operador":
    - /url: /app/operador
- separator
- text: Administrador del Sistema ADMIN
- button "Cerrar sesión"
- text: Sistema de Horarios UNT Período
- combobox "Período 2026-I": 2026-I
- heading "404" [level=1]
- heading "Página no encontrada" [level=2]
- paragraph: La ruta que buscas no existe o no tienes permisos para acceder.
- button "Ir al Dashboard"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('analytics dashboard loads and shows metrics', async ({ page }) => {
  4  |   // Login
  5  |   await page.goto('http://localhost:4200/login');
  6  |   await page.getByLabel('Correo electrónico').fill('admin@unt.edu.pe');
  7  |   await page.getByLabel('Contraseña').fill('Admin123!');
  8  |   await page.getByRole('button', { name: 'Ingresar' }).click();
  9  |   await expect(page).toHaveURL(/.*dashboard/);
  10 |   await page.waitForLoadState('networkidle');
  11 | 
  12 |   // Navigate to Analytics
  13 |   await page.getByRole('link', { name: 'Analytics' }).click();
  14 |   await expect(page).toHaveURL(/.*analytics/);
  15 | 
  16 |   // Wait for loading to finish
  17 |   await expect(page.locator('.loading-overlay')).not.toBeVisible({ timeout: 10000 });
  18 | 
  19 |   // Verify KPIs
> 20 |   await expect(page.getByText('Eficiencia')).toBeVisible({ timeout: 20000 });
     |                                              ^ Error: expect(locator).toBeVisible() failed
  21 |   await expect(page.getByText('Cursos')).toBeVisible({ timeout: 20000 });
  22 | 
  23 |   // Verify Charts (looking for any canvas or chart container)
  24 |   const charts = page.locator('canvas');
  25 |   await expect(charts.first()).toBeVisible({ timeout: 20000 });
  26 | 
  27 |   // Verify Suggestions
  28 |   const suggestions = page.locator('.suggestion-card');
  29 |   console.log('Suggestions found:', await suggestions.count());
  30 | });
  31 | 
```