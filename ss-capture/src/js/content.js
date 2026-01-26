
// Centralized overlay management for proper cleanup
/* eslint-disable no-undef */

(function() {
  if (window.__SS_CAPTURE_LOADED__) return;
  window.__SS_CAPTURE_LOADED__ = true;

console.log('[SS-CAPTURE] content.js loaded');

// Notify background script that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_READY' });

// Listen for messages from background or popup - moved to top for reliability
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content Script Received Message:', message);

  try {
    if (message.type === 'PING') {
      sendResponse('PONG');
      return true;
    }

    if (message.type === 'INIT_CAPTURE') {
      if (message.mode === 'FULL_PAGE') {
        captureFullPage();
      } else if (message.mode === 'SELECTED_ELEMENT') {
        startElementPicker();
      } else if (message.mode === 'VISIBLE_AREA') {
        captureScreenshot();
      }
      if (sendResponse) sendResponse({ status: 'started' });
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error in content script message handler:', error);
    if (sendResponse) sendResponse({ error: error.message });
    return false;
  }
});

function safeInit() {
  let captureOverlay = null;

  function removeOverlay() {
    if (captureOverlay) {
      captureOverlay.remove();
      captureOverlay = null;
    }
  }

  // Clean up on ESC key (mandatory UX) - but not on focus loss to avoid interfering with capture
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeOverlay();
    }
  });
}

// Additional message handler for overlay cleanup (consolidated)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'CANCEL_CAPTURE') {
      removeAllOverlays();
      if (sendResponse) sendResponse({ status: 'cancelled' });
      return false;
    }

    if (message.type === 'REMOVE_OVERLAY') {
      removeOverlay();
      if (sendResponse) sendResponse({ status: 'overlay_removed' });
      return false;
    }

    if (message.type === 'SCREENSHOT_CAPTURED') {
      // Add screenshot from popup to session panel
      const { dataUrl, filename } = message.payload;
      try {
        chrome.runtime.sendMessage({
          type: 'ADD_SESSION_SCREENSHOT',
          dataUrl: dataUrl,
          filename: filename
        });
      } catch (error) {
        console.error('Failed to add screenshot to session:', error);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in content script message handler:', error);
    if (sendResponse) sendResponse({ error: error.message });
    return false;
  }
});

// Additional message handler for overlay cleanup (consolidated)
// Constants - removed html2canvas related constants

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

// Session panel is now handled by sessionPanel.js

// Function to add screenshot to session store via background script
function addScreenshotToSession(dataUrl, filename) {
  try {
    chrome.runtime.sendMessage({
      type: 'ADD_SESSION_SCREENSHOT',
      dataUrl: dataUrl,
      filename: filename
    });
  } catch (error) {
    console.error('Failed to add screenshot to session:', error);
  }
}

// Overlay cleanup functions - remove temporary overlays but preserve session panel
function removeAllOverlays() {
  // Remove element picker overlay
  const pickerHost = document.getElementById('ss-element-picker-host');
  if (pickerHost) pickerHost.remove();

  // Remove flash overlay
  const flashHost = document.getElementById('ss-flash-host');
  if (flashHost) flashHost.remove();

  // Remove any other extension overlays but preserve session panel and modal
  const extensionOverlays = document.querySelectorAll('[data-ss-capture-ui]:not(#ss-session-panel):not(#ss-session-modal)');
  extensionOverlays.forEach(el => el.remove());
}

// Remove overlays on page unload
window.addEventListener('beforeunload', () => {
  removeAllOverlays();
});

// Remove overlays when tab becomes hidden or visible (user switches tabs)
document.addEventListener('visibilitychange', () => {
  removeAllOverlays();
});

// Additional aggressive cleanup for overlay persistence issues
window.addEventListener('focus', () => {
  setTimeout(() => removeAllOverlays(), 100);
});

window.addEventListener('blur', () => {
  setTimeout(() => removeAllOverlays(), 100);
});

