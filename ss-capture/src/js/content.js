// State variables
let isCancelled = false;

// Constants
const MAX_CANVAS_HEIGHT = 32000; // Browser limit
const CHUNK_HEIGHT = 28000; // Safe chunk size with margin for overlap
const OVERLAP = 100; // Overlap between chunks to ensure seamless stitching

// Helper functions
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function sendProgressUpdate(message, percentComplete = null) {
  chrome.runtime.sendMessage({
    type: 'PROGRESS',
    message,
    percentComplete
  });
}

function sendError(errorMessage) {
  chrome.runtime.sendMessage({
    type: 'CAPTURE_ERROR',
    error: errorMessage
  });
}

/**
 * Smoothly scrolls to the bottom of the page to trigger lazy loading
 * @param {number} totalHeight The total height of the page
 * @param {boolean} isPopup Whether the capture was triggered from the popup
 */
async function triggerLazyLoading(totalHeight, isPopup) {
  const originalX = window.scrollX;
  const originalY = window.scrollY;
  const viewportHeight = window.innerHeight;
  
  // Get user preference for scroll mode
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['premiumScroll'], resolve);
  });
  
  const isPremium = settings.premiumScroll !== false;
  
  // Adaptive scroll parameters
  const scrollStep = isPremium 
    ? Math.round(viewportHeight * 0.8) // Premium: Smaller steps
    : viewportHeight * 1.5;            // Fast: Large jumps
    
  const scrollDelay = isPremium ? 30 : 60; // 30ms for 33fps feel, 60ms for speed
  
  console.log(`Starting ${isPremium ? 'Premium' : 'Fast'} lazy-load pre-scroll...`);
  
  let currentY = 0;
  while (currentY < totalHeight) {
    if (isCancelled) return;
    currentY += scrollStep;
    window.scrollTo(0, Math.min(currentY, totalHeight));
    await sleep(scrollDelay);
    
    const progress = Math.min(Math.round((currentY / totalHeight) * 100), 100);
    sendProgressUpdate(`Triggering lazy loading... ${progress}%`, Math.round(progress / 10));
    if (!isPopup) toast.show(`Triggering lazy loading... ${progress}%`, 'loading');
  }

  // Brief pause at the bottom to let last images trigger
  await sleep(250);
  
  // Return to top
  window.scrollTo(originalX, originalY);
  await sleep(400); // Give it a bit more time to settle back at top before capture
}

