// Editor State
let currentTool = 'select';
let isDrawing = false;
let startX = 0;
let startY = 0;
let effects = [];
let originalImageData = null;
let canvas = null;
let ctx = null;
let overlayCanvas = null;
let overlayCtx = null;
let currentIntensity = 15;

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);

function initializeEditor() {
    // Get canvas elements
    canvas = document.getElementById('editorCanvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    overlayCanvas = document.getElementById('overlayCanvas');
    overlayCtx = overlayCanvas.getContext('2d');

    // Load screenshot from localStorage
    loadScreenshot();

    // Setup event listeners
    setupEventListeners();

    // Update UI
    updateStatus('Ready - Select a tool to begin');
}

function loadScreenshot() {
    const screenshotData = localStorage.getItem('screenshotToEdit');

    if (!screenshotData) {
        updateStatus('Error: No screenshot data found');
        alert('No screenshot data found. Please capture a screenshot first.');
        window.close();
        return;
    }

    const img = new Image();
    img.onload = function () {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        overlayCanvas.width = img.width;
        overlayCanvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Store original image data
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Update canvas size display
        document.getElementById('canvasSize').textContent = `${img.width} × ${img.height} px`;

        updateStatus('Screenshot loaded - Ready to edit');
    };

    img.onerror = function () {
        updateStatus('Error: Failed to load screenshot');
        alert('Failed to load screenshot data.');
    };

    img.src = screenshotData;
}

function setupEventListeners() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });

    // Action buttons
    document.getElementById('undoBtn').addEventListener('click', undoLastEffect);
    document.getElementById('clearBtn').addEventListener('click', clearAllEffects);
    document.getElementById('saveBtn').addEventListener('click', saveAndClose);
    document.getElementById('closeBtn').addEventListener('click', closeEditor);

    // Intensity slider
    const intensitySlider = document.getElementById('intensitySlider');
    intensitySlider.addEventListener('input', (e) => {
        currentIntensity = parseInt(e.target.value);
        document.getElementById('intensityValue').textContent = currentIntensity;
    });

    // Canvas mouse events
    overlayCanvas.addEventListener('mousedown', handleMouseDown);
    overlayCanvas.addEventListener('mousemove', handleMouseMove);
    overlayCanvas.addEventListener('mouseup', handleMouseUp);
    overlayCanvas.addEventListener('mouseleave', handleMouseUp);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

function selectTool(tool) {
    currentTool = tool;

    // Update active button
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

    // Update cursor
    overlayCanvas.className = `${tool}-cursor`;

    // Update intensity label
    const intensityLabel = document.getElementById('intensityLabel');
    const intensitySlider = document.getElementById('intensitySlider');

    if (tool === 'blur') {
        intensityLabel.textContent = 'Blur Intensity:';
        intensitySlider.min = 5;
        intensitySlider.max = 50;
        intensitySlider.value = currentIntensity;
        updateStatus('Blur tool selected - Draw a rectangle over sensitive areas');
    } else if (tool === 'pixelate') {
        intensityLabel.textContent = 'Pixel Size:';
        intensitySlider.min = 5;
        intensitySlider.max = 30;
        intensitySlider.value = Math.min(currentIntensity, 30);
        currentIntensity = Math.min(currentIntensity, 30);
        document.getElementById('intensityValue').textContent = currentIntensity;
        updateStatus('Pixelate tool selected - Draw a rectangle over sensitive areas');
    } else {
        updateStatus('Select tool active - Click Blur or Pixelate to add effects');
    }
}

function handleMouseDown(e) {
    if (currentTool === 'select') return;

    const rect = overlayCanvas.getBoundingClientRect();
    startX = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
    startY = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);
    isDrawing = true;

    updateStatus('Drawing selection...');
}

function handleMouseMove(e) {
    if (!isDrawing) return;

    const rect = overlayCanvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
    const currentY = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);

    // Clear overlay and draw selection rectangle
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const width = currentX - startX;
    const height = currentY - startY;

    // Draw selection rectangle
    overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    overlayCtx.lineWidth = 2;
    overlayCtx.setLineDash([5, 5]);
    overlayCtx.strokeRect(startX, startY, width, height);
    overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    overlayCtx.fillRect(startX, startY, width, height);
    overlayCtx.setLineDash([]);
}

function handleMouseUp(e) {
    if (!isDrawing) return;

    const rect = overlayCanvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
    const endY = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);

    isDrawing = false;

    // Clear overlay
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Calculate rectangle dimensions
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // Only apply effect if rectangle is large enough
    if (width > 10 && height > 10) {
        applyEffect(x, y, width, height);
    } else {
        updateStatus('Selection too small - Try again');
    }
}

function applyEffect(x, y, width, height) {
    // Store effect
    const effect = {
        type: currentTool,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        intensity: currentIntensity
    };

    effects.push(effect);

    // Apply the effect to canvas
    if (currentTool === 'blur') {
        applyBlur(effect);
    } else if (currentTool === 'pixelate') {
        applyPixelate(effect);
    }

    // Update UI
    updateEffectCount();
    updateStatus(`${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} effect applied`);
}

