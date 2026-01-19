
// State variables
// Function to ensure html2canvas is loaded in the page context
async function ensureHtml2Canvas() {
  console.log('Ensuring html2canvas is available in page context...');

  // Check if html2canvas is already available in the page context
  const checkPageContext = () => {
    try {
      // Access the page's window through unsafeWindow or direct injection
      const pageWindow = window.wrappedJSObject || window;
      if (pageWindow.html2canvas && typeof pageWindow.html2canvas === 'function') {
        console.log('html2canvas found in page context');
        return pageWindow.html2canvas;
      }
    } catch (e) {
      console.warn('Could not access page context directly:', e.message);
    }
    return null;
  };

  let html2canvasLib = checkPageContext();
  if (html2canvasLib) return html2canvasLib;

  // Inject html2canvas directly into the page's head to make it available in page context
  console.log('Injecting html2canvas into page context...');
  return new Promise((resolve, reject) => {
    // Fetch the html2canvas script content
    fetch(chrome.runtime.getURL('src/js/html2canvas.min.js'))
      .then(response => response.text())
      .then(scriptContent => {
        console.log('html2canvas script fetched, injecting into page...');

        // Create a script element with the content directly injected
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = scriptContent;

        let loaded = false;
        let timeoutId;

        script.onload = () => {
          if (loaded) return;
          loaded = true;
          clearTimeout(timeoutId);

          console.log('html2canvas script injected, verifying availability...');

          // Give it a moment to initialize and check multiple times
          let attempts = 0;
          const checkLoaded = () => {
            attempts++;
            const lib = checkPageContext();
            if (lib) {
              console.log('html2canvas successfully loaded and available in page context');
              resolve(lib);
            } else if (attempts < 10) {
              setTimeout(checkLoaded, 100); // Check again in 100ms
            } else {
              console.error('html2canvas script injected but not accessible in page context after multiple attempts');
              reject(new Error('html2canvas loaded but not available in page context'));
            }
          };

          setTimeout(checkLoaded, 50);
        };

        script.onerror = (e) => {
          if (loaded) return;
          loaded = true;
          clearTimeout(timeoutId);
          console.error('Failed to inject html2canvas script:', e);
          reject(new Error('Failed to inject html2canvas script'));
        };

        // Inject into page head - this makes it available in the page's global scope
        const target = document.head || document.documentElement;
        if (target) {
          try {
            target.appendChild(script);
            console.log('html2canvas injected into page head');
          } catch (e) {
            console.error('Failed to inject html2canvas script:', e);
            reject(new Error('Failed to inject html2canvas script: ' + e.message));
            return;
          }
        } else {
          reject(new Error('No suitable element found to inject html2canvas script'));
          return;
        }

        // Set timeout for loading
        timeoutId = setTimeout(() => {
          if (!loaded) {
            loaded = true;
            console.error('html2canvas injection timed out');
            reject(new Error('html2canvas failed to load within timeout'));
          }
        }, 15000); // 15 second timeout
      })
      .catch(error => {
        console.error('Failed to fetch html2canvas script:', error);
        reject(new Error('Failed to fetch html2canvas script: ' + error.message));
      });
  });
}
// Constants
const MAX_CANVAS_HEIGHT = 32000; // Browser limit
const CHUNK_HEIGHT = 28000; // Safe chunk size with margin for overlap

// Helper functions
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function sendProgressUpdate(message, percentComplete = null) {
  try {
    chrome.runtime.sendMessage({
      type: 'PROGRESS',
      message,
      percentComplete
    });
  } catch (error) {
    console.error('Failed to send progress update:', error);
    // Ignore extension context invalidated errors
    if (!error.message.includes('Extension context invalidated')) {
      throw error;
    }
  }
}

function sendError(errorMessage) {
  try {
    chrome.runtime.sendMessage({
      type: 'CAPTURE_ERROR',
      error: errorMessage
    });
  } catch (error) {
    console.error('Failed to send error:', error);
    // Ignore extension context invalidated errors
    if (!error.message.includes('Extension context invalidated')) {
      throw error;
    }
  }
}

// Debug logging
console.log('Content script loaded');

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
      captureElement(el, rect, isPopup);
    },
    () => {
      toast.show('Selection cancelled', 'info');
      toast.hide(3000);
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'Selection cancelled' });
      } catch (error) {
        console.error('Failed to send capture error:', error);
      }
      // Ensure popup is reopened if it was closed
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      } catch (error) {
        console.error('Failed to reopen popup:', error);
      }
    }
  );
}

