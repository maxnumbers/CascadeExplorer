import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:9002';
const SCREENSHOT_DIR = '/home/user/CascadeExplorer/screenshots';
const CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell';

// Cerebras config
const CEREBRAS_API_KEY = process.env.CEREBRAS_GPT_OSS_API_KEY;
const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
const CEREBRAS_MODEL = 'llama-3.3-70b';

if (!CEREBRAS_API_KEY) {
  console.error('CEREBRAS_GPT_OSS_API_KEY not set');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Set value on a React controlled textarea by triggering the native input setter
 * which React's event system intercepts.
 */
async function setReactTextareaValue(page, selector, value) {
  await page.evaluate(({ sel, val }) => {
    const textarea = document.querySelector(sel);
    if (!textarea) throw new Error(`Textarea not found: ${sel}`);

    // Use the native setter to trigger React's onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(textarea, val);

    // Dispatch input event which React listens to
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    // Also dispatch change event for good measure
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: value });
}

async function main() {
  console.log('Launching browser...');
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
    protocolTimeout: 180000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Capture console logs and errors
  const consoleLogs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      console.log(`   BROWSER ERROR: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`   PAGE ERROR: ${err.message}`);
    consoleLogs.push(`[pageerror] ${err.message}`);
  });

  // === STEP 1: Load app, configure Cerebras via localStorage ===
  console.log('Step 1: Loading app and configuring Cerebras...');
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
  await sleep(3000);

  // Set localStorage with Cerebras config
  await page.evaluate((config) => {
    const settings = {
      state: {
        provider: 'custom',
        modelId: 'custom',
        apiKey: config.apiKey,
        isConfigured: true,
        customBaseUrl: config.baseUrl,
        customModelId: config.model,
        theme: 'dark',
        showAdaptationPanel: true,
        conversationPanelWidth: 60,
        groundingLevel: 'balanced',
        preferredSourceTypes: ['academic', 'industry_report', 'government_data'],
      },
      version: 0,
    };
    localStorage.setItem('cascade-explorer-settings', JSON.stringify(settings));
  }, { apiKey: CEREBRAS_API_KEY, baseUrl: CEREBRAS_BASE_URL, model: CEREBRAS_MODEL });

  // Reload to pick up settings
  console.log('Step 2: Reloading with Cerebras configured...');
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-01-configured-landing.png` });
  console.log('   Screenshot: cerebras-01-configured-landing.png');

  // Check if textarea is enabled
  const textareaDisabled = await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    return ta ? ta.disabled : 'not found';
  });
  console.log('   Textarea disabled:', textareaDisabled);

  // === STEP 3: Open settings to verify configuration ===
  console.log('Step 3: Verifying settings configuration...');
  const settingsBtns = await page.$$('button');
  for (const btn of settingsBtns) {
    const text = await btn.evaluate(el => el.textContent || '');
    if (text.includes('Connected') || text.includes('Not Configured')) {
      await btn.click();
      await sleep(1500);
      break;
    }
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-02-settings-dialog.png` });
  console.log('   Screenshot: cerebras-02-settings-dialog.png');
  await page.keyboard.press('Escape');
  await sleep(500);

  // === STEP 4: Type and submit using React-compatible approach ===
  console.log('Step 4: Typing assertion...');

  // Focus textarea
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.click();
    await sleep(300);
  }

  // Set value using React-compatible method
  await setReactTextareaValue(page, 'textarea', 'Should we adopt a 4-day work week?');
  await sleep(500);

  // Verify
  const inputValue = await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    return ta ? ta.value : 'not found';
  });
  console.log('   Textarea value:', inputValue);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-03-assertion-typed.png` });
  console.log('   Screenshot: cerebras-03-assertion-typed.png');

  // === STEP 5: Submit via keyboard Enter ===
  console.log('Step 5: Submitting via Enter key...');
  if (textarea) {
    await textarea.focus();
    await sleep(200);
  }
  await page.keyboard.press('Enter');
  console.log('   Pressed Enter');

  await sleep(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-04-after-submit.png` });
  console.log('   Screenshot: cerebras-04-after-submit.png');

  // Check state
  let state = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      messageCount: (bodyText.match(/(\d+) messages?/) || [])[1] || '0',
      hasWelcome: bodyText.includes('Welcome to CascadeExplorer'),
      hasThinking: bodyText.includes('Thinking') || bodyText.includes('thinking'),
      hasAnalyzing: bodyText.includes('Analyzing'),
      phase: bodyText.includes('Analyzing input') ? 'seeding' :
             bodyText.includes('Ready to explore') ? 'welcome' : 'other',
    };
  });
  console.log('   State:', JSON.stringify(state));

  // If submission didn't work, try clicking the send button directly
  if (state.messageCount === '0' && state.hasWelcome) {
    console.log('   Submission via Enter failed. Trying click approach...');

    // Re-fill the textarea
    await setReactTextareaValue(page, 'textarea', 'Should we adopt a 4-day work week?');
    await sleep(300);

    // Try clicking the send button using its SVG icon
    await page.evaluate(() => {
      // Find the send button - it should be the button at the bottom-right of textarea area
      const textareaWrapper = document.querySelector('textarea')?.closest('.relative');
      if (textareaWrapper) {
        const buttons = textareaWrapper.querySelectorAll('button');
        // The last button in the textarea area should be Send
        const sendBtn = buttons[buttons.length - 1];
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          return 'clicked';
        }
        return `found ${buttons.length} buttons, send disabled: ${sendBtn?.disabled}`;
      }
      return 'no wrapper';
    });

    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-05-click-submit.png` });
    console.log('   Screenshot: cerebras-05-click-submit.png');

    state = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        messageCount: (bodyText.match(/(\d+) messages?/) || [])[1] || '0',
        hasWelcome: bodyText.includes('Welcome to CascadeExplorer'),
      };
    });
    console.log('   State after click:', JSON.stringify(state));
  }

  // If still not working, try the most direct approach: call handleSubmit through React
  if (state.messageCount === '0' && state.hasWelcome) {
    console.log('   Click approach failed. Trying React fiber approach...');

    // Clear and focus textarea, then use keyboard simulation
    await page.evaluate(() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.focus();
        // Clear current value
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set;
        setter.call(ta, '');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(200);

    // Type character by character using keyboard
    const assertion = 'Should we adopt a 4-day work week?';
    for (const char of assertion) {
      await page.keyboard.type(char, { delay: 10 });
    }
    await sleep(500);

    // Check value
    const val = await page.evaluate(() => document.querySelector('textarea')?.value);
    console.log('   After keyboard typing, value:', val);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-06-keyboard-typed.png` });
    console.log('   Screenshot: cerebras-06-keyboard-typed.png');

    // Now press Enter
    await page.keyboard.press('Enter');
    console.log('   Pressed Enter');

    await sleep(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-07-keyboard-submitted.png` });
    console.log('   Screenshot: cerebras-07-keyboard-submitted.png');

    state = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        messageCount: (bodyText.match(/(\d+) messages?/) || [])[1] || '0',
        hasWelcome: bodyText.includes('Welcome to CascadeExplorer'),
      };
    });
    console.log('   State after keyboard:', JSON.stringify(state));
  }

  // === Wait for AI response ===
  if (!state.hasWelcome || state.messageCount !== '0') {
    console.log('Step 6: Message sent! Waiting for Cerebras AI response...');
    // Wait up to 60 seconds for response
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const currentState = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          messageCount: (bodyText.match(/(\d+) messages?/) || [])[1] || '0',
          hasThinking: bodyText.includes('Thinking') || bodyText.includes('AI is thinking'),
        };
      });
      console.log(`   [${(i+1)*5}s] Messages: ${currentState.messageCount}, Thinking: ${currentState.hasThinking}`);
      if (parseInt(currentState.messageCount) >= 2 && !currentState.hasThinking) {
        console.log('   Response received!');
        break;
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-08-ai-response.png` });
    console.log('   Screenshot: cerebras-08-ai-response.png');

    // === STEP 7: Send follow-up ===
    console.log('Step 7: Sending follow-up about team collaboration...');
    const ta2 = await page.$('textarea');
    if (ta2) {
      await ta2.click();
      await sleep(200);
      await ta2.focus();
    }
    // Type using keyboard
    const followup = 'What about the impact on team collaboration and communication?';
    for (const char of followup) {
      await page.keyboard.type(char, { delay: 10 });
    }
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-09-followup-typed.png` });
    console.log('   Screenshot: cerebras-09-followup-typed.png');

    await page.keyboard.press('Enter');
    console.log('   Submitted follow-up');

    // Wait for response
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const currentState = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          messageCount: (bodyText.match(/(\d+) messages?/) || [])[1] || '0',
          hasThinking: bodyText.includes('Thinking') || bodyText.includes('AI is thinking'),
        };
      });
      console.log(`   [${(i+1)*5}s] Messages: ${currentState.messageCount}, Thinking: ${currentState.hasThinking}`);
      if (parseInt(currentState.messageCount) >= 4 && !currentState.hasThinking) {
        console.log('   Follow-up response received!');
        break;
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-10-followup-response.png` });
    console.log('   Screenshot: cerebras-10-followup-response.png');

    // Scroll conversation to top and bottom
    await page.evaluate(() => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) scrollArea.scrollTop = 0;
    });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-11-conversation-top.png` });
    console.log('   Screenshot: cerebras-11-conversation-top.png');

    await page.evaluate(() => {
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-12-conversation-bottom.png` });
    console.log('   Screenshot: cerebras-12-conversation-bottom.png');
  } else {
    console.log('   WARNING: Could not submit message to conversation.');
  }

  // === Final screenshots ===
  console.log('Step 8: Final screenshots...');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-13-final-desktop.png` });
  console.log('   Screenshot: cerebras-13-final-desktop.png');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-14-final-fullpage.png`, fullPage: true });
  console.log('   Screenshot: cerebras-14-final-fullpage.png');

  await page.setViewport({ width: 390, height: 844 });
  await sleep(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/cerebras-15-final-mobile.png` });
  console.log('   Screenshot: cerebras-15-final-mobile.png');

  // Print console summary
  console.log('\n=== Browser Console Summary ===');
  const errors = consoleLogs.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length > 0) {
    console.log(`${errors.length} errors found:`);
    errors.slice(-10).forEach(e => console.log('  ' + e));
  } else {
    console.log('No errors detected');
  }
  console.log(`Total console messages: ${consoleLogs.length}`);
  consoleLogs.slice(-15).forEach(l => console.log('  ' + l));

  await browser.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
