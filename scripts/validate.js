#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function validateExtension() {
  console.log(chalk.blue('🔍 Validating extension...'));

  const errors = [];
  const warnings = [];

  try {
    // Check required files
    const requiredFiles = [
      'src/manifest.json',
      'src/popup/popup.html',
      'src/popup/popup.js',
      'src/js/content.js',
      'src/js/background.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (await fs.pathExists(filePath)) {
        console.log(chalk.green(`✓ Found ${file}`));
      } else {
        errors.push(`Missing required file: ${file}`);
        console.log(chalk.red(`✗ Missing ${file}`));
      }
    }

    // Validate manifest.json
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      try {
        const manifest = await fs.readJson(manifestPath);
        
        // Check required manifest fields
        const requiredFields = ['manifest_version', 'name', 'version', 'permissions'];
        for (const field of requiredFields) {
          if (!manifest[field]) {
            errors.push(`Missing required manifest field: ${field}`);
          }
        }

        // Check manifest version
        if (manifest.manifest_version !== 3) {
          warnings.push('Manifest version should be 3 for modern browsers');
        }

        // Check permissions
        const requiredPermissions = ['activeTab', 'scripting'];
        for (const permission of requiredPermissions) {
          if (!manifest.permissions || !manifest.permissions.includes(permission)) {
            errors.push(`Missing required permission: ${permission}`);
          }
        }

        console.log(chalk.green('✓ Manifest validation completed'));
      } catch (error) {
        errors.push(`Invalid manifest.json: ${error.message}`);
      }
    }

    // Check icons directory
    const iconsDir = path.join(__dirname, '..', 'icons');
    if (await fs.pathExists(iconsDir)) {
      const iconFiles = await fs.readdir(iconsDir);
      if (iconFiles.length === 0) {
        warnings.push('Icons directory is empty');
      } else {
        console.log(chalk.green(`✓ Found ${iconFiles.length} icon files`));
      }
    } else {
      warnings.push('Icons directory not found');
    }

    // Validate HTML files
    const htmlFiles = ['popup.html'];
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(__dirname, '..', htmlFile);
      if (await fs.pathExists(htmlPath)) {
        const content = await fs.readFile(htmlPath, 'utf8');
        
        // Basic HTML validation
        if (!content.includes('<!DOCTYPE html>')) {
          warnings.push(`${htmlFile} should include DOCTYPE declaration`);
        }
        
        if (!content.includes('<html')) {
          errors.push(`${htmlFile} should include <html> tag`);
        }
        
        if (!content.includes('<head')) {
          errors.push(`${htmlFile} should include <head> tag`);
        }
        
        if (!content.includes('<body')) {
          errors.push(`${htmlFile} should include <body> tag`);
        }
      }
    }

    // Check file sizes
    const maxFileSizes = {
      'popup.js': 1024 * 10, // 10KB
      'content.js': 1024 * 50, // 50KB
      'background.js': 1024 * 10, // 10KB
    };

    for (const [file, maxSize] of Object.entries(maxFileSizes)) {
      const filePath = path.join(__dirname, '..', file);
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        if (stats.size > maxSize) {
          warnings.push(`${file} is larger than recommended (${(stats.size / 1024).toFixed(1)}KB > ${(maxSize / 1024).toFixed(1)}KB)`);
        }
      }
    }

    // Security checks
    const jsFiles = ['popup.js', 'content.js', 'background.js'];
    for (const jsFile of jsFiles) {
      const jsPath = path.join(__dirname, '..', jsFile);
      if (await fs.pathExists(jsPath)) {
        const content = await fs.readFile(jsPath, 'utf8');
        
        // Check for potentially dangerous patterns
        const dangerousPatterns = [
          /eval\s*\(/,
          /innerHTML\s*=/,
          /document\.write/,
          /setTimeout\s*\(\s*['"`][^'"`]*['"`]/,
          /setInterval\s*\(\s*['"`][^'"`]*['"`]/
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            warnings.push(`${jsFile} contains potentially dangerous code pattern`);
            break;
          }
        }
      }
    }

  } catch (error) {
    errors.push(`Validation error: ${error.message}`);
  }

  // Report results
  console.log(chalk.blue('\n📊 Validation Results:'));

  if (errors.length === 0 && warnings.length === 0) {
    console.log(chalk.green('✅ All validations passed!'));
    return true;
  }

  if (errors.length > 0) {
    console.log(chalk.red(`\n❌ Errors (${errors.length}):`));
    errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Warnings (${warnings.length}):`));
    warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
  }

  return errors.length === 0;
}

async function main() {
  const isValid = await validateExtension();
  
  if (!isValid) {
    console.log(chalk.red('\n💥 Extension validation failed!'));
    process.exit(1);
  }
  
  console.log(chalk.green('\n🎉 Extension is ready for distribution!'));
}

main().catch(error => {
  console.error(chalk.red('💥 Validation process failed:'), error);
  process.exit(1);
}); 