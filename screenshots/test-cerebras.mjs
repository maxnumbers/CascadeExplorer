import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:9002';
const SCREENSHOT_DIR = '/home/user/CascadeExplorer/screenshots';
const CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell';

const CEREBRAS_API_KEY = process.env.CEREBRAS_GPT_OSS_API_KEY;
const CEREBRAS_MODEL = 'qwen-3-235b-a22b-instruct-2507';

if (!CEREBRAS_API_KEY) {
  console.error('CEREBRAS_GPT_OSS_API_KEY not set');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-software-rasterizer', '--single-process'],
    protocolTimeout: 180000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`   BROWSER ERROR: ${msg.text()}`);
  });

  // === Load app, configure Cerebras as first-class provider ===
  console.log('1. Loading app...');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
  await sleep(3000);

  await page.evaluate((config) => {
    const settings = {
      state: {
        provider: 'cerebras',
        modelId: config.model,
        apiKey: config.apiKey,
        isConfigured: true,
        customBaseUrl: '',
        customModelId: '',
        theme: 'dark',
        showAdaptationPanel: true,
        conversationPanelWidth: 60,
        groundingLevel: 'balanced',
        preferredSourceTypes: ['academic', 'industry_report', 'government_data'],
      },
      version: 0,
    };
    localStorage.setItem('cascade-explorer-settings', JSON.stringify(settings));
  }, { apiKey: CEREBRAS_API_KEY, model: CEREBRAS_MODEL });

  console.log('2. Reloading with Cerebras configured...');
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-01-configured-landing.png` });
  console.log('   Screenshot: cerebras-01-configured-landing.png');

  // === Open settings to show Cerebras as first-class provider with dynamic models ===
  console.log('3. Opening settings dialog...');
  const settingsBtns = await page.$$('button');
  for (const btn of settingsBtns) {
    const text = await btn.evaluate(el => el.textContent || '');
    if (text.includes('Connected') || text.includes('Not Configured')) {
      await btn.click();
      await sleep(2000);
      break;
    }
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-02-settings-cerebras.png` });
  console.log('   Screenshot: cerebras-02-settings-cerebras.png');

  // Wait for dynamic model fetch to complete
  await sleep(4000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-03-settings-models-fetched.png` });
  console.log('   Screenshot: cerebras-03-settings-models-fetched.png');

  await page.keyboard.press('Escape');
  await sleep(500);

  // === Submit assertion ===
  console.log('4. Typing assertion...');
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.click();
    await sleep(200);
  }
  const assertion = 'Should we adopt a 4-day work week?';
  for (const char of assertion) {
    await page.keyboard.type(char, { delay: 10 });
  }
  await sleep(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-04-assertion-typed.png` });
  console.log('   Screenshot: cerebras-04-assertion-typed.png');

  console.log('5. Submitting...');
  await page.keyboard.press('Enter');
  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-05-after-submit.png` });
  console.log('   Screenshot: cerebras-05-after-submit.png');

  let state = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      messageCount: (t.match(/(\d+) messages?/) || [])[1] || '0',
      hasWelcome: t.includes('Welcome to CascadeExplorer'),
    };
  });
  console.log('   State:', JSON.stringify(state));

  // Wait for AI response
  if (!state.hasWelcome || state.messageCount !== '0') {
    console.log('6. Waiting for Cerebras AI response...');
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const cur = await page.evaluate(() => {
        const t = document.body.innerText;
        return {
          messageCount: (t.match(/(\d+) messages?/) || [])[1] || '0',
          hasThinking: t.includes('Thinking') || t.includes('AI is thinking'),
        };
      });
      console.log(`   [${(i+1)*5}s] Messages: ${cur.messageCount}, Thinking: ${cur.hasThinking}`);
      if (parseInt(cur.messageCount) >= 2 && !cur.hasThinking) break;
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-06-ai-response.png` });
    console.log('   Screenshot: cerebras-06-ai-response.png');

    // Follow-up
    console.log('7. Sending follow-up...');
    const ta2 = await page.$('textarea');
    if (ta2) { await ta2.click(); await sleep(200); }
    const followup = 'What about the impact on team collaboration?';
    for (const char of followup) {
      await page.keyboard.type(char, { delay: 10 });
    }
    await sleep(300);
    await page.keyboard.press('Enter');

    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const cur = await page.evaluate(() => {
        const t = document.body.innerText;
        return { messageCount: (t.match(/(\d+) messages?/) || [])[1] || '0' };
      });
      console.log(`   [${(i+1)*5}s] Messages: ${cur.messageCount}`);
      if (parseInt(cur.messageCount) >= 4) break;
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-07-followup-response.png` });
    console.log('   Screenshot: cerebras-07-followup-response.png');
  }

  // Final
  console.log('8. Final screenshots...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-08-final-desktop.png` });
  await page.setViewport({ width: 390, height: 844 });
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-09-final-mobile.png` });
  console.log('   All screenshots captured!');

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