async function captureElement(element, rect, isPopup) {
  try {
    toast.show('Capturing element...', 'loading');

    // Validate element and rectangle dimensions
    if (!element) {
      throw new Error('No element selected for capture');
    }

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      throw new Error('Invalid element dimensions for capture');
    }

    // Ensure DOM is ready
    if (document.readyState !== 'complete') {
      await new Promise(r => window.addEventListener('load', r, { once: true }));
    }

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    await sleep(100);

    // Ensure html2canvas is loaded
    const html2canvasLib = await ensureHtml2Canvas();

    // Capture with html2canvas
    const canvas = await html2canvasLib(element, {
      useCORS: true,
      allowTaint: false,
      scale: window.devicePixelRatio || 1,
      width: rect.width,
      height: rect.height,
      x: 0,
      y: 0
    });

    const dataUrl = canvas.toDataURL('image/png');

    // Validate data URL
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Invalid image data received');
    }

    // Add to session store
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 150;
    const thumbCtx = thumbCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      thumbCtx.drawImage(img, 0, 0, 200, 150);
      const thumbDataUrl = thumbCanvas.toDataURL('image/png');
      try {
        chrome.runtime.sendMessage({
          type: 'ADD_SESSION_SCREENSHOT',
          dataUrl: dataUrl,
          thumbnail: thumbDataUrl,
          filename: `element-${Date.now()}.png`
        });
      } catch (error) {
        console.error('Failed to add to session store:', error);
      }
    };
    img.src = dataUrl;

    if (isPopup) {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      } catch (error) {
        console.error('Failed to open popup:', error);
      }
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_COMPLETE',
            dataUrl: dataUrl,
            fromPopup: isPopup
          });
        } catch (sendError) {
          console.error('Failed to send capture complete message:', sendError);
          throw new Error('Failed to send capture result');
        }
      }, 500);
    } else {
      toast.show('Selected Element Captured! Click to preview.', 'success', () => {
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        } catch (error) {
          console.error('Failed to open popup:', error);
        }
        toast.hide();
      });
      toast.hide(8000);

      console.log("CAPTURE_COMPLETE sent for element");
      try {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_COMPLETE',
          dataUrl: dataUrl,
          fromPopup: isPopup
        });
      } catch (sendError) {
        console.error('Failed to send capture complete message:', sendError);
        throw new Error('Failed to send capture result');
      }
    }

  } catch (error) {
    console.error('Element capture error:', error);
    const errorMessage = error.message || 'Unknown error during element capture';
    toast.show(`Capture failed: ${errorMessage}`, 'error');
    toast.hide(4000);
    sendError(errorMessage);
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
    // Delay to allow popup to close
    setTimeout(() => captureScreenshot(isPopup, mode), 500);
    if (sendResponse) sendResponse({ status: 'started' });
    return true; // Keep message channel open
  }

  // Removed CAPTURE handler to avoid message loops

  // Cancellation no longer needed in simplified architecture

  return true;
});

