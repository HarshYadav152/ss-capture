/**
 * Privacy Blur/Pixelate Editor for SS-Capture
 * Implements Issue #33 - Privacy Blur/Pixelate Tool
 * 
 * Features:
 * - Blur effect with adjustable intensity (5-50px)
 * - Pixelate effect with adjustable pixel size (5-30px)
 * - Rectangle selection for applying effects
 * - Undo functionality
 * - Clear all effects
 * - Keyboard shortcuts
 */

// ===============================
// STATE MANAGEMENT
// ===============================

let canvas, ctx;
let originalImageData = null;
let currentImageData = null;
let effects = [];
let currentTool = 'select';
let isDrawing = false;
let startX = 0, startY = 0;
let intensity = 15;

// Selection box element
let selectionBox;

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  initializeEditor();
  setupEventListeners();
  loadScreenshot();
});

function initializeEditor() {
  canvas = document.getElementById('editorCanvas');
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  selectionBox = document.getElementById('selectionBox');

  updateStatus('Ready to edit');
}

function setupEventListeners() {
  // Tool buttons
  document.getElementById('selectTool').addEventListener('click', () => selectTool('select'));
  document.getElementById('blurTool').addEventListener('click', () => selectTool('blur'));
  document.getElementById('pixelateTool').addEventListener('click', () => selectTool('pixelate'));

  // Action buttons
  document.getElementById('undoBtn').addEventListener('click', undoEffect);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllEffects);
  document.getElementById('saveBtn').addEventListener('click', saveAndClose);
  document.getElementById('downloadBtn').addEventListener('click', downloadScreenshot);

  // Intensity slider
  const intensitySlider = document.getElementById('intensitySlider');
  intensitySlider.addEventListener('input', (e) => {
    intensity = parseInt(e.target.value);
    document.getElementById('intensityValue').textContent = intensity;
  });

  // Canvas mouse events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
}

// ===============================
// SCREENSHOT LOADING
// ===============================

function loadScreenshot() {
  const screenshotData = localStorage.getItem('screenshotForEdit');

  if (!screenshotData) {
    updateStatus('No screenshot data found', true);
    return;
  }

  const img = new Image();
  img.onload = () => {
    // Set canvas dimensions
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Store original image data
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Update UI
    document.getElementById('canvasDimensions').textContent = `${img.width} × ${img.height}`;
    updateStatus('Screenshot loaded - Select a tool to start editing');

    // Clear localStorage
    localStorage.removeItem('screenshotForEdit');
  };

  img.onerror = () => {
    updateStatus('Failed to load screenshot', true);
  };

  img.src = screenshotData;
}

// ===============================
// TOOL SELECTION
// ===============================

