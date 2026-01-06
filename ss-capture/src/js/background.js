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

        // Inject script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Injection failed:', chrome.runtime.lastError.message);
          } else {
            // Script injected, give it a moment to initialize then trigger
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
            }, 100);
          }
        });
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
        performCapture(sender.tab.windowId, sendResponse);
      }, delay);
    } else {
      performCapture(sender.tab.windowId, sendResponse);
    }

    return true; // Keep message channel open for async response
  }

  // Helper function to perform the actual capture
  function performCapture(windowId, sendResponse) {
    captureInProgress = true;
    lastCaptureTime = Date.now();

    chrome.tabs.captureVisibleTab(
      windowId,
      { format: 'png', quality: 100 },
      dataUrl => {
        if (chrome.runtime.lastError) {
          captureInProgress = false;
          sendResponse({ error: chrome.runtime.lastError.message });
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
});