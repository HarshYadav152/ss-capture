 // Background script for SS-Capture extension
// Handles extension lifecycle, messaging, and background tasks

// Session store implementation (in-memory)
const MAX_SESSION_ITEMS = 20;
let sessionScreenshots = [];
let notifier = null;

// Track tabs with active content scripts
const activeTabs = new Set();

function setNotifier(fn) {
  notifier = fn;
}

function addScreenshot(input) {
  // input can be a string (dataUrl) or an object { dataUrl, thumbnail, filename }
  const dataUrl = (typeof input === 'string') ? input : input.dataUrl;
  const thumbnail = (typeof input === 'string') ? null : input.thumbnail || null;
  const filename = (typeof input === 'string') ? `screenshot-${Date.now()}.png` : (input.filename || `screenshot-${Date.now()}.png`);
  const timestamp = new Date().toISOString();
  const id = `ss-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const item = { id, timestamp, dataUrl, filename };
  if (thumbnail) item.thumbnail = thumbnail;
  sessionScreenshots.unshift(item);
  if (sessionScreenshots.length > MAX_SESSION_ITEMS) {
    sessionScreenshots.length = MAX_SESSION_ITEMS;
  }
  if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
  return item;
}

function getScreenshots() {
  // return shallow copy
  return sessionScreenshots.slice();
}

function deleteScreenshot(id) {
  const idx = sessionScreenshots.findIndex(s => s.id === id);
  if (idx !== -1) {
    sessionScreenshots.splice(idx, 1);
    if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
    return true;
  }
  return false;
}

function clearScreenshots() {
  sessionScreenshots.length = 0;
  if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
}

let lastCaptureData = null;

// Helper function to send message to content script, inject if needed
function sendMessageToContentScript(tabId, message, callback) {
  // Check if tab is restricted
  chrome.tabs.get(tabId, (tab) => {
    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('file://')) {
      if (callback) callback({ error: 'Cannot inject into restricted page' });
      return;
    }

    // Try to send the message directly
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError && chrome.runtime.lastError.message === 'Could not establish connection. Receiving end does not exist.') {
        // Content script not loaded, try to inject
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/js/content.js', 'src/js/sessionPanel.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject content script:', chrome.runtime.lastError.message);
            if (callback) callback({ error: 'Failed to inject content script' });
            return;
          }

          // Wait a bit for the script to load, then retry send
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
              if (chrome.runtime.lastError) {
                console.error('Failed to send message after injection:', chrome.runtime.lastError.message);
                if (callback) callback({ error: 'Failed to send message' });
              } else {
                if (callback) callback(retryResponse || { status: 'sent' });
              }
            });
          }, 500);
        });
      } else if (chrome.runtime.lastError) {
        console.error('Failed to send message to content script:', chrome.runtime.lastError.message);
        if (callback) callback({ error: 'Failed to send message' });
      } else {
        if (callback) callback(response || { status: 'sent' });
      }
    });
  });
}



// Set up session store notifier to broadcast updates only to active tabs
setNotifier((update) => {
  if (update.type === 'SESSION_UPDATED') {
    activeTabs.forEach(tabId => {
      chrome.tabs.sendMessage(tabId, { type: 'SESSION_UPDATED' }, () => {
        if (chrome.runtime.lastError) {
          // Tab reloaded or closed, remove from active tabs
          activeTabs.delete(tabId);
        }
      });
    });
  }
});

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-visible-area',
    title: 'Capture Visible Area',
    contexts: ['page', 'selection']
  });

  chrome.contextMenus.create({
    id: 'capture-full-page',
    title: 'Capture Full Page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'capture-element',
    title: 'Capture Selected Element',
    contexts: ['page']
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !tab.url.startsWith('http')) return;

  // Only send message if tab has active content script
  if (!activeTabs.has(tab.id)) {
    console.warn('Content script not ready for tab:', tab.id);
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: 'INIT_CAPTURE',
    mode:
      info.menuItemId === 'capture-visible-area'
        ? 'VISIBLE_AREA'
        : info.menuItemId === 'capture-full-page'
        ? 'FULL_PAGE'
        : 'SELECTED_ELEMENT'
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('SendMessage failed:', chrome.runtime.lastError.message);
      // Remove from active tabs if message fails
      activeTabs.delete(tab.id);
    }
  });
});

// Command shortcuts handler - removed full page capture command

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const m = message;
  const r = sendResponse;

  // Track tabs with active content scripts
  if (m.type === 'CONTENT_READY' && sender.tab?.id) {
    activeTabs.add(sender.tab.id);
    return true;
  }

  if (m.type === 'CAPTURE_COMPLETE') {
    lastCaptureData = m.dataUrl;
    // Auto-save if configured
    if (m.autoSave !== false) {
      const filename = m.filename || `screenshot-${Date.now()}.png`;
      chrome.downloads.download({
        url: m.dataUrl,
        filename: filename,
        saveAs: false
      });
    }
  } else if (m.type === 'GET_LAST_CAPTURE') {
    r(lastCaptureData || null);
    return true;
  } else if (m.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch(() => {});
  } else if (m.type === 'ADD_SESSION_SCREENSHOT') {
    const item = addScreenshot(m);
    r(item);
    return true;
  } else if (m.type === 'GET_SESSION_SCREENSHOTS') {
    r(getScreenshots());
    return true;
  } else if (m.type === 'DELETE_SESSION_SCREENSHOT') {
    const success = deleteScreenshot(m.id);
    r(success);
    return true;
  } else if (m.type === 'CLEAR_SESSION_SCREENSHOTS') {
    clearScreenshots();
    r(true);
    return true;
  } else if (m.type === 'SCREENSHOT_CAPTURED') {
    // Forward to content script
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SCREENSHOT_CAPTURED',
        payload: m
      });
    }
    r(true);
    return true;
  } else if (m.type === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      r({ dataUrl });
    });
    return true; // async
  } else if (m.type === 'CAPTURE_VISIBLE_FOR_ELEMENT') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      r({ dataUrl });
    });
    return true; // async
  } else if (m.type === 'INIT_CAPTURE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      sendMessageToContentScript(tabId, m, (response) => {
        if (response.error) {
          console.error('Failed to start capture:', response.error);
          r({ error: 'Failed to start capture' });
        } else {
          r(response || { status: 'started' });
        }
      });
    } else {
      // Message from popup, get active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          sendMessageToContentScript(tabs[0].id, m, (response) => {
            if (response.error) {
              console.error('Failed to start capture:', response.error);
              r({ error: 'Failed to start capture' });
            } else {
              r(response || { status: 'started' });
            }
          });
        } else {
          r({ error: 'No active tab found' });
        }
      });
    }
    return true; // async
  }

  return true;
});

// Handle extension icon click (fallback)
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id || !tab.url.startsWith('http')) return;

  // Only send message if tab has active content script
  if (!activeTabs.has(tab.id)) {
    console.warn('Content script not ready for tab:', tab.id);
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', mode: 'VISIBLE_AREA' }, () => {
    if (chrome.runtime.lastError) {
      console.error('SendMessage failed:', chrome.runtime.lastError.message);
      // Remove from active tabs if message fails
      activeTabs.delete(tab.id);
    }
  });
});

// Clean up overlays when popup closes or capture is cancelled
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CANCEL_CAPTURE' && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: 'REMOVE_OVERLAY' });
  }
});

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  console.log('SS-Capture background script suspending');
});
