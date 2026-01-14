// State variables
// Using var and unique names to avoid SyntaxError on re-injection in restricted environments
var ssCapture_isCancelled = false;

// Constants
var MAX_CANVAS_HEIGHT = 16383; // Safer limit for many GPUs/browsers
var CHUNK_HEIGHT = 10000; // Further reduced for better stability
var OVERLAP = 200; 

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
 * Performs a controlled smooth animation to a target Y position
 * @param {number} targetY The destination Y coordinate
 * @param {number} duration Animation duration in ms
 */
async function animatedScrollTo(targetY, duration = 300) {
  var startY = window.scrollY;
  var diff = targetY - startY;
  if (Math.abs(diff) < 2) {
    window.scrollTo(0, targetY);
    return;
  }

  var startTime = performance.now();

  return new Promise(resolve => {
    function step(currentTime) {
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      
      // Sine-based easing for smooth start/stop
      var ease = 0.5 * (1 - Math.cos(Math.PI * progress));
      
      window.scrollTo(0, startY + (diff * ease));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY); // Ensure precision
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}
// Toast Notification System (Shadow DOM)
// Use var to allow re-assignment if injected again
var Toast = class {
  constructor() {
    this.host = document.createElement('div');
    this.host.style.cssText = 'position: fixed; z-index: 2147483647;';
    var shadow = this.host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
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

    var icon = '';
    var bgColor = 'rgba(15, 23, 42, 0.95)';
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
      var spinner = document.createElement('div');
      spinner.className = 'spinner';
      this.element.appendChild(spinner);
    } else {
      var iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      this.element.appendChild(iconSpan);
    }
    
    var textSpan = document.createElement('span');
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

var ElementPicker = class {
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
    
    var infoLabel = document.createElement('div');
    infoLabel.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: white; padding: 10px 20px; border-radius: 20px; font-family: system-ui; font-size: 13px; z-index: 2147483647; pointer-events: none; border: 1px solid rgba(251, 146, 60, 0.5); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);';
    
    var targetIcon = document.createElement('span');
    targetIcon.textContent = '🎯';
    var boldText = document.createElement('b');
    boldText.textContent = 'Capture Mode Active:';
    var hintText = document.createTextNode(' Select an element.');
    var escSpan = document.createElement('span');
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
    var el = document.elementFromPoint(e.clientX, e.clientY);
    this.overlay.style.pointerEvents = 'auto';

    if (el && el !== this.hoveredElement && el !== this.overlay && !this.overlay.contains(el)) {
      this.hoveredElement = el;
      var rect = el.getBoundingClientRect();
      
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
      var el = this.hoveredElement;
      var rect = el.getBoundingClientRect();
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
  var picker = new ElementPicker();
  picker.start(
    async (el, rect) => {
      // Small delay to var the highlight disappear
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
    
    var dataUrl = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE' }, response => {
        if (response && response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });

    var img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    var canvas = document.createElement('canvas');
    var dpr = window.devicePixelRatio || 1;
    
    // Calculate the intersection of the element and the viewport
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    
    var visibleLeft = Math.max(0, rect.left);
    var visibleTop = Math.max(0, rect.top);
    var visibleRight = Math.min(viewportWidth, rect.right);
    var visibleBottom = Math.min(viewportHeight, rect.bottom);
    
    var visibleWidth = visibleRight - visibleLeft;
    var visibleHeight = visibleBottom - visibleTop;

    if (visibleWidth <= 0 || visibleHeight <= 0) {
      throw new Error('Element is partially or fully off-screen. Please scroll it into view.');
    }
    
    canvas.width = visibleWidth * dpr;
    canvas.height = visibleHeight * dpr;
    
    var ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      visibleLeft * dpr, visibleTop * dpr, visibleWidth * dpr, visibleHeight * dpr,
      0, 0, visibleWidth * dpr, visibleHeight * dpr
    );

    var croppedDataUrl = canvas.toDataURL('image/png');
    
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

var toast = toast || new Toast();

// Handler function for messages - using a named variable so we can remove/update it
var ssCapture_MessageHandler = function(message, sender, sendResponse) {
  console.log('Content Script Received Message:', message);

  if (message.type === 'PING') {
    sendResponse('PONG');
    return false;
  }

  if (message.type === 'INIT_CAPTURE' || message.type === 'START_CAPTURE') {
    var isPopup = message.isPopup !== undefined ? message.isPopup : false;
    var mode = message.mode || 'FULL_PAGE';
    captureScreenshot(isPopup, mode);
    if (sendResponse) sendResponse({ status: 'started' });
  }

  if (message.type === 'CANCEL_CAPTURE') {
    ssCapture_isCancelled = true;
  }

  return true;
};

// Cleanup old listener if it exists to prevent duplicates
if (window.ssCapture_ActiveListener) {
    try {
        chrome.runtime.onMessage.removeListener(window.ssCapture_ActiveListener);
    } catch(e) {}
}

// Add and track new listener
window.ssCapture_ActiveListener = ssCapture_MessageHandler;
chrome.runtime.onMessage.addListener(ssCapture_MessageHandler);


// Main capture function
async function captureScreenshot(isPopup = true, mode = 'FULL_PAGE') {
  console.log(`Starting ${mode} screenshot capture...`);
  ssCapture_isCancelled = false; // Reset cancel flag
  
  if (mode === 'SELECTED_ELEMENT') {
    startElementPicker(isPopup);
    return;
  }

  if (!isPopup) {
    var startMsg = mode === 'VISIBLE_AREA' ? 'Capturing Visible Area...' : 'Starting Full Page Capture...';
    toast.show(startMsg, 'loading');
    
    // Visual feedback: Flash the screen like a camera shutter
    var flash = document.createElement('div');
    flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 2147483647; pointer-events: none; opacity: 0.6; transition: opacity 0.4s ease-out;';
    (document.documentElement || document.body).appendChild(flash);
    
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    });

    await sleep(800); // Give user a moment to see the notification
  }

  var originalX = window.scrollX;
  var originalY = window.scrollY;
  var fixedElements = [];
  var originalStyles = [];

  function cleanup() {
    // Restore original styles
    originalStyles.forEach(({ el, property, value }) => {
      try { el.style.setProperty(property, value); } catch (e) {}
    });

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
    
    // Get user preference for scroll mode to optimize wait times
    var settings = await new Promise(resolve => {
      chrome.storage.local.get(['premiumScroll'], resolve);
    });
    var isPremium = settings.premiumScroll !== false;
    var captureWaitTime = isPremium ? 800 : 300; 
    var scrollDuration = isPremium ? 400 : 250;

    // Disable smooth scrolling during capture to prevent sync issues
    document.querySelectorAll('html, body').forEach(el => {
      originalStyles.push({ el, property: 'scroll-behavior', value: el.style.scrollBehavior });
      el.style.setProperty('scroll-behavior', 'auto', 'important');
    });

    // Check browser compatibility
    if (!chrome.runtime) {
      throw new Error('Browser not supported or extension context invalid');
    }

    // Calculate page dimensions
    var body = document.body;
    var html = document.documentElement;
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;

    var totalWidth, totalHeight;
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

    if (mode === 'VISIBLE_AREA') {
      sendProgressUpdate('Capturing visible area...', 50);
      toast.show('Capturing visible area...', 'loading');
      
      var dataUrl = await new Promise((resolve, reject) => {
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
      // Hide fixed/sticky elements
      document.querySelectorAll('*').forEach(el => {
        var style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          fixedElements.push({ el, originalDisplay: style.display });
          el.style.display = 'none';
        }
      });

      // Scroll to the very top to start capture from a consistent state
      sendProgressUpdate('Scrolling to top...', 4);
      await animatedScrollTo(0, 400);
      await sleep(500); // Allow layout to settle
    }

    // Determine if we need chunking
    var needsChunking = mode === 'FULL_PAGE' && totalHeight > MAX_CANVAS_HEIGHT;
    var numChunks = needsChunking ? Math.ceil(totalHeight / CHUNK_HEIGHT) : 1;

    if (needsChunking) {
      sendProgressUpdate(`Page height: ${totalHeight}px. Dividing into ${numChunks} chunks...`, 5);
      await sleep(500);
    }

    // Capture chunks
    var chunks = [];

    for (var chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      if (ssCapture_isCancelled) {
        throw new Error('Screenshot cancelled');
      }

      var chunkStartY = chunkIndex * CHUNK_HEIGHT;
      var chunkEndY = Math.min(chunkStartY + CHUNK_HEIGHT + OVERLAP, totalHeight);
      var actualChunkHeight = chunkEndY - chunkStartY;

      sendProgressUpdate(
        `Capturing section ${chunkIndex + 1}/${numChunks}...`,
        Math.round((chunkIndex / numChunks) * 75) + 15
      );
      if (!isPopup) toast.show(`Capturing section ${chunkIndex + 1}...`, 'loading');

      // Create canvas for this chunk
      var chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = viewportWidth;
      chunkCanvas.height = actualChunkHeight;
      var chunkCtx = chunkCanvas.getContext('2d', { willReadFrequently: false });

      if (!chunkCtx) {
        throw new Error('Could not create canvas context');
      }

      // Capture this chunk viewport by viewport
      var currentY = chunkStartY;
      var capturedParts = 0;

      while (currentY < chunkEndY) {
        if (ssCapture_isCancelled) {
          throw new Error('Screenshot cancelled');
        }

        capturedParts++;

        // Scroll to position smoothly
        await animatedScrollTo(currentY, scrollDuration);
        var actualY = Math.round(window.scrollY);
        
        // Wait for page layout/animations to settle
        await sleep(captureWaitTime);

        // Capture current viewport with retry mechanism
        var dataUrl;
        var retryCount = 0;
        var maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            dataUrl = await new Promise((resolve, reject) => {
              var captureTimeout = setTimeout(() => {
                reject(new Error('Screenshot capture timed out (30s)'));
              }, 30000);

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
              await sleep(1000); // Wait longer on rate limit
              continue;
            } else {
              throw error;
            }
          }
        }

        // Load image onto canvas
        var img = new Image();
        await new Promise((resolve, reject) => {
          var imgTimeout = setTimeout(() => {
            reject(new Error('Image loading timed out'));
          }, 10000); // 10s for image load

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

        // Use actual scroll position to draw on the chunk canvas.
        var drawY = actualY - chunkStartY;
        chunkCtx.drawImage(img, 0, drawY, viewportWidth, viewportHeight);

        // If we've reached the absolute bottom of the page, exit ALL loops
        if (actualY + viewportHeight >= totalHeight - 1) {
          currentY = totalHeight + 1; // Force break while loop
          chunkIndex = numChunks + 1; // Force break for loop
          break;
        }

        // Move to next section
        currentY = actualY + viewportHeight;

        // Allow garbage collection
        if (capturedParts % 3 === 0) {
          await sleep(50);
        }
      }

      chunks.push(chunkCanvas);
    }

        // Combine chunks into final canvas
    sendProgressUpdate('Combining chunks into final image...', 92);

    if (totalHeight > MAX_CANVAS_HEIGHT) {
      console.warn(`Page height ${totalHeight}px exceeds safer limit of ${MAX_CANVAS_HEIGHT}px. The image might be truncated or fail to render.`);
    }

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = viewportWidth;
    finalCanvas.height = Math.min(totalHeight, MAX_CANVAS_HEIGHT);
    var finalCtx = finalCanvas.getContext('2d', { willReadFrequently: false });

    if (!finalCtx) {
      throw new Error('Could not create final canvas context. The page might be too complex or large.');
    }

    for (var i = 0; i < chunks.length; i++) {
      var yPosition = i * CHUNK_HEIGHT;
      // Don't draw outside final canvas
      if (yPosition < finalCanvas.height) {
        finalCtx.drawImage(chunks[i], 0, yPosition);
      }
      
      // Clear chunk from memory
      chunks[i].width = 0;
      chunks[i].height = 0;

      sendProgressUpdate(
        'Stitching chunks...',
        92 + Math.round((i / chunks.length) * 5)
      );
    }
    chunks.length = 0;

    sendProgressUpdate('Processing final screenshot...', 98);

    // Convert canvas to data URL
    var finalScreenshot;
    try {
      finalScreenshot = finalCanvas.toDataURL('image/png');
      if (!finalScreenshot || finalScreenshot.length < 100) {
        throw new Error('Generated image is empty');
      }
    } catch (error) {
      console.error('Canvas toDataURL failed:', error);
      throw new Error('Failed to convert screenshot to image. This usually happens on extremely long pages.');
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


