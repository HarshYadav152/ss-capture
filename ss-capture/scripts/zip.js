#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const chalk = require('chalk');

async function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(chalk.green(`✓ Created ${path.basename(outputPath)} (${size} MB)`));
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  console.log(chalk.blue('📦 Creating distribution packages...'));

  const distDir = path.join(__dirname, '..', 'dist');
  const packagesDir = path.join(__dirname, '..', 'dist');

  try {
    // Ensure packages directory exists
    await fs.ensureDir(packagesDir);

    const browsers = ['chrome', 'firefox', 'edge'];
    const results = [];

    for (const browser of browsers) {
      const sourceDir = path.join(distDir, browser);
      const outputPath = path.join(packagesDir, `${browser}-extension.zip`);

      if (await fs.pathExists(sourceDir)) {
        try {
          await createZip(sourceDir, outputPath);
          results.push({ browser, success: true });
        } catch (error) {
          console.error(chalk.red(`❌ Failed to create ${browser} package:`), error.message);
          results.push({ browser, success: false });
        }
      } else {
        console.warn(chalk.yellow(`⚠️  Source directory not found for ${browser}`));
        results.push({ browser, success: false });
      }
    }

    console.log(chalk.blue('\n📊 Package Summary:'));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      console.log(chalk.green(`✅ Successful: ${successful.map(r => r.browser).join(', ')}`));
    }

    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed: ${failed.map(r => r.browser).join(', ')}`));
    }

    if (successful.length > 0) {
      console.log(chalk.green('\n🎉 Distribution packages created successfully!'));
      console.log(chalk.blue('📁 Packages location: dist/'));
    }

  } catch (error) {
    console.error(chalk.red('💥 Package creation failed:'), error);
    process.exit(1);
  }
}

main(); 