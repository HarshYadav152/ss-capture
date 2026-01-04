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
    this.element.innerHTML = `${icon}<span>${message}</span>`;
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
    captureScreenshot(isPopup);
    if (sendResponse) sendResponse({ status: 'started' });
  }

  if (message.type === 'CANCEL_CAPTURE') {
    isCancelled = true;
  }

  return true;
});

// Main capture function
async function captureScreenshot(isPopup = true) {
  console.log('Starting screenshot capture...');
  isCancelled = false; // Reset cancel flag
  
  if (!isPopup) {
    toast.show('Starting Full Page Capture...', 'loading');
    
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
    const totalWidth = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth);
    const totalHeight = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight);

    // Check if dimensions are valid
    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error('Could not determine page dimensions');
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Handle fixed elements
    fixedElements = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        fixedElements.push({ el, originalDisplay: style.display });
        el.style.display = 'none';
      }
    });

    // Determine if we need chunking
    const needsChunking = totalHeight > MAX_CANVAS_HEIGHT;
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
        Math.round((chunkIndex / numChunks) * 85) + 5
      );
      if (!isPopup) toast.show(`Capturing... ${Math.round((chunkIndex / numChunks) * 85)}%`, 'loading');

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
        await sleep(300);

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

    if (!isPopup) {
      toast.show('Capture Complete! Click to preview.', 'success', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        toast.hide();
      });
      toast.hide(8000);
    }

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
