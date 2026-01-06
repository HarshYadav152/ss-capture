/**
 * Privacy Editor - Blur/Pixelate Tool for SS-Capture
 * Implements blur and pixelate effects for hiding sensitive information
 */

// Editor State
const state = {
    canvas: null,
    ctx: null,
    originalImage: null,
    originalImageData: null,
    currentTool: 'select', // 'select', 'blur', 'pixelate'
    intensity: 20,
    effects: [], // Array of applied effects
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
};

// DOM Elements
let elements = {};

// Initialize the editor
function initEditor() {
    // Get DOM elements
    elements = {
        canvas: document.getElementById('editorCanvas'),
        selectionOverlay: document.getElementById('selectionOverlay'),
        selectTool: document.getElementById('selectTool'),
        blurTool: document.getElementById('blurTool'),
        pixelateTool: document.getElementById('pixelateTool'),
        intensitySlider: document.getElementById('intensitySlider'),
        intensityValue: document.getElementById('intensityValue'),
        undoBtn: document.getElementById('undoBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        saveBtn: document.getElementById('saveBtn'),
        effectCount: document.getElementById('effectCount'),
        statusMessage: document.getElementById('statusMessage'),
        canvasDimensions: document.getElementById('canvasDimensions')
    };

    state.canvas = elements.canvas;
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

    // Setup event listeners
    setupEventListeners();

    // Load the screenshot from localStorage
    loadScreenshot();
}

// Setup all event listeners
function setupEventListeners() {
    // Tool selection
    elements.selectTool.addEventListener('click', () => selectTool('select'));
    elements.blurTool.addEventListener('click', () => selectTool('blur'));
    elements.pixelateTool.addEventListener('click', () => selectTool('pixelate'));

    // Intensity slider
    elements.intensitySlider.addEventListener('input', (e) => {
        state.intensity = parseInt(e.target.value);
        elements.intensityValue.textContent = state.intensity;
    });

    // Action buttons
    elements.undoBtn.addEventListener('click', undoLastEffect);
    elements.clearAllBtn.addEventListener('click', clearAllEffects);
    elements.saveBtn.addEventListener('click', saveAndClose);

    // Canvas mouse events
    state.canvas.addEventListener('mousedown', handleMouseDown);
    state.canvas.addEventListener('mousemove', handleMouseMove);
    state.canvas.addEventListener('mouseup', handleMouseUp);
    state.canvas.addEventListener('mouseleave', handleMouseUp);

    // Touch support
    state.canvas.addEventListener('touchstart', handleTouchStart);
    state.canvas.addEventListener('touchmove', handleTouchMove);
    state.canvas.addEventListener('touchend', handleTouchEnd);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Load screenshot from localStorage
function loadScreenshot() {
    const screenshotData = localStorage.getItem('editScreenshot');

    if (!screenshotData) {
        updateStatus('No screenshot data found. Please capture a screenshot first.');
        return;
    }

    const img = new Image();
    img.onload = () => {
        // Set canvas size
        state.canvas.width = img.width;
        state.canvas.height = img.height;

        // Draw image
        state.ctx.drawImage(img, 0, 0);

        // Store original image data
        state.originalImage = img;
        state.originalImageData = state.ctx.getImageData(0, 0, img.width, img.height);

        // Update dimensions display
        elements.canvasDimensions.textContent = `${img.width} × ${img.height} px`;

        updateStatus('Screenshot loaded. Select a tool to start editing.');
    };

    img.onerror = () => {
        updateStatus('Failed to load screenshot. Please try again.');
    };

    img.src = screenshotData;
}

// Select a tool
function selectTool(tool) {
    state.currentTool = tool;

    // Update button states
    elements.selectTool.classList.toggle('active', tool === 'select');
    elements.blurTool.classList.toggle('active', tool === 'blur');
    elements.pixelateTool.classList.toggle('active', tool === 'pixelate');

    // Update canvas cursor
    state.canvas.classList.remove('blur-cursor', 'pixelate-cursor');
    if (tool === 'blur') {
        state.canvas.classList.add('blur-cursor');
        updateStatus('Blur tool selected. Click and drag to blur an area.');
    } else if (tool === 'pixelate') {
        state.canvas.classList.add('pixelate-cursor');
        updateStatus('Pixelate tool selected. Click and drag to pixelate an area.');
    } else {
        updateStatus('Select tool active.');
    }
}

// Get canvas coordinates from mouse event
function getCanvasCoords(e) {
    const rect = state.canvas.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;

    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Handle mouse down
function handleMouseDown(e) {
    if (state.currentTool === 'select') return;

    const coords = getCanvasCoords(e);
    state.isDrawing = true;
    state.startX = coords.x;
    state.startY = coords.y;
    state.currentX = coords.x;
    state.currentY = coords.y;

    // Show selection overlay
    updateSelectionOverlay(e);
    elements.selectionOverlay.style.display = 'block';
}

// Handle mouse move
function handleMouseMove(e) {
    if (!state.isDrawing) return;

    const coords = getCanvasCoords(e);
    state.currentX = coords.x;
    state.currentY = coords.y;

    updateSelectionOverlay(e);
}

// Handle mouse up
function handleMouseUp(e) {
    if (!state.isDrawing) return;

    state.isDrawing = false;
    elements.selectionOverlay.style.display = 'none';

    // Calculate selection rectangle
    const x = Math.min(state.startX, state.currentX);
    const y = Math.min(state.startY, state.currentY);
    const width = Math.abs(state.currentX - state.startX);
    const height = Math.abs(state.currentY - state.startY);

    // Validate selection size
    if (width < 10 || height < 10) {
        updateStatus('Selection too small. Please draw a larger area.');
        return;
    }

    // Apply effect
    const effect = {
        type: state.currentTool,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        intensity: state.intensity
    };

    applyEffect(effect);
    state.effects.push(effect);
    updateEffectCount();

    const toolName = state.currentTool === 'blur' ? 'Blur' : 'Pixelate';
    updateStatus(`${toolName} effect applied! ${state.effects.length} effect(s) total.`);
}

// Update selection overlay position
function updateSelectionOverlay(e) {
    const rect = state.canvas.getBoundingClientRect();
    const startX = state.startX * (rect.width / state.canvas.width) + rect.left;
    const startY = state.startY * (rect.height / state.canvas.height) + rect.top;
    const currentX = state.currentX * (rect.width / state.canvas.width) + rect.left;
    const currentY = state.currentY * (rect.height / state.canvas.height) + rect.top;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    elements.selectionOverlay.style.left = `${left}px`;
    elements.selectionOverlay.style.top = `${top}px`;
    elements.selectionOverlay.style.width = `${width}px`;
    elements.selectionOverlay.style.height = `${height}px`;
}

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp(e);
}

// Apply an effect to the canvas
function applyEffect(effect) {
    if (effect.type === 'blur') {
        applyBlur(effect.x, effect.y, effect.width, effect.height, effect.intensity);
    } else if (effect.type === 'pixelate') {
        applyPixelate(effect.x, effect.y, effect.width, effect.height, effect.intensity);
    }
}

/**
 * Stack Blur Algorithm
 * A fast blur approximation using box blur iterations
 */
function applyBlur(x, y, width, height, radius) {
    // Ensure coordinates are within bounds
    x = Math.max(0, Math.min(x, state.canvas.width - 1));
    y = Math.max(0, Math.min(y, state.canvas.height - 1));
    width = Math.min(width, state.canvas.width - x);
    height = Math.min(height, state.canvas.height - y);

    if (width <= 0 || height <= 0) return;

    // Get image data for the region
    const imageData = state.ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    // Apply box blur multiple times for smoother result
    const iterations = 3;
    for (let i = 0; i < iterations; i++) {
        boxBlurH(data, width, height, Math.floor(radius / iterations));
        boxBlurV(data, width, height, Math.floor(radius / iterations));
    }

    // Put the blurred data back
    state.ctx.putImageData(imageData, x, y);
}

// Horizontal box blur
function boxBlurH(data, width, height, radius) {
    const newData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dx = -radius; dx <= radius; dx++) {
                const nx = Math.min(Math.max(x + dx, 0), width - 1);
                const idx = (y * width + nx) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                a += data[idx + 3];
                count++;
            }

            const idx = (y * width + x) * 4;
            newData[idx] = r / count;
            newData[idx + 1] = g / count;
            newData[idx + 2] = b / count;
            newData[idx + 3] = a / count;
        }
    }

    for (let i = 0; i < data.length; i++) {
        data[i] = newData[i];
    }
}