// Toast Notification System (Shadow DOM)
class Toast {
  constructor() {
    this.host = document.createElement('div');
    this.host.style.cssText = 'position: fixed; z-index: 2147483647;';
    const shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        .toast {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: rgba(15, 23, 42, 0.95);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 12px;
          transform: translateY(100px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 14px;
          font-weight: 500;
          pointer-events: auto;
          cursor: default;
        }
        .toast.clickable {
          cursor: pointer;
          border: 1px solid rgba(56, 189, 248, 0.5);
        }
        .toast.clickable:hover {
          background: rgba(30, 41, 59, 0.95);
        }
        .toast.visible { transform: translateY(0); }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `;

    this.element = document.createElement('div');
    this.element.className = 'toast';

    shadow.appendChild(style);
    shadow.appendChild(this.element);

    this.onClick = null;
    this.element.addEventListener('click', () => {
      if (this.onClick) this.onClick();
    });
  }

  show(message, type = 'info', onClick = null) {
    if (!this.host.isConnected) {
      (document.documentElement || document.body).appendChild(this.host);
    }

    this.onClick = onClick;
    if (onClick) {
      this.element.classList.add('clickable');
    } else {
      this.element.classList.remove('clickable');
    }

    let icon = '';
    let bgColor = 'rgba(15, 23, 42, 0.95)';
    if (type === 'loading') {
      icon = '<div class="spinner"></div>';
    }
    if (type === 'success') {
      icon = '✅';
      bgColor = 'rgba(5, 150, 105, 0.95)';
    }
    if (type === 'error') {
      icon = '❌';
      bgColor = 'rgba(220, 38, 38, 0.95)';
    }

    this.element.style.background = bgColor;
    this.element.textContent = ''; // Clear previous content
    
    if (type === 'loading') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      this.element.appendChild(spinner);
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      this.element.appendChild(iconSpan);
    }
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    this.element.appendChild(textSpan);
    
    requestAnimationFrame(() => this.element.classList.add('visible'));
  }

  hide(delay = 0) {
    setTimeout(() => {
      this.element.classList.remove('visible');
      setTimeout(() => {
        if (this.host.isConnected) this.host.remove();
      }, 300);
    }, delay);
  }
}

class ElementPicker {
  constructor() {
    this.overlay = null;
    this.onSelect = null;
    this.onCancel = null;
    this.hoveredElement = null;
    this.highlight = null;
    
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  start(onSelect, onCancel) {
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483646; cursor: crosshair; pointer-events: auto;';
    
    this.highlight = document.createElement('div');
    this.highlight.style.cssText = 'position: fixed; border: 2px solid #fb923c; background: rgba(251, 146, 60, 0.1); pointer-events: none; z-index: 2147483647; transition: all 0.1s ease-out; border-radius: 4px; box-shadow: 0 0 15px rgba(251, 146, 60, 0.3);';
    
    const infoLabel = document.createElement('div');
    infoLabel.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: white; padding: 10px 20px; border-radius: 20px; font-family: system-ui; font-size: 13px; z-index: 2147483647; pointer-events: none; border: 1px solid rgba(251, 146, 60, 0.5); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);';
    
    const targetIcon = document.createElement('span');
    targetIcon.textContent = '🎯';
    const boldText = document.createElement('b');
    boldText.textContent = 'Capture Mode Active:';
    const hintText = document.createTextNode(' Select an element.');
    const escSpan = document.createElement('span');
    escSpan.style.cssText = 'opacity: 0.6; margin-left: 10px;';
    escSpan.textContent = 'ESC to cancel';
    
    infoLabel.appendChild(targetIcon);
    infoLabel.appendChild(boldText);
    infoLabel.appendChild(hintText);
    infoLabel.appendChild(escSpan);
    
    this.overlay.appendChild(infoLabel);
    document.documentElement.appendChild(this.overlay);
    document.documentElement.appendChild(this.highlight);

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('mousedown', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  stop() {
    if (this.overlay) this.overlay.remove();
    if (this.highlight) this.highlight.remove();
    
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('mousedown', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    
    this.overlay = null;
    this.highlight = null;
  }

  handleMouseMove(e) {
    this.overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    this.overlay.style.pointerEvents = 'auto';

    if (el && el !== this.hoveredElement && el !== this.overlay && !this.overlay.contains(el)) {
      this.hoveredElement = el;
      const rect = el.getBoundingClientRect();
      
      this.highlight.style.top = `${rect.top}px`;
      this.highlight.style.left = `${rect.left}px`;
      this.highlight.style.width = `${rect.width}px`;
      this.highlight.style.height = `${rect.height}px`;
      this.highlight.style.display = 'block';
    }
  }

  handleClick(e) {
    if (this.hoveredElement) {
      e.preventDefault();
      e.stopPropagation();
      const el = this.hoveredElement;
      const rect = el.getBoundingClientRect();
      this.stop();
      this.onSelect(el, rect);
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.stop();
      this.onCancel();
    }
  }
}

function startElementPicker(isPopup) {
  const picker = new ElementPicker();
  picker.start(
    async (el, rect) => {
      // Small delay to let the highlight disappear
      await sleep(100);
      captureElement(rect, isPopup);
    },
    () => {
      toast.show('Selection cancelled', 'info');
      toast.hide(3000);
      chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'Selection cancelled' });
    }
  );
}

async function captureElement(rect, isPopup) {
  try {
    toast.show('Capturing element...', 'loading');
    
    // Check if element is in viewport, if not scroll to it
    // For now we assume the user just selected what they see
    
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE' }, response => {
        if (response && response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
      0, 0, rect.width * dpr, rect.height * dpr
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    
    toast.show('Selected Element Captured! Click to preview.', 'success', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      toast.hide();
    });
    toast.hide(8000);

    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      dataUrl: croppedDataUrl,
      fromPopup: isPopup
    });

  } catch (error) {
    console.error('Element capture error:', error);
    toast.show('Capture failed', 'error');
    toast.hide(4000);
    sendError(error.message);
  }
}

const toast = new Toast();

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content Script Received Message:', message);

  if (message.type === 'PING') {
    sendResponse('PONG');
    return false;
  }

  if (message.type === 'INIT_CAPTURE' || message.type === 'START_CAPTURE') {
    const isPopup = message.isPopup !== undefined ? message.isPopup : false;
    const mode = message.mode || 'FULL_PAGE';
    captureScreenshot(isPopup, mode);
    if (sendResponse) sendResponse({ status: 'started' });
  }

  if (message.type === 'CANCEL_CAPTURE') {
    isCancelled = true;
  }

  return true;
});

// Main capture function
async function captureScreenshot(isPopup = true, mode = 'FULL_PAGE') {
  console.log(`Starting ${mode} screenshot capture...`);
  isCancelled = false; // Reset cancel flag
  
  if (mode === 'SELECTED_ELEMENT') {
    startElementPicker(isPopup);
    return;
  }

  if (!isPopup) {
    const startMsg = mode === 'VISIBLE_AREA' ? 'Capturing Visible Area...' : 'Starting Full Page Capture...';
    toast.show(startMsg, 'loading');
    
    // Visual feedback: Flash the screen like a camera shutter
    const flash = document.createElement('div');
    flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 2147483647; pointer-events: none; opacity: 0.6; transition: opacity 0.4s ease-out;';
    (document.documentElement || document.body).appendChild(flash);
    
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    });

    await sleep(800); // Give user a moment to see the notification
  }

  let originalX = window.scrollX;
  let originalY = window.scrollY;
  let fixedElements = [];

  function cleanup() {
    // Restore original scroll position
    window.scrollTo(originalX, originalY);

    // Restore fixed elements
    fixedElements.forEach(({ el, originalDisplay }) => {
      try {
        el.style.display = originalDisplay;
      } catch (e) {
        console.error('Failed to restore element:', e);
      }
    });
  }

  try {
    sendProgressUpdate('Preparing page dimensions...', 2);

    // Check browser compatibility
    if (!chrome.runtime) {
      throw new Error('Browser not supported or extension context invalid');
    }

    // Calculate page dimensions
    const body = document.body;
    const html = document.documentElement;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let totalWidth, totalHeight;
    if (mode === 'VISIBLE_AREA') {
      totalWidth = viewportWidth;
      totalHeight = viewportHeight;
    } else {
      totalWidth = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth);
      totalHeight = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight);
    }

    // Check if dimensions are valid
    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error('Could not determine page dimensions');
    }

    // Integrated Pre-Scroll for Lazy-Loaded content
    if (mode === 'FULL_PAGE') {
      await triggerLazyLoading(totalHeight, isPopup);
      if (isCancelled) throw new Error('Screenshot cancelled');
    }

    if (mode === 'VISIBLE_AREA') {
      sendProgressUpdate('Capturing visible area...', 50);
      toast.show('Capturing visible area...', 'loading');
      
      const dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE' }, response => {
          if (response && response.error) reject(new Error(response.error));
          else resolve(response);
        });
      });

      toast.show('Visible Area Captured! Click to preview.', 'success', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        toast.hide();
      });
      toast.hide(8000);

      chrome.runtime.sendMessage({
        type: 'CAPTURE_COMPLETE',
        dataUrl: dataUrl,
        fromPopup: isPopup
      });
      return;
    }

    // Handle fixed elements (only for full page capture)
    fixedElements = [];
    if (mode === 'FULL_PAGE') {
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          fixedElements.push({ el, originalDisplay: style.display });
          el.style.display = 'none';
        }
      });
    }

    // Determine if we need chunking
    const needsChunking = mode === 'FULL_PAGE' && totalHeight > MAX_CANVAS_HEIGHT;
    const numChunks = needsChunking ? Math.ceil(totalHeight / CHUNK_HEIGHT) : 1;

    if (needsChunking) {
      sendProgressUpdate(`Page height: ${totalHeight}px. Dividing into ${numChunks} chunks...`, 5);
      await sleep(500);
    }

    // Capture chunks
    const chunks = [];

    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      if (isCancelled) {
        throw new Error('Screenshot cancelled');
      }

      const chunkStartY = chunkIndex * CHUNK_HEIGHT;
      const chunkEndY = Math.min(chunkStartY + CHUNK_HEIGHT + OVERLAP, totalHeight);
      const actualChunkHeight = chunkEndY - chunkStartY;

      sendProgressUpdate(
        `Capturing section ${chunkIndex + 1}/${numChunks}...`,
        Math.round((chunkIndex / numChunks) * 75) + 15
      );
      if (!isPopup) toast.show(`Capturing section ${chunkIndex + 1}...`, 'loading');

      // Create canvas for this chunk
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = viewportWidth;
      chunkCanvas.height = actualChunkHeight;
      const chunkCtx = chunkCanvas.getContext('2d', { willReadFrequently: false });

      if (!chunkCtx) {
        throw new Error('Could not create canvas context');
      }

      // Capture this chunk viewport by viewport
      let currentY = chunkStartY;
      let capturedParts = 0;

      while (currentY < chunkEndY) {
        if (isCancelled) {
          throw new Error('Screenshot cancelled');
        }

        capturedParts++;

        // Scroll to position
        window.scrollTo(0, currentY);
        // Wait for page layout/animations to settle after scroll (smarter timing)
        await sleep(350);

        // Capture current viewport with retry mechanism
        let dataUrl;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            dataUrl = await new Promise((resolve, reject) => {
              const captureTimeout = setTimeout(() => {
                reject(new Error('Screenshot capture timed out'));
              }, 10000);

              chrome.runtime.sendMessage({ type: 'CAPTURE' }, (response) => {
                clearTimeout(captureTimeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (!response || response.error) {
                  if (response?.error && response.error.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
                    reject(new Error('RATE_LIMIT_EXCEEDED'));
                  } else {
                    reject(new Error(response?.error || 'Failed to capture screenshot'));
                  }
                } else {
                  resolve(response);
                }
              });
            });
            break;
          } catch (error) {
            retryCount++;
            if (error.message === 'RATE_LIMIT_EXCEEDED' && retryCount < maxRetries) {
              await sleep(1000);
              continue;
            } else {
              throw error;
            }
          }
        }

        // Load image onto canvas
        const img = new Image();
        await new Promise((resolve, reject) => {
          const imgTimeout = setTimeout(() => {
            reject(new Error('Image loading timed out'));
          }, 5000);

          img.onload = () => {
            clearTimeout(imgTimeout);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(imgTimeout);
            reject(new Error('Failed to load captured image'));
          };
          img.src = dataUrl;
        });

        // Calculate drawing position relative to chunk
        const drawY = currentY - chunkStartY;
        const drawHeight = Math.min(viewportHeight, chunkEndY - currentY);

        // Draw to chunk canvas
        chunkCtx.drawImage(img, 0, drawY, viewportWidth, drawHeight);

        // Move to next section
        currentY += viewportHeight;

        // Allow garbage collection
        if (capturedParts % 5 === 0) {
          await sleep(100);
        }
      }

      chunks.push(chunkCanvas);
    }

    // Combine chunks into final canvas
    sendProgressUpdate('Combining chunks into final image...', 92);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = viewportWidth;
    finalCanvas.height = totalHeight;
    const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: false });

    if (!finalCtx) {
      throw new Error('Could not create final canvas context');
    }

    for (let i = 0; i < chunks.length; i++) {
      const yPosition = i * CHUNK_HEIGHT;
      finalCtx.drawImage(chunks[i], 0, yPosition);

      sendProgressUpdate(
        'Stitching chunks...',
        92 + Math.round((i / chunks.length) * 5)
      );
    }

    sendProgressUpdate('Processing final screenshot...', 98);

    // Convert canvas to data URL
    let finalScreenshot;
    try {
      finalScreenshot = finalCanvas.toDataURL('image/png');
    } catch (error) {
      throw new Error('Failed to convert screenshot to image. The page may be too large.');
    }

    cleanup();

    toast.show('Full Page Capture Complete! Click to preview.', 'success', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      toast.hide();
    });
    toast.hide(8000);

    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      dataUrl: finalScreenshot,
      fromPopup: isPopup
    });

  } catch (error) {
    console.error('Screenshot error:', error);
    cleanup();
    
    if (!isPopup) toast.show('Capture Failed', 'error');
    if (!isPopup) toast.hide(4000);
    
    sendError(error.message || 'Unknown error during screenshot capture');
  }
}