// Clean up on page show/hide events
document.addEventListener('pageshow', () => {
  removeAllOverlays();
});

document.addEventListener('pagehide', () => {
  removeAllOverlays();
});

// Additional cleanup on window events
window.addEventListener('load', () => {
  removeAllOverlays();
});

window.addEventListener('unload', () => {
  removeAllOverlays();
});

// Clean up on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  removeAllOverlays();
});

// Additional cleanup on page unload and before navigation
window.addEventListener('pagehide', () => {
  removeAllOverlays();
});

// Clean up on navigation events
window.addEventListener('beforeunload', () => {
  removeAllOverlays();
});

// Clean up on focus loss to prevent artifacts on other tabs
window.addEventListener('blur', () => {
  // Small delay to allow focus to settle
  setTimeout(() => {
    if (document.hidden || !document.hasFocus()) {
      removeAllOverlays();
    }
  }, 100);
});

// Cancel messages are handled in the main message listener above

// Map to track html2canvas capture promises
const h2cPromises = new Map();

// Listen for messages from html2canvas bridge
window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  const { type, requestId, dataUrl, error } = event.data;
  if (type === 'H2C_RESULT') {
    const entry = h2cPromises.get(requestId);
    if (entry) {
      h2cPromises.delete(requestId);
      entry.resolve(dataUrl);
    }
  } else if (type === 'H2C_ERROR') {
    const entry = h2cPromises.get(requestId);
    if (entry) {
      h2cPromises.delete(requestId);
      entry.reject(new Error(error || 'html2canvas capture failed'));
    }
  }
});

// html2canvas injection function (for testing compatibility)
async function injectHtml2Canvas() {
  return new Promise((resolve, reject) => {
    // First, inject html2canvas.min.js
    const h2cScript = document.createElement('script');
    h2cScript.src = chrome.runtime.getURL('js/html2canvas.min.js');

    h2cScript.onload = () => {
      // Now inject the bridge script
      injectBridge();
    };

    h2cScript.onerror = () => {
      reject(new Error('html2canvas library failed to load - site may block script injection'));
    };

    try {
      document.documentElement.appendChild(h2cScript);
    } catch (e) {
      reject(new Error('html2canvas library failed to load - script injection blocked'));
    }

    function injectBridge() {
      let resolved = false;

      function onReady(event) {
        if (event.data?.type === 'H2C_READY') {
          resolved = true;
          window.removeEventListener('message', onReady);
          resolve();
        }
      }

      window.addEventListener('message', onReady);

      const bridgeScript = document.createElement('script');
      bridgeScript.src = chrome.runtime.getURL('js/html2canvas-bridge.js');

      bridgeScript.onload = () => {
        // Bridge loaded, wait for H2C_READY
      };

      bridgeScript.onerror = () => {
        if (!resolved) {
          window.removeEventListener('message', onReady);
          reject(new Error('html2canvas bridge failed to load - site may block script injection'));
        }
      };

      try {
        document.documentElement.appendChild(bridgeScript);
      } catch (e) {
        reject(new Error('html2canvas bridge failed to load - script injection blocked'));
      }

      // Safety timeout
      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('message', onReady);
          reject(new Error('html2canvas bridge init timeout - site may have CSP restrictions'));
        }
      }, 5000);
    }
  });
}

// Function to capture via bridge
async function captureViaBridge(selector, options = {}) {
  await injectHtml2Canvas();
  const requestId = Date.now() + Math.random();
  return new Promise((resolve, reject) => {
    h2cPromises.set(requestId, { resolve, reject });

    // Convert element to selector if needed
    let selectorToSend = selector;
    if (typeof selector !== 'string') {
      // If it's an element, try to create a unique selector
      if (selector.id) {
        selectorToSend = '#' + selector.id;
      } else if (selector.className) {
        selectorToSend = '.' + selector.className.split(' ')[0];
      } else {
        // Fallback: pass the element directly (bridge will handle it)
        selectorToSend = selector;
      }
    }

    window.postMessage({
      type: 'H2C_CAPTURE',
      requestId,
      selector: selectorToSend,
      options
    }, '*');
    // Timeout after 30 seconds
    setTimeout(() => {
      if (h2cPromises.has(requestId)) {
        h2cPromises.delete(requestId);
        reject(new Error('html2canvas capture timeout'));
      }
    }, 30000);
  });
}



