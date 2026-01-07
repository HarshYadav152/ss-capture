const { test, expect } = require('@playwright/test');
const path = require('path');

// Simple base64 transparent PNG small image
const SMALL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

test('in-page panel shows injected items and modal actions', async ({ context }) => {
  // Open test page with test mode enabled
  const page = await context.newPage();
  await page.goto('https://example.com/?ss-test=1');

  // Wait for the panel to be injected; if not present, inject the script directly (fallback for test env)
  try {
    await page.waitForSelector('#ss-session-panel', { timeout: 5000 });
  } catch (e) {
    // fallback: load sessionPanel.js directly into the page
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(__dirname, '../../src/js/sessionPanel.js');
    const code = fs.readFileSync(filePath, 'utf8');
    await page.addScriptTag({ content: code });
    await page.waitForSelector('#ss-session-panel', { timeout: 5000 });
  }

  // Inject an item via window.postMessage (test hook in sessionPanel.js)
  await page.evaluate((dataUrl) => {
    window.postMessage({ type: 'SS_TEST_ADD', item: { dataUrl, thumbnail: dataUrl, filename: 't1.png' } }, '*');
  }, SMALL_PNG);

  // Wait for the thumbnail to appear
  await page.waitForSelector('.ss-thumb img', { timeout: 5000 });

  const thumbs = await page.$$('.ss-thumb');
  expect(thumbs.length).toBeGreaterThan(0);

  // Click the first thumbnail and verify modal appears
  await thumbs[0].click();
  await page.waitForSelector('#ss-session-modal[aria-hidden="false"]', { timeout: 3000 });

  const modalImg = await page.$('#ss-modal-image');
  const src = await modalImg.getAttribute('src');
  expect(src).toBe(SMALL_PNG);

  // Click delete and confirm removal
  await page.click('#ss-modal-delete');
  // Wait briefly for UI update
  await page.waitForTimeout(300);
  const remaining = await page.$$('.ss-thumb');
  expect(remaining.length).toBe(0);
});

test('caps items at 20', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://example.com/?ss-test=1');
  try {
    await page.waitForSelector('#ss-session-panel', { timeout: 5000 });
  } catch (e) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(__dirname, '../../src/js/sessionPanel.js');
    const code = fs.readFileSync(filePath, 'utf8');
    await page.addScriptTag({ content: code });
    await page.waitForSelector('#ss-session-panel', { timeout: 5000 });
  }

  // inject 25 items
  for (let i = 0; i < 25; i++) {
    await page.evaluate(({ i, dataUrl }) => {
      window.postMessage({ type: 'SS_TEST_ADD', item: { dataUrl, thumbnail: dataUrl, filename: `t${i}.png` } }, '*');
    }, { i, dataUrl: SMALL_PNG });
  }

  // give some time to render
  await page.waitForTimeout(500);
  const thumbs = await page.$$('.ss-thumb');
  expect(thumbs.length).toBe(20);
});