import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:4200")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'INGRESAR AL SISTEMA' button to open the login page so the email and password fields become visible.
        # login INGRESAR AL SISTEMA button
        elem = page.get_by_role('button', name='INGRESAR AL SISTEMA', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe and the 'Contraseña' field with Admin123!, then click the 'INGRESAR AL SISTEMA' button to submit the login form.
        # email field
        elem = page.locator('[id="mat-input-0"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("admin@unt.edu.pe")
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe and the 'Contraseña' field with Admin123!, then click the 'INGRESAR AL SISTEMA' button to submit the login form.
        # password field
        elem = page.locator('[id="mat-input-1"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Admin123!")
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe and the 'Contraseña' field with Admin123!, then click the 'INGRESAR AL SISTEMA' button to submit the login form.
        # INGRESAR AL SISTEMA arrow_forward button
        elem = page.get_by_role('button', name='INGRESAR AL SISTEMA', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the dashboard is displayed
        # Assert: The browser navigated to the dashboard URL.
        await expect(page).to_have_url(re.compile("/app/dashboard"), timeout=15000), "The browser navigated to the dashboard URL."
        # Assert: The dashboard heading 'Dashboard' is visible on the page.
        await expect(page.locator("xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content").nth(0)).to_contain_text("Dashboard", timeout=15000), "The dashboard heading 'Dashboard' is visible on the page."
        
        # --> Verify role-appropriate dashboard content is visible
        # Assert: The dashboard shows the signed-in admin user in the header.
        await expect(page.locator("xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav/div/div[3]/button").nth(0)).to_contain_text("Administrador del Sistema", timeout=15000), "The dashboard shows the signed-in admin user in the header."
        # Assert: The dashboard displays the current period widget 'Semestre 2026-I'.
        await expect(page.locator("xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/mat-toolbar/div/mat-form-field/div[1]/div/div[2]/mat-select/div/div[1]/span").nth(0)).to_have_text("Semestre 2026-I", timeout=15000), "The dashboard displays the current period widget 'Semestre 2026-I'."
        # Assert: The sidebar navigation includes the 'Docentes' item appropriate for the admin role.
        await expect(page.locator("xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav/div/div[2]/div[2]/div[2]/a[1]").nth(0)).to_contain_text("Docentes", timeout=15000), "The sidebar navigation includes the 'Docentes' item appropriate for the admin role."
        # Assert: The sidebar navigation includes the 'Horarios' item appropriate for the admin role.
        await expect(page.locator("xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav/div/div[2]/div[3]/div[2]/a[1]").nth(0)).to_contain_text("Horarios", timeout=15000), "The sidebar navigation includes the 'Horarios' item appropriate for the admin role."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    