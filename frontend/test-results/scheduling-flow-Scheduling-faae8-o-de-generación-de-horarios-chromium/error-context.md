# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scheduling-flow.spec.ts >> Scheduling System E2E Flow (Playwright) >> debe realizar el proceso de generación de horarios
- Location: e2e\scheduling-flow.spec.ts:25:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /generar horario automático/i }) to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e9]: school
      - generic [ref=e10]:
        - generic [ref=e11]: Horarios UNT
        - generic [ref=e12]: EIS — Sistema Académico
    - separator [ref=e13]
    - navigation [ref=e14]:
      - link "Dashboard" [ref=e15] [cursor=pointer]:
        - /url: /app/dashboard
        - img [ref=e16]: dashboard
        - generic [ref=e17]: Dashboard
      - link "Docentes" [ref=e18] [cursor=pointer]:
        - /url: /app/docentes
        - img [ref=e19]: people
        - generic [ref=e20]: Docentes
      - link "Cursos" [ref=e21] [cursor=pointer]:
        - /url: /app/cursos
        - img [ref=e22]: menu_book
        - generic [ref=e23]: Cursos
      - link "Ambientes" [ref=e24] [cursor=pointer]:
        - /url: /app/ambientes
        - img [ref=e25]: meeting_room
        - generic [ref=e26]: Ambientes
      - link "Disponibilidad" [ref=e27] [cursor=pointer]:
        - /url: /app/disponibilidad
        - img [ref=e28]: event_available
        - generic [ref=e29]: Disponibilidad
      - link "Reportes" [ref=e30] [cursor=pointer]:
        - /url: /app/reportes
        - img [ref=e31]: table_chart
        - generic [ref=e32]: Reportes
      - link "Horarios" [ref=e33] [cursor=pointer]:
        - /url: /app/horarios
        - img [ref=e34]: schedule
        - generic [ref=e35]: Horarios
      - link "Analytics" [ref=e36] [cursor=pointer]:
        - /url: /app/analytics
        - img [ref=e37]: analytics
        - generic [ref=e38]: Analytics
      - link "Operador" [ref=e39] [cursor=pointer]:
        - /url: /app/operador
        - img [ref=e40]: support_agent
        - generic [ref=e41]: Operador
    - generic [ref=e42]:
      - separator [ref=e43]
      - generic [ref=e44]:
        - img [ref=e45]: account_circle
        - generic [ref=e46]:
          - generic [ref=e47]: Administrador del Sistema
          - generic [ref=e48]: ADMIN
      - button "Cerrar sesión" [ref=e49]:
        - img [ref=e50]: logout
        - generic [ref=e51]: Cerrar sesión
  - generic [ref=e55]:
    - generic [ref=e56]:
      - generic [ref=e57]: Horarios — Vista de Asignaciones
      - generic [ref=e60] [cursor=pointer]:
        - generic [ref=e61]: Período
        - combobox "Período 2026-I" [ref=e63]:
          - generic [ref=e64]:
            - generic [ref=e66]: 2026-I
            - img [ref=e69]
    - generic [ref=e73]:
      - heading "Horarios" [level=1] [ref=e75]
      - generic [ref=e76]:
        - tablist [ref=e79]:
          - generic [ref=e80]:
            - tab "Vista por Docente" [selected] [ref=e81] [cursor=pointer]:
              - generic [ref=e83]: Vista por Docente
            - tab "Vista por Ambiente" [ref=e84] [cursor=pointer]:
              - generic [ref=e86]: Vista por Ambiente
            - tab "Conflictos" [ref=e87] [cursor=pointer]:
              - generic [ref=e89]: Conflictos
            - tab "Gestión de Horario" [active] [ref=e90] [cursor=pointer]:
              - generic [ref=e92]: Gestión de Horario
        - generic [ref=e93]:
          - tabpanel "Vista por Docente" [ref=e94]:
            - generic [ref=e96]:
              - generic [ref=e100] [cursor=pointer]:
                - generic [ref=e101]: Seleccionar docente
                - combobox "Seleccionar docente" [ref=e103]:
                  - img [ref=e109]
              - generic [ref=e112]:
                - img [ref=e113]: person_search
                - paragraph [ref=e114]: Busca y selecciona un docente para ver su horario
          - tabpanel [ref=e115]
          - tabpanel [ref=e116]
          - tabpanel [ref=e117]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Scheduling System E2E Flow (Playwright)', () => {
  4   |   const adminEmail = 'admin@unt.edu.pe';
  5   |   const adminPass = 'Admin123!';
  6   | 
  7   |   test.beforeEach(async ({ page }) => {
  8   |     await page.goto('/login');
  9   |     await page.getByLabel('Correo electrónico').fill(adminEmail);
  10  |     await page.getByLabel('Contraseña').fill(adminPass);
  11  |     await page.getByRole('button', { name: 'Ingresar' }).click();
  12  |     await expect(page).toHaveURL(/.*dashboard/);
  13  |     await page.waitForLoadState('networkidle');
  14  |   });
  15  | 
  16  |   test('debe navegar por los módulos principales', async ({ page }) => {
  17  |     await page.waitForLoadState('networkidle');
  18  |     const modules = ['Docentes', 'Cursos', 'Ambientes', 'Horarios'];
  19  |     for (const mod of modules) {
  20  |       await page.getByRole('link', { name: mod }).click();
  21  |       await expect(page).toHaveURL(new RegExp(`.*${mod.toLowerCase()}`));
  22  |     }
  23  |   });
  24  | 
  25  |   test('debe realizar el proceso de generación de horarios', async ({ page }) => {
  26  |     await page.waitForLoadState('networkidle');
  27  |     // Navegar a Horarios
  28  |     await page.getByRole('link', { name: 'Horarios' }).click();
  29  | 
  30  |     // Ir a la pestaña de gestión
  31  |     await page.getByRole('tab', { name: 'Gestión de Horario' }).click({ force: true });
  32  |     
  33  |     // Esperar a que el contenido de la pestaña cargue
  34  |     const genBtn = page.getByRole('button', { name: /generar horario automático/i });
> 35  |     await genBtn.waitFor({ state: 'visible', timeout: 30000 });
      |                  ^ TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
  36  |     await expect(genBtn).toBeVisible();
  37  |     
  38  |     // Iniciar generación (manejar confirmación)
  39  |     page.on('dialog', dialog => dialog.accept());
  40  |     await genBtn.click();
  41  |     
  42  |     // El spinner puede aparecer y desaparecer muy rápido, lo hacemos opcional
  43  |     try {
  44  |       await expect(page.locator('mat-spinner')).toBeVisible({ timeout: 1000 });
  45  |     } catch (e) {
  46  |       // Ya terminó o fue muy rápido
  47  |     }
  48  |     
  49  |     // Esperar resultados (timeout extendido para stress)
  50  |     await expect(page.locator('.resultado')).toBeVisible({ timeout: 60000 });
  51  |     
  52  |     // Verificar que se crearon asignaciones
  53  |     const resultText = await page.locator('.resultado strong').first().innerText();
  54  |     const count = parseInt(resultText);
  55  |     expect(count).toBeGreaterThanOrEqual(0);
  56  | 
  57  |     // Screenshot del resultado
  58  |     await page.screenshot({ path: `e2e/screenshots/generation-result-${Date.now()}.png` });
  59  |   });
  60  | 
  61  |   test('debe validar la vista de cuadrícula de horarios', async ({ page }) => {
  62  |     await page.waitForLoadState('networkidle');
  63  |     await page.getByRole('link', { name: 'Horarios' }).click();
  64  |     
  65  |     // Seleccionar el primer docente de la lista
  66  |     await page.getByLabel('Seleccionar docente').click();
  67  |     const firstOption = page.getByRole('option').first();
  68  |     await firstOption.waitFor({ state: 'visible', timeout: 15000 });
  69  |     await firstOption.click();
  70  | 
  71  |     // Validar que la tabla de horarios es visible
  72  |     const table = page.locator('table.horario-grid');
  73  |     await expect(table).toBeVisible();
  74  |     
  75  |     // Validar que hay horas en la columna izquierda
  76  |     await expect(page.locator('.hora-cell').first()).toContainText(':00');
  77  |   });
  78  | 
  79  |   test('debe responder correctamente a errores del servidor', async ({ page }) => {
  80  |     await page.waitForLoadState('networkidle');
  81  |     await page.getByRole('link', { name: 'Horarios' }).click();
  82  |     await page.getByRole('tab', { name: 'Gestión de Horario' }).click({ force: true });
  83  |     
  84  |     const genBtn = page.getByRole('button', { name: /generar horario automático/i });
  85  |     await genBtn.waitFor({ state: 'visible', timeout: 30000 });
  86  | 
  87  |     // Mock de error 500
  88  |     await page.route('**/horarios/generar', route => route.fulfill({
  89  |       status: 500,
  90  |       contentType: 'application/json',
  91  |       body: JSON.stringify({ message: 'Internal Server Error' }),
  92  |     }));
  93  | 
  94  |     page.on('dialog', dialog => dialog.accept());
  95  |     await genBtn.click();
  96  | 
  97  |     // Verificar notificación de error
  98  |     const snackbar = page.locator('.mat-mdc-snack-bar-container').first();
  99  |     await expect(snackbar).toBeVisible();
  100 |     await expect(snackbar).toContainText('Error');
  101 |   });
  102 | });
  103 | 
```