// Vertical box blur
function boxBlurV(data, width, height, radius) {
    const newData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                const ny = Math.min(Math.max(y + dy, 0), height - 1);
                const idx = (ny * width + x) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                a += data[idx + 3];
                count++;
            }

            const idx = (y * width + x) * 4;
            newData[idx] = r / count;
            newData[idx + 1] = g / count;
            newData[idx + 2] = b / count;
            newData[idx + 3] = a / count;
        }
    }

    for (let i = 0; i < data.length; i++) {
        data[i] = newData[i];
    }
}

/**
 * Pixelate Effect
 * Divides the area into blocks and fills each with the average color
 */
function applyPixelate(x, y, width, height, pixelSize) {
    // Ensure coordinates are within bounds
    x = Math.max(0, Math.min(x, state.canvas.width - 1));
    y = Math.max(0, Math.min(y, state.canvas.height - 1));
    width = Math.min(width, state.canvas.width - x);
    height = Math.min(height, state.canvas.height - y);

    if (width <= 0 || height <= 0) return;

    // Get image data for the region
    const imageData = state.ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    // Process each block
    for (let blockY = 0; blockY < height; blockY += pixelSize) {
        for (let blockX = 0; blockX < width; blockX += pixelSize) {
            // Calculate block boundaries
            const blockWidth = Math.min(pixelSize, width - blockX);
            const blockHeight = Math.min(pixelSize, height - blockY);

            // Calculate average color for the block
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let dy = 0; dy < blockHeight; dy++) {
                for (let dx = 0; dx < blockWidth; dx++) {
                    const px = blockX + dx;
                    const py = blockY + dy;
                    const idx = (py * width + px) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    a += data[idx + 3];
                    count++;
                }
            }

            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            a = Math.round(a / count);

            // Fill the block with the average color
            for (let dy = 0; dy < blockHeight; dy++) {
                for (let dx = 0; dx < blockWidth; dx++) {
                    const px = blockX + dx;
                    const py = blockY + dy;
                    const idx = (py * width + px) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                }
            }
        }
    }

    // Put the pixelated data back
    state.ctx.putImageData(imageData, x, y);
}

