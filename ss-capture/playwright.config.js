const path = require('path');
// Use the extension's source folder (where manifest.json exists)
const extPath = path.resolve(__dirname, 'src');

module.exports = {
  testDir: 'tests/e2e',
  timeout: 30 * 1000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    // slowMo: 50,
  },
  projects: [
    {
      name: 'chromium-with-extension',
      use: {
        channel: 'chrome',
        launchOptions: {
          args: [
            `--disable-extensions-except=${extPath}`,
            `--load-extension=${extPath}`
          ]
        }
      }
    }
  ]
};