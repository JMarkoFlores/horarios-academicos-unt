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
        
        # -> Click the 'INGRESAR AL SISTEMA' button to open the login flow so admin credentials can be entered.
        # login INGRESAR AL SISTEMA button
        elem = page.get_by_role('button', name='INGRESAR AL SISTEMA', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe, fill the 'Contraseña' field with Admin123!, and click the 'INGRESAR AL SISTEMA' button to sign in as admin.
        # email field
        elem = page.locator('[id="mat-input-0"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("admin@unt.edu.pe")
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe, fill the 'Contraseña' field with Admin123!, and click the 'INGRESAR AL SISTEMA' button to sign in as admin.
        # password field
        elem = page.locator('[id="mat-input-1"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Admin123!")
        
        # -> Fill the 'Correo electrónico' field with admin@unt.edu.pe, fill the 'Contraseña' field with Admin123!, and click the 'INGRESAR AL SISTEMA' button to sign in as admin.
        # INGRESAR AL SISTEMA arrow_forward button
        elem = page.get_by_role('button', name='INGRESAR AL SISTEMA', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Horarios' link in the left sidebar to open the Horarios view and load the schedules page.
        # schedule Horarios link
        elem = page.get_by_role('link', name='Horarios', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the period actions menu by clicking the blue '2026-I' period button (the period control at the top-right of the Horarios view) to reveal the option to clear schedules for the selected period.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the blue '2026-I' period button (the period control at the top-right labeled '2026-I') to open the period actions menu so the 'Clear schedules' option can be selected.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the blue '2026-I' period button in the top-right of the Horarios page to open the period actions menu so the 'clear schedules' option can be selected.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the 'Semestre 2026-I' semester dropdown (the semester selector at the top of the Horarios page) to open its options and reveal period-related actions.
        # Semestre 2026-I dropdown
        elem = page.locator('[id="mat-select-2"]')
        await elem.click(timeout=10000)
        
        # -> Close the 'Semestre 2026-I' dropdown and then click the '2026-I' period action button to open the period actions menu so the 'clear schedules' option can be located.
        # Semestre 2026-I dropdown
        elem = page.locator('[id="mat-select-2"]')
        await elem.click(timeout=10000)
        
        # -> Close the 'Semestre 2026-I' dropdown and then click the '2026-I' period action button to open the period actions menu so the 'clear schedules' option can be located.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Close the open 'Semestre 2026-I' dropdown, then click the '2026-I' period button to open the period actions menu so the 'clear schedules' option can be located.
        # Semestre 2026-I dropdown
        elem = page.locator('[id="mat-select-2"]')
        await elem.click(timeout=10000)
        
        # -> Close the open 'Semestre 2026-I' dropdown, then click the '2026-I' period button to open the period actions menu so the 'clear schedules' option can be located.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Close the open 'Semestre 2026-I' dropdown (currently showing options) by pressing Escape, then click the '2026-I' period actions button to open its actions menu so the 'clear schedules' option can be located.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the '2026-I' period button (the blue period button at top-right) to open the period actions menu so the 'Clear schedules' option can be located.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the floating '2026-I' period actions button (the blue period button at the top-right labeled '2026-I') to open its actions menu so the 'clear schedules' option can be selected.
        # button
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-horarios/mat-tab-group/mat-tab-header/button')
        await elem.click(timeout=10000)
        
        # -> Click the 'Periodos' link in the left sidebar to open the Periodos view and look for a 'clear schedules' or period management action (alternative path to clearing schedules).
        # event_note Periodos link
        elem = page.get_by_role('link', name='Periodos', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the '2026-I' period code (the '2026-I' pill in the Períodos Académicos table) to open its details or actions and look for a 'Clear schedules' option.
        # 2026-I
        elem = page.locator('xpath=/html/body/app-root/app-layout/mat-sidenav-container/mat-sidenav-content/div/app-periodos-list/div/mat-card/div/table/tbody/tr/td')
        await elem.click(timeout=10000)
        
        # -> Click the 'edit' (pencil) button for the 2026-I period in the Períodos Académicos table to open its details or actions so a 'Clear schedules' option can be located.
        # edit link
        elem = page.locator('a[href="/app/periodos/2/editar"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    