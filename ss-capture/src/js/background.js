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
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message;
        console.error('Injection failed:', errorMessage);
        
        // Check if it's a permission error
        if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('Cannot access')) {
          console.log('Permission error detected, requesting host permissions...');
          
          // Request permission
          chrome.permissions.request({
            origins: ['<all_urls>']
          }, (granted) => {
            if (granted) {
              console.log('Permission granted, retrying injection...');
              // Retry injection
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              }, () => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  resolve({ success: true });
                }
              });
            } else {
              resolve({ success: false, error: 'User denied permission request' });
            }
          });
        } else {
          resolve({ success: false, error: errorMessage });
        }
      } else {
        resolve({ success: true });
      }
    });
  });
}

// Keyboard shortcuts handling
chrome.commands.onCommand.addListener(async (command) => {
  console.log('COMMAND TRIGGERED:', command);
  if (command === 'capture_full_page') {
    const now = Date.now();
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      console.log('Capture rate limit hit, ignoring shortcut trigger');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {

      // Try to ping existing script first
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
        console.log('Script already active. Starting capture...');
        // Explicitly set isPopup: false for background capture
        chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
      } catch (error) {
        console.log('Script not found or orphaned. Injecting new instance...');

        // Try to inject script
        const injectResult = await injectScriptWithPermission(tab.id);
        if (injectResult.success) {
          // Script injected, give it a moment to initialize then trigger
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
          }, 100);
        } else {
          console.error('Failed to inject script:', injectResult.error);
        }
      }

    } else {
      console.warn('Cannot capture on this URL:', tab?.url);
    }
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle capture request from content script
  if (message.type === 'CAPTURE') {
    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureTime;

    // If we're trying to capture too quickly, delay the capture
    if (timeSinceLastCapture < MIN_CAPTURE_INTERVAL) {
      const delay = MIN_CAPTURE_INTERVAL - timeSinceLastCapture;
      setTimeout(() => {
        performCapture(sender.tab ? sender.tab.windowId : null, sendResponse);
      }, delay);
    } else {
      performCapture(sender.tab ? sender.tab.windowId : null, sendResponse);
    }

    return true; // Keep message channel open for async response
  }

  // Helper function to perform the actual capture
  function performCapture(windowId, sendResponse) {
    captureInProgress = true;
    lastCaptureTime = Date.now();

    // Use null as fallback to capture active tab in current window
    const targetWindowId = windowId || chrome.windows.WINDOW_ID_CURRENT;

    chrome.tabs.captureVisibleTab(
      targetWindowId,
      { format: 'png', quality: 100 },
      dataUrl => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          console.error('Capture failed:', errorMsg);
          
          captureInProgress = false;
          sendResponse({ error: errorMsg });
        } else {
          sendResponse(dataUrl);
        }
      }
    );
  }

  // Handle cancel request from popup
  if (message.type === 'CANCEL_CAPTURE') {
    captureInProgress = false;
    // Forward to content script in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_CAPTURE' }).catch(() => {
          // Ignore if script not present
        });
      }
    });
  }

  // Forward progress updates and capture complete message to popup
  if (message.type === 'PROGRESS' || message.type === 'CAPTURE_COMPLETE' ||
    message.type === 'CAPTURE_ERROR') {
    
    if (message.type === 'CAPTURE_COMPLETE') {
      captureInProgress = false;
      lastCaptureData = message.dataUrl;
      chrome.storage.local.set({ lastCaptureData: message.dataUrl });
    }

    if (message.type === 'CAPTURE_ERROR') {
      captureInProgress = false;
    }

    // ONLY forward to popup if the message came from a content script (sender.tab exists)
    // This prevents an infinite loop where the background script sends a message to itself
    if (sender.tab) {
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore error if popup is not open
      });
    }
  }

  // Handle request for last capture data from popup
  if (message.type === 'GET_LAST_CAPTURE') {
    if (lastCaptureData) {
      sendResponse(lastCaptureData);
    } else {
      chrome.storage.local.get(['lastCaptureData'], (result) => {
        sendResponse(result.lastCaptureData || null);
      });
      return true; // Keep channel open for async
    }
  }

  // Handle request to open popup from content script toast
  if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch((err) => {
      console.warn('Could not open popup from toast click:', err);
    });
  }
});

// Set up on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Screenshot Extension installed');

  // Create context menu items
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

// Context menu click handling
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'capture_full_page_context' ||
    info.menuItemId === 'capture_visible_area_context' ||
    info.menuItemId === 'capture_element_context') {

    const now = Date.now();
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      console.log('Capture rate limit hit, ignoring context menu trigger');
      return;
    }

    if (tab && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      let mode = 'FULL_PAGE';

      if (info.menuItemId === 'capture_visible_area_context') {
        mode = 'VISIBLE_AREA';
      } else if (info.menuItemId === 'capture_element_context') {
        mode = 'SELECTED_ELEMENT';
      }

      // Helper to initialize script and send message
      const startCaptureViaContext = async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
          console.log(`Script already active. Starting ${mode} capture...`);
          chrome.tabs.sendMessage(tab.id, {
            type: 'INIT_CAPTURE',
            isPopup: false,
            mode: mode
          });
        } catch (error) {
          console.log('Script not found or orphaned. Injecting new instance...');
          const injectResult = await injectScriptWithPermission(tab.id);
          if (injectResult.success) {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                type: 'INIT_CAPTURE',
                isPopup: false,
                mode: mode
              });
            }, 100);
          } else {
            console.error('Failed to inject script:', injectResult.error);
          }
        }
      };

      startCaptureViaContext();
    } else {
      console.warn('Cannot capture on this URL:', tab?.url);
    }
  }
});