// UI visibility functions (for testing compatibility)
function hideExtensionUI() {
  const nodes = document.querySelectorAll('[data-ss-capture-ui]');
  nodes.forEach(el => el.style.display = 'none');
}

function showExtensionUI() {
  const nodes = document.querySelectorAll('[data-ss-capture-ui]');
  nodes.forEach(el => el.style.display = '');
}

// Export functions for testing (only in test environment)
if (typeof global !== 'undefined' && global.jest) {
  global.injectHtml2Canvas = injectHtml2Canvas;
  global.captureViaBridge = captureViaBridge;
  global.hideExtensionUI = hideExtensionUI;
  global.showExtensionUI = showExtensionUI;
  global.sendProgressUpdate = sendProgressUpdate;
  global.sendError = sendError;
  global.Toast = Toast;
  global.ElementPicker = ElementPicker;
}

// Toast Notification System (Shadow DOM)
class Toast {
  constructor() {
    this.host = document.createElement('div');
    this.host.setAttribute('data-ss-capture-ui', 'true');
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
    this.host = null;
    this.shadow = null;
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

    // Create Shadow DOM host
    this.host = document.createElement('div');
    this.host.id = 'ss-element-picker-host';
    this.host.setAttribute('data-ss-capture-ui', 'true');
    this.host.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483646; pointer-events: none;';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Create overlay inside Shadow DOM
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; pointer-events: auto;';

    // Create highlight inside Shadow DOM
    this.highlight = document.createElement('div');
    this.highlight.style.cssText = 'position: fixed; border: 2px solid rgba(34, 197, 94, 0.8); background: rgba(34, 197, 94, 0.1); pointer-events: none; z-index: 1; transition: all 0.1s ease-out; border-radius: 4px; box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);';

    // Create info label inside Shadow DOM
    const infoLabel = document.createElement('div');
    infoLabel.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: white; padding: 10px 20px; border-radius: 20px; font-family: system-ui; font-size: 13px; pointer-events: none; border: 1px solid rgba(59, 130, 246, 0.5); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);';

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

