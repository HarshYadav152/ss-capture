#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

const argv = yargs(hideBin(process.argv))
  .option('browser', {
    alias: 'b',
    type: 'string',
    choices: ['chrome', 'firefox', 'edge'],
    description: 'Target browser for build'
    
  })
  .option('env', {
    alias: 'e',
    type: 'string',
    choices: ['development', 'production'],
    default: 'production',
    description: 'Build environment'
  })
  .help()
  .argv;

const browsers = argv.browser ? [argv.browser] : ['chrome', 'firefox', 'edge'];
const env = argv.env;

console.log(chalk.blue(`🚀 Building for browsers: ${browsers.join(', ')} (${env})`));

async function buildForBrowser(browser) {
  const distDir = path.join(__dirname, '..', 'dist', browser);
  const srcDir = path.join(__dirname, '..');

  try {
    // Clean and create dist directory
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Copy files from src structure
    const filesToCopy = [
      { src: 'src/popup/popup.html', dest: 'popup.html' },
      { src: 'src/popup/popup.js', dest: 'popup.js' },
      { src: 'src/js/content.js', dest: 'content.js' },
      { src: 'src/js/sessionPanel.js', dest: 'sessionPanel.js' },
      { src: 'src/js/background.js', dest: 'background.js' },
      { src: 'js/html2canvas.min.js', dest: 'html2canvas.min.js' },
      { src: 'js/html2canvas-bridge.js', dest: 'html2canvas-bridge.js' },
      { src: 'src/css/style.css', dest: 'style.css' },
      { src: 'src/css/sessionPanel.css', dest: 'sessionPanel.css' },
      { src: 'icons', dest: 'icons' },
      // Privacy Editor files
      { src: 'src/editor/editor.html', dest: 'editor/editor.html' },
      { src: 'src/editor/editor.js', dest: 'editor/editor.js' },
      { src: 'src/editor/editor.css', dest: 'editor/editor.css' }
    ];

    for (const file of filesToCopy) {
      const srcPath = path.join(srcDir, file.src);
      const destPath = path.join(distDir, file.dest);

      if (await fs.pathExists(srcPath)) {
        if (file.src === 'src/popup/popup.html') {
          // Process popup.html to fix CSS path
          let htmlContent = await fs.readFile(srcPath, 'utf8');
          htmlContent = htmlContent.replace('../css/style.css', 'style.css');
          await fs.writeFile(destPath, htmlContent);
          console.log(chalk.green(`✓ Processed and copied ${file.dest}`));
        } else if (file.dest.endsWith('.js')) {
          // Process JS files to fix injection paths
          let jsContent = await fs.readFile(srcPath, 'utf8');
          jsContent = jsContent.replace(/'src\/js\/content\.js'/g, "'content.js'");
          jsContent = jsContent.replace(/'src\/js\/sessionPanel\.js'/g, "'sessionPanel.js'");
          jsContent = jsContent.replace(/"src\/js\/content\.js"/g, '"content.js"');
          jsContent = jsContent.replace(/"src\/js\/sessionPanel\.js"/g, '"sessionPanel.js"');
          jsContent = jsContent.replace(/chrome\.runtime\.getURL\("js\/html2canvas\.min\.js"\)/g, 'chrome.runtime.getURL("html2canvas.min.js")');
          jsContent = jsContent.replace(/chrome\.runtime\.getURL\("js\/html2canvas-bridge\.js"\)/g, 'chrome.runtime.getURL("html2canvas-bridge.js")');
          await fs.writeFile(destPath, jsContent);
          console.log(chalk.green(`✓ Processed and copied ${file.dest}`));
        } else {
          await fs.copy(srcPath, destPath);
          console.log(chalk.green(`✓ Copied ${file.dest}`));
        }
      } else {
        console.log(chalk.yellow(`⚠️  Source file not found: ${file.src}`));
      }
    }

    // Generate browser-specific manifest
    const manifest = await generateManifest(browser, env);
    await fs.writeJson(path.join(distDir, 'manifest.json'), manifest, { spaces: 2 });
    console.log(chalk.green(`✓ Generated manifest.json for ${browser}`));

    console.log(chalk.green(`✅ Build completed for ${browser}`));
    return true;

  } catch (error) {
    console.error(chalk.red(`❌ Build failed for ${browser}:`), error.message);
    return false;
  }
}

async function generateManifest(browser, env) {
  const { version } = require('../package.json');

  const baseManifest = {
    manifest_version: 3,
    name: "SS-Capture",
    version: version,
    description: "Capture high-quality full-page screenshots with a modern glassmorphic interface.",
    permissions: [
      "activeTab",
      "scripting",
      "downloads",
      "storage",
      "unlimitedStorage",
      "contextMenus",
      "tabs"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    background: {
      service_worker: "background.js"
    },
    action: {
      default_popup: "popup.html",
      default_icon: {
        "48": "icons/icon-48x48.png",
        "128": "icons/icon-128x128.png"
      }
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js", "sessionPanel.js"],
        css: ["style.css", "sessionPanel.css"],
        run_at: "document_start"
      }
    ],
    web_accessible_resources: [
      {
        resources: ["html2canvas.min.js", "html2canvas-bridge.js"],
        matches: ["<all_urls>"]
      }
    ],
    icons: {
      "48": "icons/icon-48x48.png",
      "128": "icons/icon-128x128.png"
    },
    commands: {
      "_execute_action": {
        "suggested_key": {
          "default": "Alt+Shift+S",
          "mac": "Command+Shift+S"
        },
        "description": "Open the extension popup"
      },
      "capture_full_page": {
        "suggested_key": {
          "default": "Alt+Shift+F",
          "mac": "Command+Shift+F"
        },
        "description": "Background Full Page Capture"
      }
    }
  };

  // Browser-specific modifications
  switch (browser) {
    case 'firefox':
      baseManifest.browser_specific_settings = {
        gecko: {
          id: "fullpage-screenshot@example.com",
          strict_min_version: "109.0"
        }
      };
      break;

    case 'edge':
      // Edge uses the same manifest as Chrome
      break;

    case 'chrome':
    default:
      // Chrome manifest is the base
      break;
  }

  // Environment-specific modifications
  if (env === 'development') {
    baseManifest.name += ' (Dev)';
    baseManifest.description += ' - Development Version';
  }

  return baseManifest;
}

async function main() {
  console.log(chalk.blue('🔨 Starting build process...'));

  const results = [];

  for (const browser of browsers) {
    console.log(chalk.yellow(`\n📦 Building for ${browser}...`));
    const success = await buildForBrowser(browser);
    results.push({ browser, success });
  }

  console.log(chalk.blue('\n📊 Build Summary:'));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log(chalk.green(`✅ Successful: ${successful.map(r => r.browser).join(', ')}`));
  }

  if (failed.length > 0) {
    console.log(chalk.red(`❌ Failed: ${failed.map(r => r.browser).join(', ')}`));
    process.exit(1);
  }

  console.log(chalk.green('\n🎉 All builds completed successfully!'));
  console.log(chalk.blue('📁 Output directory: dist/'));
}

main().catch(error => {
  console.error(chalk.red('💥 Build process failed:'), error);
  process.exit(1);
}); 