function applyBlur(effect) {
    // Get the region to blur
    const imageData = ctx.getImageData(effect.x, effect.y, effect.width, effect.height);
    const blurredData = stackBlur(imageData, effect.intensity);

    // Put blurred data back
    ctx.putImageData(blurredData, effect.x, effect.y);
}

function applyPixelate(effect) {
    const pixelSize = effect.intensity;

    // Get the region
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = effect.width;
    tempCanvas.height = effect.height;

    // Draw the region to temp canvas
    tempCtx.drawImage(canvas, effect.x, effect.y, effect.width, effect.height, 0, 0, effect.width, effect.height);

    // Pixelate by downsampling and upsampling
    const scaledWidth = Math.max(1, Math.floor(effect.width / pixelSize));
    const scaledHeight = Math.max(1, Math.floor(effect.height / pixelSize));

    // Disable smoothing for pixelation effect
    ctx.imageSmoothingEnabled = false;

    // Draw small version
    const smallCanvas = document.createElement('canvas');
    const smallCtx = smallCanvas.getContext('2d');
    smallCanvas.width = scaledWidth;
    smallCanvas.height = scaledHeight;
    smallCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);

    // Draw back at original size (pixelated)
    ctx.drawImage(smallCanvas, 0, 0, scaledWidth, scaledHeight, effect.x, effect.y, effect.width, effect.height);

    // Re-enable smoothing
    ctx.imageSmoothingEnabled = true;
}

// Stack Blur Algorithm (simplified version for performance)
function stackBlur(imageData, radius) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Simple box blur for performance
    const iterations = Math.min(3, Math.floor(radius / 5) + 1);

    for (let i = 0; i < iterations; i++) {
        boxBlurHorizontal(pixels, width, height, Math.floor(radius / iterations));
        boxBlurVertical(pixels, width, height, Math.floor(radius / iterations));
    }

    return imageData;
}

function boxBlurHorizontal(pixels, width, height, radius) {
    const tempPixels = new Uint8ClampedArray(pixels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let kx = -radius; kx <= radius; kx++) {
                const px = Math.min(width - 1, Math.max(0, x + kx));
                const offset = (y * width + px) * 4;

                r += tempPixels[offset];
                g += tempPixels[offset + 1];
                b += tempPixels[offset + 2];
                a += tempPixels[offset + 3];
                count++;
            }

            const offset = (y * width + x) * 4;
            pixels[offset] = r / count;
            pixels[offset + 1] = g / count;
            pixels[offset + 2] = b / count;
            pixels[offset + 3] = a / count;
        }
    }
}

function boxBlurVertical(pixels, width, height, radius) {
    const tempPixels = new Uint8ClampedArray(pixels);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                const py = Math.min(height - 1, Math.max(0, y + ky));
                const offset = (py * width + x) * 4;

                r += tempPixels[offset];
                g += tempPixels[offset + 1];
                b += tempPixels[offset + 2];
                a += tempPixels[offset + 3];
                count++;
            }

            const offset = (y * width + x) * 4;
            pixels[offset] = r / count;
            pixels[offset + 1] = g / count;
            pixels[offset + 2] = b / count;
            pixels[offset + 3] = a / count;
        }
    }
}

function undoLastEffect() {
    if (effects.length === 0) {
        updateStatus('No effects to undo');
        return;
    }

    // Remove last effect
    effects.pop();

    // Redraw from original
    redrawCanvas();

    updateStatus('Last effect removed');
}

function clearAllEffects() {
    if (effects.length === 0) {
        updateStatus('No effects to clear');
        return;
    }

    if (confirm('Are you sure you want to remove all effects?')) {
        effects = [];
        redrawCanvas();
        updateStatus('All effects cleared');
    }
}

function redrawCanvas() {
    // Restore original image
    ctx.putImageData(originalImageData, 0, 0);

    // Reapply all effects
    effects.forEach(effect => {
        if (effect.type === 'blur') {
            applyBlur(effect);
        } else if (effect.type === 'pixelate') {
            applyPixelate(effect);
        }
    });

    updateEffectCount();
}

function saveAndClose() {
    if (effects.length === 0) {
        if (!confirm('No effects have been applied. Save anyway?')) {
            return;
        }
    }

    // Get edited screenshot as data URL
    const editedScreenshot = canvas.toDataURL('image/png');

    // Store in localStorage for popup to retrieve
    localStorage.setItem('editedScreenshot', editedScreenshot);

    // Send message to popup
    chrome.runtime.sendMessage({
        type: 'EDITOR_COMPLETE',
        dataUrl: editedScreenshot
    });

    updateStatus('Saved! Closing editor...');

    // Close window after short delay
    setTimeout(() => {
        window.close();
    }, 500);
}

function closeEditor() {
    if (effects.length > 0) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
    }

    window.close();
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function updateEffectCount() {
    document.getElementById('effectCount').textContent = `Effects: ${effects.length}`;
}

function handleKeyboard(e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
            e.preventDefault();
            undoLastEffect();
        } else if (e.key === 's') {
            e.preventDefault();
            saveAndClose();
        }
    }

    // Tool shortcuts
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') {
            selectTool('select');
        } else if (e.key === 'b' || e.key === 'B') {
            selectTool('blur');
        } else if (e.key === 'p' || e.key === 'P') {
            selectTool('pixelate');
        }
    }
}
