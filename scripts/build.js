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
      { src: 'src/js/background.js', dest: 'background.js' },
      { src: 'src/css/style.css', dest: 'style.css' },
      { src: 'icons', dest: 'icons' }
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
  const baseManifest = {
    manifest_version: 3,
    name: "Full Page Screenshot Capture",
    version: "1.1.0",
    description: "Capture high-quality full-page screenshots with a modern glassmorphic interface.",
    permissions: [
      "activeTab",
      "scripting",
      "downloads"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    background: {
      service_worker: "background.js",
      type: "module"
    },
    action: {
      default_popup: "popup.html",
      default_icon: {
        "48": "icons/icon-48x48.png",
        "128": "icons/icon-128x128.png"
      }
    },
    icons: {
      "48": "icons/icon-48x48.png",
      "128": "icons/icon-128x128.png"
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