// Undo the last effect
function undoLastEffect() {
    if (state.effects.length === 0) {
        updateStatus('No effects to undo.');
        return;
    }

    // Remove the last effect
    state.effects.pop();

    // Redraw from original
    redrawWithEffects();

    updateEffectCount();
    updateStatus(`Effect undone. ${state.effects.length} effect(s) remaining.`);
}

// Clear all effects
function clearAllEffects() {
    if (state.effects.length === 0) {
        updateStatus('No effects to clear.');
        return;
    }

    if (!confirm('Are you sure you want to clear all effects?')) {
        return;
    }

    state.effects = [];

    // Restore original image
    if (state.originalImageData) {
        state.ctx.putImageData(state.originalImageData, 0, 0);
    }

    updateEffectCount();
    updateStatus('All effects cleared.');
}

// Redraw canvas with all effects
function redrawWithEffects() {
    // Restore original image
    if (state.originalImageData) {
        state.ctx.putImageData(state.originalImageData, 0, 0);
    }

    // Reapply all effects
    for (const effect of state.effects) {
        applyEffect(effect);
    }
}

// Save and close the editor
function saveAndClose() {
    if (!state.canvas) {
        updateStatus('No canvas to save.');
        return;
    }

    // Get the edited image data
    const editedDataUrl = state.canvas.toDataURL('image/png');

    // Store in localStorage for popup to retrieve
    localStorage.setItem('editedScreenshot', editedDataUrl);

    // Send message to extension
    try {
        chrome.runtime.sendMessage({
            type: 'EDITOR_COMPLETE',
            dataUrl: editedDataUrl
        });
    } catch (e) {
        console.log('Could not send message to extension:', e);
    }

    updateStatus('Screenshot saved! You can close this window.');

    // Close the window after a short delay
    setTimeout(() => {
        window.close();
    }, 500);
}

// Update effect count display
function updateEffectCount() {
    const count = state.effects.length;
    elements.effectCount.textContent = `${count} effect${count !== 1 ? 's' : ''} applied`;
    elements.effectCount.classList.toggle('has-effects', count > 0);
}

// Update status message
function updateStatus(message) {
    elements.statusMessage.textContent = message;
}

// Handle keyboard shortcuts
function handleKeyboard(e) {
    // Prevent default for our shortcuts
    const key = e.key.toLowerCase();

    // Tool shortcuts
    if (key === 'v' && !e.ctrlKey && !e.metaKey) {
        selectTool('select');
        e.preventDefault();
    } else if (key === 'b' && !e.ctrlKey && !e.metaKey) {
        selectTool('blur');
        e.preventDefault();
    } else if (key === 'p' && !e.ctrlKey && !e.metaKey) {
        selectTool('pixelate');
        e.preventDefault();
    }

    // Undo (Ctrl+Z / Cmd+Z)
    if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        undoLastEffect();
        e.preventDefault();
    }

    // Save (Ctrl+S / Cmd+S)
    if (key === 's' && (e.ctrlKey || e.metaKey)) {
        saveAndClose();
        e.preventDefault();
    }

    // Escape to cancel selection
    if (key === 'escape' && state.isDrawing) {
        state.isDrawing = false;
        elements.selectionOverlay.style.display = 'none';
        e.preventDefault();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initEditor);
