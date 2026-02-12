import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:9002';
const SCREENSHOT_DIR = '/home/user/CascadeExplorer/screenshots';
const CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Launching headless shell...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process',
    ],
    protocolTimeout: 120000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ===== 1. LANDING PAGE =====
  console.log('1. Landing page...');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-page.png` });
  console.log('   Done: 01-landing-page.png');

  // ===== 2. CLICK "TEST A DECISION" EXAMPLE =====
  console.log('2. Clicking "Test a Decision" example card...');
  try {
    const cards = await page.$$('div[class*="border"]');
    for (const card of cards) {
      const text = await card.evaluate(el => el.textContent || '');
      if (text.includes('Test a Decision')) {
        await card.click();
        await sleep(1000);
        break;
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-test-decision-selected.png` });
    console.log('   Done: 02-test-decision-selected.png');
  } catch (e) {
    console.log('   Skipped: could not find card', e.message);
  }

  // Clear the input for our own assertion
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await sleep(300);
  }

  // ===== 3. TYPE A CUSTOM ASSERTION =====
  console.log('3. Typing custom assertion...');
  if (textarea) {
    await textarea.type('Should we migrate our monolithic application to microservices?', { delay: 15 });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-custom-assertion-typed.png` });
    console.log('   Done: 03-custom-assertion-typed.png');
  }

  // ===== 4. SUBMIT THE ASSERTION =====
  console.log('4. Submitting assertion...');
  // Find the send button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const hasSubmitType = await btn.evaluate(el => el.type === 'submit');
    if (hasSubmitType) {
      await btn.click();
      console.log('   Clicked submit button');
      break;
    }
  }
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-assertion-submitted.png` });
  console.log('   Done: 04-assertion-submitted.png');

  // Wait for any error/loading states
  await sleep(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-submit-wait.png` });
  console.log('   Done: 05-after-submit-wait.png');

  // ===== 5. SETTINGS PANEL =====
  console.log('5. Opening Settings panel...');
  try {
    // Look for the gear icon or "Not Configured" badge in the header
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label') || '');
      const text = await btn.evaluate(el => el.textContent || '');
      if (ariaLabel.toLowerCase().includes('setting') || text.includes('Not Configured') || text.includes('Settings')) {
        await btn.click();
        await sleep(1500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/06-settings-opened.png` });
        console.log('   Done: 06-settings-opened.png');
        break;
      }
    }

    // Look for settings content
    await sleep(1000);

    // Scroll down in settings to see all options
    const settingsDialog = await page.$('[role="dialog"], [class*="dialog"], [class*="sheet"], [class*="settings"]');
    if (settingsDialog) {
      await settingsDialog.evaluate(el => el.scrollTop = 300);
      await sleep(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-settings-scrolled.png` });
      console.log('   Done: 07-settings-scrolled.png');
    }

    // Close settings
    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    console.log('   Settings panel issue:', e.message);
  }

  // ===== 6. HOVER OVER UI ELEMENTS =====
  console.log('6. Exploring conversation panel details...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08-conversation-state.png` });
  console.log('   Done: 08-conversation-state.png');

  // ===== 7. CHECK THE VISUALIZATION PANEL =====
  console.log('7. Visualization panel...');
  // The visualization panel is on the right side
  await page.screenshot({ path: `${SCREENSHOT_DIR}/09-full-layout.png` });
  console.log('   Done: 09-full-layout.png');

  // ===== 8. AI ADAPTATION PANEL =====
  console.log('8. AI Adaptation panel...');
  // Try to interact with the adaptation slider
  try {
    const sliderHandle = await page.$('input[type="range"], [role="slider"]');
    if (sliderHandle) {
      // Get the slider's position and move it
      const box = await sliderHandle.boundingBox();
      if (box) {
        // Drag the slider to the left (more risks)
        await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2);
        await sleep(500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/10-adaptation-risks.png` });
        console.log('   Done: 10-adaptation-risks.png');

        // Drag to the right (more opportunities)
        await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
        await sleep(500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/11-adaptation-opportunities.png` });
        console.log('   Done: 11-adaptation-opportunities.png');
      }
    }
  } catch (e) {
    console.log('   Adaptation slider issue:', e.message);
  }

  // ===== 9. CLICK "FIND BLIND SPOTS" EXAMPLE =====
  console.log('9. Starting fresh - New Session...');
  try {
    const newSessionBtns = await page.$$('button');
    for (const btn of newSessionBtns) {
      const text = await btn.evaluate(el => el.textContent || '');
      if (text.includes('New Session')) {
        await btn.click();
        await sleep(2000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/12-new-session.png` });
        console.log('   Done: 12-new-session.png');
        break;
      }
    }
  } catch (e) {
    console.log('   New session issue:', e.message);
  }

  // Click Find Blind Spots
  console.log('   Clicking Find Blind Spots...');
  try {
    const cards = await page.$$('div[class*="border"]');
    for (const card of cards) {
      const text = await card.evaluate(el => el.textContent || '');
      if (text.includes('Find Blind Spots')) {
        await card.click();
        await sleep(1000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/13-blind-spots-selected.png` });
        console.log('   Done: 13-blind-spots-selected.png');
        break;
      }
    }
  } catch (e) {
    console.log('   Blind spots issue:', e.message);
  }

  // ===== 10. EXPLORE AN IDEA =====
  console.log('10. Explore an Idea...');
  // Clear and try the third example
  if (textarea) {
    try {
      const ta = await page.$('textarea');
      if (ta) {
        await ta.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await sleep(300);
      }
    } catch {}
  }
  try {
    const cards = await page.$$('div[class*="border"]');
    for (const card of cards) {
      const text = await card.evaluate(el => el.textContent || '');
      if (text.includes('Explore an Idea')) {
        await card.click();
        await sleep(1000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/14-explore-idea-selected.png` });
        console.log('   Done: 14-explore-idea-selected.png');
        break;
      }
    }
  } catch (e) {
    console.log('   Explore idea issue:', e.message);
  }

  // ===== 11. FULL PAGE SCREENSHOT =====
  console.log('11. Full page screenshot...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/15-full-page.png`, fullPage: true });
  console.log('   Done: 15-full-page.png');

  // ===== 12. MOBILE VIEW =====
  console.log('12. Mobile view...');
  await page.setViewport({ width: 390, height: 844 });
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/16-mobile-conversation.png` });
  console.log('   Done: 16-mobile-conversation.png');

  // Try to find mobile toggle buttons
  console.log('13. Mobile visualization toggle...');
  try {
    const mobileBtns = await page.$$('button');
    for (const btn of mobileBtns) {
      const text = await btn.evaluate(el => el.textContent || '');
      if (text.includes('Visualization') || text.includes('Graph') || text.includes('Map') || text.includes('System')) {
        await btn.click();
        await sleep(1500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/17-mobile-visualization.png` });
        console.log('   Done: 17-mobile-visualization.png');
        break;
      }
    }
  } catch (e) {
    console.log('   Mobile toggle issue:', e.message);
  }

  // ===== 13. TABLET VIEW =====
  console.log('14. Tablet view...');
  await page.setViewport({ width: 768, height: 1024 });
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/18-tablet-view.png` });
  console.log('   Done: 18-tablet-view.png');

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
