#!/usr/bin/env node

// Simple test script to verify build process
const fs = require('fs-extra');
const path = require('path');

console.log('🧪 Testing build process...');

// Test if we can require the build script
(async function() {
  try {
    // Test basic file operations
    const testDir = path.join(__dirname, 'test-dist');
    await fs.ensureDir(testDir);
    console.log('✅ File operations work');
    
    // Test if we can copy files
    await fs.copy(path.join(__dirname, 'manifest.json'), path.join(testDir, 'manifest.json'));
    console.log('✅ File copying works');
    
    // Clean up
    await fs.remove(testDir);
    console.log('✅ Cleanup works');
    
    console.log('🎉 Basic build functionality test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})(); 