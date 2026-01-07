// Track capture state
let captureInProgress = false;
let lastCaptureTime = 0;
let lastCaptureData = null;
const MIN_CAPTURE_INTERVAL = 600;

// Initialize from storage
chrome.storage.local.get(['lastCaptureData'], (result) => {
  if (result.lastCaptureData) {
    lastCaptureData = result.lastCaptureData;
  }
});

// Function to inject script with permission request if needed
async function injectScriptWithPermission(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      { target: { tabId }, files: ['content.js'] },
      () => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message;
          console.error('Injection failed:', errorMessage);

          if (
            errorMessage.includes('permission') ||
            errorMessage.includes('access') ||
            errorMessage.includes('Cannot access')
          ) {
            chrome.permissions.request(
              { origins: ['<all_urls>'] },
              (granted) => {
                if (!granted) {
                  resolve({ success: false, error: 'Permission denied' });
                  return;
                }

                chrome.scripting.executeScript(
                  { target: { tabId }, files: ['content.js'] },
                  () => {
                    if (chrome.runtime.lastError) {
                      resolve({
                        success: false,
                        error: chrome.runtime.lastError.message
                      });
                    } else {
                      resolve({ success: true });
                    }
                  }
                );
              }
            );
          } else {
            resolve({ success: false, error: errorMessage });
          }
        } else {
          resolve({ success: true });
        }
      }
    );
  });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'capture_full_page') return;

  const now = Date.now();
  if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
  } catch {
    const injected = await injectScriptWithPermission(tab.id);
    if (injected.success) {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
      }, 100);
    }
  }
});

// Session store
import {
  addScreenshot,
  getScreenshots,
  deleteScreenshot,
  clearScreenshots,
  setScreenshots,
  setNotifier
} from './sessionStore.js';

// Notify UIs on session updates
setNotifier((msg) => {
  try {
    chrome.runtime.sendMessage(msg);
  } catch {}

  if (msg?.type === 'SESSION_UPDATED') {
    const area = chrome.storage.session || chrome.storage.local;
    area.set({ sessionScreenshots: getScreenshots() });
  }
});

// Load persisted session
(() => {
  const area = chrome.storage.session || chrome.storage.local;
  area.get(['sessionScreenshots'], (res) => {
    if (Array.isArray(res?.sessionScreenshots)) {
      setScreenshots(res.sessionScreenshots);
    }
  });
})();

// Messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Capture request
  if (message.type === 'CAPTURE') {
    const now = Date.now();
    const delay = Math.max(0, MIN_CAPTURE_INTERVAL - (now - lastCaptureTime));

    setTimeout(() => {
      captureInProgress = true;
      lastCaptureTime = Date.now();

      chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        { format: 'png', quality: 100 },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            captureInProgress = false;
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse(dataUrl);
          }
        }
      );
    }, delay);

    return true;
  }

  // Cancel capture
  if (message.type === 'CANCEL_CAPTURE') {
    captureInProgress = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs[0] && chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_CAPTURE' });
    });
  }

  // Session API
  if (message.type === 'GET_SESSION_SCREENSHOTS') {
    sendResponse(getScreenshots());
    return true;
  }

  if (message.type === 'DELETE_SESSION_SCREENSHOT') {
    sendResponse({ ok: deleteScreenshot(message.id) });
    return true;
  }

  if (message.type === 'CLEAR_SESSION_SCREENSHOTS') {
    clearScreenshots();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'ADD_SESSION_SCREENSHOT') {
    addScreenshot(message);
    sendResponse({ ok: true });
    return true;
  }

  // Progress forwarding
  if (
    message.type === 'PROGRESS' ||
    message.type === 'CAPTURE_COMPLETE' ||
    message.type === 'CAPTURE_ERROR'
  ) {
    if (message.type === 'CAPTURE_COMPLETE') {
      captureInProgress = false;
      lastCaptureData = message.dataUrl;
      chrome.storage.local.set({ lastCaptureData });
    }

    if (sender.tab) {
      chrome.runtime.sendMessage(message).catch(() => {});
    }
  }

  // Last capture
  if (message.type === 'GET_LAST_CAPTURE') {
    sendResponse(lastCaptureData || null);
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch(() => {});
  }
});

// Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture_full_page_context',
    title: '📸 Capture Full Page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'capture_visible_area_context',
    title: '👀 Capture Visible Area',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'capture_element_context',
    title: '🎯 Capture Selected Element',
    contexts: ['all']
  });
});

// Context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

  let mode = 'FULL_PAGE';
  if (info.menuItemId === 'capture_visible_area_context') mode = 'VISIBLE_AREA';
  if (info.menuItemId === 'capture_element_context') mode = 'SELECTED_ELEMENT';

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false, mode });
  } catch {
    const injected = await injectScriptWithPermission(tab.id);
    if (injected.success) {
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false, mode });
      }, 100);
    }
  }
});
