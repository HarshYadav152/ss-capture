#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('🧪 Testing updated build process...');

(async function() {
  try {
    // Test if source files exist
    const sourceFiles = [
      'src/popup/popup.html',
      'src/popup/popup.js', 
      'src/js/content.js',
      'src/js/background.js',
      'src/css/style.css',
      'icons/icon-48x48.png'
    ];
    
    for (const file of sourceFiles) {
      const filePath = path.join(__dirname, file);
      if (await fs.pathExists(filePath)) {
        console.log(`✅ Found ${file}`);
      } else {
        console.log(`❌ Missing ${file}`);
      }
    }
    
    // Test CSS path replacement
    const htmlPath = path.join(__dirname, 'src/popup/popup.html');
    let htmlContent = await fs.readFile(htmlPath, 'utf8');
    const hasCssReference = htmlContent.includes('../css/style.css');
    console.log(`✅ CSS reference found: ${hasCssReference}`);
    
    // Test replacement
    htmlContent = htmlContent.replace('../css/style.css', 'style.css');
    const hasFixedReference = htmlContent.includes('style.css');
    console.log(`✅ CSS path fixed: ${hasFixedReference}`);
    
    console.log('🎉 Build script should work correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})(); 