// Main capture function
async function captureScreenshot(isPopup = true, mode = 'FULL_PAGE') {
  console.log(`Starting ${mode} screenshot capture...`);
  console.log("CAPTURE START");

  // Debug: Log when scrolling finishes
  console.log("Scrolling setup complete");
  
  if (mode === 'SELECTED_ELEMENT') {
    startElementPicker(isPopup);
    return;
  }

  const startMsg = mode === 'VISIBLE_AREA' ? 'Capturing Visible Area...' : 'Starting Full Page Capture...';
  toast.show(startMsg, 'loading');

  // Visual feedback: Flash the screen like a camera shutter
  const flash = document.createElement('div');
  flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 2147483647; pointer-events: none; opacity: 0.6; transition: opacity 0.4s ease-out;';

  // Ensure DOM is ready before appending
  function appendFlash() {
    const flashTarget = document.documentElement || document.body;
    if (flashTarget) {
      try {
        flashTarget.appendChild(flash);
      } catch (e) {
        console.error('Failed to append flash element:', e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendFlash);
  } else {
    appendFlash();
  }

  requestAnimationFrame(() => {
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 400);
  });

  await sleep(800); // Give user a moment to see the notification

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

    if (mode === 'VISIBLE_AREA') {
      sendProgressUpdate('Capturing visible area...', 50);
      toast.show('Capturing visible area...', 'loading');

      // Ensure html2canvas is loaded
      const html2canvasLib = await ensureHtml2Canvas();

      // Capture visible area using html2canvas
      const canvas = await html2canvasLib(document.documentElement, {
        useCORS: true,
        allowTaint: false,
        scale: window.devicePixelRatio || 1,
        width: viewportWidth,
        height: viewportHeight,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: 0,
        scrollY: 0
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Validate dataUrl
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
        throw new Error('Invalid image data received from capture');
      }

      if (isPopup) {
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        } catch (error) {
          console.error('Failed to open popup:', error);
        }
        setTimeout(() => {
          try {
            chrome.runtime.sendMessage({
              type: 'CAPTURE_COMPLETE',
              dataUrl: dataUrl,
              fromPopup: isPopup
            });
          } catch (error) {
            console.error('Failed to send capture complete:', error);
          }
        }, 1000);
      } else {
        toast.show('Visible Area Captured! Click to preview.', 'success', () => {
          try {
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
          } catch (error) {
            console.error('Failed to open popup:', error);
          }
          toast.hide();
        });
        toast.hide(8000);

        console.log("CAPTURE_COMPLETE sent for visible area");
        try {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_COMPLETE',
            dataUrl: dataUrl,
            fromPopup: isPopup
          });
        } catch (error) {
          console.error('Failed to send capture complete:', error);
        }
      }

    // Add to session store
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 150;
    const thumbCtx = thumbCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      thumbCtx.drawImage(img, 0, 0, 200, 150);
      const thumbDataUrl = thumbCanvas.toDataURL('image/png');
      try {
        chrome.runtime.sendMessage({
          type: 'ADD_SESSION_SCREENSHOT',
          dataUrl: dataUrl,
          thumbnail: thumbDataUrl,
          filename: `visible-area-${Date.now()}.png`
        });
      } catch (error) {
        console.error('Failed to add to session store:', error);
      }
    };
    img.src = dataUrl;
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

    // Ensure html2canvas is loaded for full page capture
    const html2canvasLib = await ensureHtml2Canvas();

    // Use html2canvas's built-in full page capture for better reliability
    sendProgressUpdate('Capturing full page with html2canvas...', 10);

    // Configure html2canvas for full page capture with optimized settings
    const canvas = await html2canvasLib(document.documentElement, {
      useCORS: true,
      allowTaint: false,
      scale: Math.min(window.devicePixelRatio || 1, 2), // Limit scale for performance
      width: viewportWidth,
      height: totalHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: viewportWidth,
      windowHeight: viewportHeight,
      // Performance optimizations
      backgroundColor: null,
      imageTimeout: 0,
      removeContainer: true,
      foreignObjectRendering: false, // Disable for better compatibility
      // Timeout settings
      timeout: 60000, // 60 second timeout
      // Better error handling
      onclone: () => {
        console.log('Document cloned for capture');
      },
      logging: false // Disable logging for performance
    });

    sendProgressUpdate('Processing captured image...', 90);

    const dataUrl = canvas.toDataURL('image/png', 0.8); // Use higher compression

    // Validate data URL
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Invalid image data received from html2canvas');
    }

    if (dataUrl.length < 1000) { // Very small data URLs are likely invalid
      throw new Error('Captured image data appears to be invalid or corrupted');
    }

    sendProgressUpdate('Finalizing screenshot...', 95);

    // Success handling
    const finalScreenshot = dataUrl;

    cleanup();

    if (isPopup) {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      } catch (error) {
        console.error('Failed to open popup:', error);
      }
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({
            type: 'CAPTURE_COMPLETE',
            dataUrl: finalScreenshot,
            fromPopup: isPopup
          });
        } catch (error) {
          console.error('Failed to send capture complete:', error);
        }
      }, 1000);
    } else {
      toast.show('Full Page Capture Complete! Click to preview.', 'success', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        toast.hide();
      });
      toast.hide(8000);

      console.log("CAPTURE_COMPLETE sent for full page");
      try {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_COMPLETE',
          dataUrl: finalScreenshot,
          fromPopup: isPopup
        });
      } catch (error) {
        console.error('Failed to send capture complete:', error);
      }
    }

    // Add to session store
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 150;
    const thumbCtx = thumbCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      thumbCtx.drawImage(img, 0, 0, 200, 150);
      const thumbDataUrl = thumbCanvas.toDataURL('image/png');
      try {
        chrome.runtime.sendMessage({
          type: 'ADD_SESSION_SCREENSHOT',
          dataUrl: finalScreenshot,
          thumbnail: thumbDataUrl,
          filename: `full-page-${Date.now()}.png`
        });
      } catch (error) {
        console.error('Failed to add to session store:', error);
      }
    };
    img.src = finalScreenshot;

  } catch (error) {
    console.error('Screenshot error:', error);
    cleanup();

    toast.show('Capture Failed', 'error');
    toast.hide(4000);

    sendError(error.message || 'Unknown error during screenshot capture');
  }
}
