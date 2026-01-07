#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawn } = require('child_process');

const srcDir = path.join(__dirname, '..', 'src');
const watchedFiles = new Set();
let isBuilding = false;
let debounceTimeout;

console.log(chalk.blue('👀 Watching for changes...'));
console.log(chalk.gray(`Watching directory: ${srcDir}`));

// Function to recursively watch directories
function watchDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        watchDirectory(filePath);
      } else {
        watchFile(filePath);
      }
    });
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dir}: ${error.message}`));
  }
}

// Function to watch individual files
function watchFile(filePath) {
  if (watchedFiles.has(filePath)) {
    return;
  }
  
  watchedFiles.add(filePath);
  
  fs.watchFile(filePath, { interval: 1000 }, () => {
    console.log(chalk.gray(`Changed: ${path.relative(srcDir, filePath)}`));
    debouncedBuild();
  });
}

// Debounced build function
function debouncedBuild() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(runBuild, 500);
}

async function runBuild() {
  if (isBuilding) {
    return;
  }

  isBuilding = true;
  console.log(chalk.yellow('\n🔨 Building...'));

  return new Promise((resolve) => {
    const build = spawn('npm', ['run', 'build:dev'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..')
    });

    build.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('✓ Build completed successfully'));
      } else {
        console.log(chalk.red(`✗ Build failed with exit code ${code}`));
      }
      isBuilding = false;
      resolve();
    });

    build.on('error', (error) => {
      console.log(chalk.red(`✗ Build error: ${error.message}`));
      isBuilding = false;
      resolve();
    });
  });
}

// Watch for new files
fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (eventType === 'rename') {
    const filePath = path.join(srcDir, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log(chalk.gray(`Added: ${filename}`));
      watchFile(filePath);
      debouncedBuild();
    } else {
      console.log(chalk.gray(`Deleted: ${filename}`));
      debouncedBuild();
    }
  }
});

// Initial file watching
watchDirectory(srcDir);
console.log(chalk.green('✓ Watcher ready, watching for changes...'));

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Stopping watcher...'));
  watchedFiles.forEach((filePath) => {
    fs.unwatchFile(filePath);
  });
  console.log(chalk.green('✓ Watcher stopped'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n👋 Stopping watcher...'));
  watchedFiles.forEach((filePath) => {
    fs.unwatchFile(filePath);
  });
  console.log(chalk.green('✓ Watcher stopped'));
  process.exit(0);
});