    this.shadow.appendChild(this.overlay);
    this.shadow.appendChild(this.highlight);
    this.shadow.appendChild(infoLabel);
    document.documentElement.appendChild(this.host);

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('mousedown', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  stop() {
    if (this.host) this.host.remove();

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('mousedown', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);

    this.host = null;
    this.shadow = null;
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

    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    await sleep(100);

    let dataUrl;

    try {
      // Try html2canvas bridge first
      await injectHtml2Canvas();
      dataUrl = await captureViaBridge(element, {
        useCORS: true,
        allowTaint: false,
        scale: 1,
        width: rect.width,
        height: rect.height
      });
    } catch (bridgeError) {
      // Fallback to visible area capture using Chrome API
      toast.show('Element capture not available on this site. Capturing visible area instead...', 'info');
      await sleep(1000);

      dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
          if (response && response.dataUrl) {
            resolve(response.dataUrl);
          } else {
            reject(new Error('Failed to capture visible area'));
          }
        });
      });
    }

    // Add to session store
    addScreenshotToSession(dataUrl, `element-${Date.now()}.png`);

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
      toast.show('Element Captured! Click to preview.', 'success', () => {
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



// Full page capture implementation (simplified - captures current visible area)
async function captureFullPage(isPopup) {
  console.log('Starting full page screenshot capture...');

  toast.show('Capturing full page...', 'loading');

  // Visual feedback: Flash the screen like a camera shutter using Shadow DOM
  const flashHost = document.createElement('div');
  flashHost.id = 'ss-flash-host';
  flashHost.setAttribute('data-ss-capture-ui', 'true');
  flashHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; pointer-events: none;';
  const flashShadow = flashHost.attachShadow({ mode: 'open' });
  const flash = document.createElement('div');
  flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; pointer-events: none; opacity: 0.6; transition: opacity 0.4s ease-out;';
  flashShadow.appendChild(flash);
  document.documentElement.appendChild(flashHost);

  requestAnimationFrame(() => {
    flash.style.opacity = '0';
    setTimeout(() => flashHost.remove(), 400);
  });

  await sleep(800); // Give user a moment to see the notification

  try {
    sendProgressUpdate('Capturing full page...', 50);

    let dataUrl;

    try {
      // Try html2canvas bridge first
      await injectHtml2Canvas();
      dataUrl = await captureViaBridge('body', {
        useCORS: true,
        allowTaint: false,
        scale: 1,
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        windowWidth: document.body.scrollWidth,
        windowHeight: document.body.scrollHeight
      });
    } catch (bridgeError) {
      console.warn('html2canvas bridge failed, falling back to visible area capture:', bridgeError.message);

      // Fallback to visible area capture using Chrome API
      toast.show('Full page capture not available on this site. Capturing visible area instead...', 'info');
      await sleep(1000);

      dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
          if (response && response.dataUrl) {
            resolve(response.dataUrl);
          } else {
            reject(new Error('Failed to capture visible area - site may have restrictions'));
          }
        });
      });
    }

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
      toast.show('Page Captured! Click to preview.', 'success', () => {
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        } catch (error) {
          console.error('Failed to open popup:', error);
        }
        toast.hide();
      });
      toast.hide(8000);

      console.log("CAPTURE_COMPLETE sent for page");
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
    addScreenshotToSession(dataUrl, `page-${Date.now()}.png`);

  } catch (error) {
    console.error('Page capture error:', error);
    toast.show('Page Capture Failed', 'error');
    toast.hide(4000);
    sendError(error.message || 'Unknown error during page capture');
  }
}

// Main capture function - supports all three capture modes
async function captureScreenshot(isPopup = true, mode = 'VISIBLE_AREA') {
  console.log(`Starting ${mode} screenshot capture...`);

  if (mode === 'SELECTED_ELEMENT') {
    startElementPicker(isPopup);
    return;
  }

  if (mode === 'FULL_PAGE') {
    // Implement full page capture by scrolling and capturing multiple sections
    await captureFullPage(isPopup);
    return;
  }

  toast.show('Capturing visible area...', 'loading');

  // Visual feedback: Flash the screen like a camera shutter using Shadow DOM
  const flashHost = document.createElement('div');
  flashHost.id = 'ss-flash-host';
  flashHost.setAttribute('data-ss-capture-ui', 'true');
  flashHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; pointer-events: none;';
  const flashShadow = flashHost.attachShadow({ mode: 'open' });
  const flash = document.createElement('div');
  flash.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; pointer-events: none; opacity: 0.6; transition: opacity 0.4s ease-out;';
  flashShadow.appendChild(flash);
  document.documentElement.appendChild(flashHost);

  requestAnimationFrame(() => {
    flash.style.opacity = '0';
    setTimeout(() => flashHost.remove(), 400);
  });

  await sleep(800); // Give user a moment to see the notification

  try {
    sendProgressUpdate('Capturing visible area...', 50);

    // Use Chrome API directly for visible area capture
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
        if (response && response.dataUrl) {
          resolve(response.dataUrl);
        } else {
          reject(new Error('Failed to capture visible area'));
        }
      });
    });

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
    addScreenshotToSession(dataUrl, `visible-area-${Date.now()}.png`);

  } catch (error) {
    console.error('Screenshot error:', error);
    toast.show('Capture Failed', 'error');
    toast.hide(4000);
    sendError(error.message || 'Unknown error during screenshot capture');
  }
}

  // Call safeInit when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();