function selectTool(tool) {
  currentTool = tool;

  // Update button states
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${tool}Tool`).classList.add('active');

  // Update cursor
  document.body.classList.remove('cursor-blur', 'cursor-pixelate', 'cursor-select');
  document.body.classList.add(`cursor-${tool}`);

  // Update intensity label based on tool
  const intensityLabel = document.getElementById('intensityLabel');
  if (tool === 'blur') {
    intensityLabel.textContent = 'Blur Radius:';
    document.getElementById('intensitySlider').max = 50;
  } else if (tool === 'pixelate') {
    intensityLabel.textContent = 'Pixel Size:';
    document.getElementById('intensitySlider').max = 30;
  } else {
    intensityLabel.textContent = 'Intensity:';
  }

  updateStatus(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
}

// ===============================
// MOUSE EVENT HANDLERS
// ===============================

function handleMouseDown(e) {
  if (currentTool === 'select') return;

  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  startX = (e.clientX - rect.left) * scaleX;
  startY = (e.clientY - rect.top) * scaleY;

  // Show selection box
  selectionBox.style.display = 'block';
  updateSelectionBox(e);
}

function handleMouseMove(e) {
  if (!isDrawing) return;
  updateSelectionBox(e);
}

function handleMouseUp(e) {
  if (!isDrawing) return;
  isDrawing = false;

  // Hide selection box
  selectionBox.style.display = 'none';

  // Get final coordinates
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const endX = (e.clientX - rect.left) * scaleX;
  const endY = (e.clientY - rect.top) * scaleY;

  // Calculate selection rectangle
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // Minimum selection size
  if (width < 10 || height < 10) {
    updateStatus('Selection too small - drag a larger area');
    return;
  }

  // Apply effect
  applyEffect(x, y, width, height);
}

function updateSelectionBox(e) {
  const rect = canvas.getBoundingClientRect();
  const containerRect = document.querySelector('.canvas-container').getBoundingClientRect();

  const currentX = e.clientX - containerRect.left;
  const currentY = e.clientY - containerRect.top;

  const canvasOffsetX = rect.left - containerRect.left;
  const canvasOffsetY = rect.top - containerRect.top;

  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  const boxX = Math.min(startX * scaleX + canvasOffsetX, currentX);
  const boxY = Math.min(startY * scaleY + canvasOffsetY, currentY);
  const boxWidth = Math.abs(currentX - (startX * scaleX + canvasOffsetX));
  const boxHeight = Math.abs(currentY - (startY * scaleY + canvasOffsetY));

  selectionBox.style.left = `${boxX}px`;
  selectionBox.style.top = `${boxY}px`;
  selectionBox.style.width = `${boxWidth}px`;
  selectionBox.style.height = `${boxHeight}px`;
}

// ===============================
// EFFECT APPLICATION
// ===============================

function applyEffect(x, y, width, height) {
  // Store effect for undo
  const effect = {
    type: currentTool,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    intensity: intensity
  };

  effects.push(effect);

  // Apply the effect
  if (currentTool === 'blur') {
    applyBlur(effect.x, effect.y, effect.width, effect.height, effect.intensity);
  } else if (currentTool === 'pixelate') {
    applyPixelate(effect.x, effect.y, effect.width, effect.height, effect.intensity);
  }

  // Update current image data
  currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Update UI
  updateEffectCount();
  updateStatus(`${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} effect applied`);
}

/**
 * Apply blur effect using stack blur algorithm
 * This is an optimized approximation of Gaussian blur
 */
function applyBlur(x, y, width, height, radius) {
  // Clamp values to canvas bounds
  x = Math.max(0, Math.min(x, canvas.width));
  y = Math.max(0, Math.min(y, canvas.height));
  width = Math.min(width, canvas.width - x);
  height = Math.min(height, canvas.height - y);

  if (width <= 0 || height <= 0) return;

  // Get image data for the region
  const imageData = ctx.getImageData(x, y, width, height);
  const pixels = imageData.data;

  // Apply box blur multiple times for smoother result (approximates Gaussian)
  const iterations = 3;
  for (let i = 0; i < iterations; i++) {
    boxBlurH(pixels, width, height, Math.floor(radius / iterations));
    boxBlurV(pixels, width, height, Math.floor(radius / iterations));
  }

  // Put the blurred data back
  ctx.putImageData(imageData, x, y);
}

/**
 * Horizontal box blur pass
 */
function boxBlurH(pixels, width, height, radius) {
  const w4 = width * 4;

  for (let y = 0; y < height; y++) {
    let rowStart = y * w4;

    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;

      for (let i = -radius; i <= radius; i++) {
        const px = x + i;
        if (px >= 0 && px < width) {
          const idx = rowStart + px * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
          count++;
        }
      }

      const idx = rowStart + x * 4;
      pixels[idx] = r / count;
      pixels[idx + 1] = g / count;
      pixels[idx + 2] = b / count;
      pixels[idx + 3] = a / count;
    }
  }
}

/**
 * Vertical box blur pass
 */
function boxBlurV(pixels, width, height, radius) {
  const w4 = width * 4;
  const tempPixels = new Float32Array(pixels.length);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;

      for (let i = -radius; i <= radius; i++) {
        const py = y + i;
        if (py >= 0 && py < height) {
          const idx = py * w4 + x * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
          count++;
        }
      }

      const idx = y * w4 + x * 4;
      tempPixels[idx] = r / count;
      tempPixels[idx + 1] = g / count;
      tempPixels[idx + 2] = b / count;
      tempPixels[idx + 3] = a / count;
    }
  }

  // Copy back
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = tempPixels[i];
  }
}

/**
 * Apply pixelate effect using downsampling/upsampling
 */
function applyPixelate(x, y, width, height, pixelSize) {
  // Clamp values to canvas bounds
  x = Math.max(0, Math.min(x, canvas.width));
  y = Math.max(0, Math.min(y, canvas.height));
  width = Math.min(width, canvas.width - x);
  height = Math.min(height, canvas.height - y);

  if (width <= 0 || height <= 0) return;

  // Get image data for the region
  const imageData = ctx.getImageData(x, y, width, height);
  const pixels = imageData.data;

  // Process in blocks
  for (let blockY = 0; blockY < height; blockY += pixelSize) {
    for (let blockX = 0; blockX < width; blockX += pixelSize) {
      // Sample color from block center
      const sampleX = Math.min(blockX + Math.floor(pixelSize / 2), width - 1);
      const sampleY = Math.min(blockY + Math.floor(pixelSize / 2), height - 1);
      const sampleIdx = (sampleY * width + sampleX) * 4;

      const r = pixels[sampleIdx];
      const g = pixels[sampleIdx + 1];
      const b = pixels[sampleIdx + 2];
      const a = pixels[sampleIdx + 3];

      // Fill the entire block with sampled color
      for (let py = blockY; py < Math.min(blockY + pixelSize, height); py++) {
        for (let px = blockX; px < Math.min(blockX + pixelSize, width); px++) {
          const idx = (py * width + px) * 4;
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = a;
        }
      }
    }
  }

  // Put the pixelated data back
  ctx.putImageData(imageData, x, y);
}

// ===============================
// UNDO & CLEAR
// ===============================

function undoEffect() {
  if (effects.length === 0) {
    updateStatus('Nothing to undo');
    return;
  }

  // Remove last effect
  effects.pop();

  // Redraw from original and reapply remaining effects
  redrawWithEffects();

  updateEffectCount();
  updateStatus('Last effect undone');
}

function clearAllEffects() {
  if (effects.length === 0) {
    updateStatus('No effects to clear');
    return;
  }

  if (confirm('Are you sure you want to remove all effects?')) {
    effects = [];

    // Restore original image
    ctx.putImageData(originalImageData, 0, 0);
    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    updateEffectCount();
    updateStatus('All effects cleared');
  }
}

function redrawWithEffects() {
  // Restore original
  ctx.putImageData(originalImageData, 0, 0);

  // Reapply all effects
  for (const effect of effects) {
    if (effect.type === 'blur') {
      applyBlur(effect.x, effect.y, effect.width, effect.height, effect.intensity);
    } else if (effect.type === 'pixelate') {
      applyPixelate(effect.x, effect.y, effect.width, effect.height, effect.intensity);
    }
  }

  // Update current image data
  currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ===============================
// SAVE & CLOSE
// ===============================

function saveAndClose() {
  // Get edited image as data URL
  const editedDataUrl = canvas.toDataURL('image/png');

  // Send message to parent/popup
  try {
    chrome.runtime.sendMessage({
      type: 'EDITOR_COMPLETE',
      dataUrl: editedDataUrl
    });
  } catch (e) {
    console.log('Could not send message to extension, storing in localStorage');
  }

  // Store in localStorage as backup
  localStorage.setItem('editedScreenshot', editedDataUrl);

  updateStatus('Saving edits...');

  // Close the window after a short delay
  setTimeout(() => {
    window.close();
  }, 500);
}

/**
 * Download the edited screenshot directly to the computer
 */
function downloadScreenshot() {
  // Get edited image as data URL
  const editedDataUrl = canvas.toDataURL('image/png');

  // Create a timestamp for the filename
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `screenshot-edited-${timestamp}.png`;

  // Create a temporary download link
  const downloadLink = document.createElement('a');
  downloadLink.href = editedDataUrl;
  downloadLink.download = filename;

  // Append to body, click, and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  updateStatus(`Downloaded: ${filename}`);
}

// ===============================
// KEYBOARD SHORTCUTS
// ===============================

function handleKeyDown(e) {
  // Prevent default for our shortcuts
  const key = e.key.toLowerCase();

  // Tool shortcuts
  if (key === 'b' && !e.ctrlKey && !e.metaKey) {
    selectTool('blur');
    e.preventDefault();
  } else if (key === 'p' && !e.ctrlKey && !e.metaKey) {
    selectTool('pixelate');
    e.preventDefault();
  } else if (key === 'v' && !e.ctrlKey && !e.metaKey) {
    selectTool('select');
    e.preventDefault();
  }

  // Undo: Ctrl+Z / Cmd+Z
  if (key === 'z' && (e.ctrlKey || e.metaKey)) {
    undoEffect();
    e.preventDefault();
  }

  // Save: Ctrl+S / Cmd+S
  if (key === 's' && (e.ctrlKey || e.metaKey)) {
    saveAndClose();
    e.preventDefault();
  }

  // Download: Ctrl+D / Cmd+D
  if (key === 'd' && (e.ctrlKey || e.metaKey)) {
    downloadScreenshot();
    e.preventDefault();
  }

  // Escape: Close without saving
  if (key === 'escape') {
    if (confirm('Close editor without saving changes?')) {
      window.close();
    }
  }
}

// ===============================
// UI HELPERS
// ===============================

function updateEffectCount() {
  document.getElementById('effectCount').textContent = `Effects: ${effects.length}`;
}

function updateStatus(message, isError = false) {
  const statusElement = document.getElementById('statusMessage');
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#ff7777' : '#78ffc6';
}
