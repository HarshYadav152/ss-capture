// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.type === 'CAPTURE') {
//     chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, sendResponse);
//     return true; // Keep the message channel open for sendResponse
//   }
// });

// Track capture state
let captureInProgress = false;
let lastCaptureTime = 0;
const MIN_CAPTURE_INTERVAL = 600; // Minimum 600ms between captures (ensures < 2 calls per second)

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
    // Send cancel message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'CANCEL'}).catch(() => {
          // Ignore errors if content script is not available
        });
      }
    });
  }
  
  // Forward progress updates and capture complete message to popup
  if (message.type === 'PROGRESS' || message.type === 'CAPTURE_COMPLETE' || 
      message.type === 'CAPTURE_ERROR') {
    if (message.type === 'CAPTURE_COMPLETE' || message.type === 'CAPTURE_ERROR') {
      captureInProgress = false;
    }
    chrome.runtime.sendMessage(message);
  }
});

// Set up on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Screenshot Extension installed');
});