const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Login
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  // Debug: take screenshot of login page
  await page.screenshot({ path: 'screenshots/debug-login.png', fullPage: false });
  
  // Try to find input fields
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} input fields`);
  
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    const name = await inputs[i].getAttribute('name');
    const id = await inputs[i].getAttribute('id');
    console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, name=${name}, id=${id}`);
  }

  await browser.close();
})();
