// Global variable to track capture state
let captureInProgress = false;
let captureData = null;

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

// Show error alert function
function showErrorAlert(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');

  errorMessage.textContent = message;
  errorAlert.style.display = 'block';
}

// Hide error alert function
function hideErrorAlert() {
  document.getElementById('errorAlert').style.display = 'none';
}

async function startCapture(mode = 'FULL_PAGE') {
  const captureBtn = document.getElementById('captureBtn');
  const visibleAreaBtn = document.getElementById('visibleAreaBtn');
  const selectElementBtn = document.getElementById('selectElementBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const spinner = document.getElementById('loadingSpinner');
  const statusText = document.getElementById('statusText');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');

  // Reset state
  captureData = null;
  previewImage.style.display = 'none';
  previewContainer.style.display = 'none';
  previewImage.src = '';
  hideErrorAlert();

  try {
    // Update UI
    captureBtn.disabled = true;
    visibleAreaBtn.disabled = true;
    selectElementBtn.disabled = true;

    cancelBtn.style.display = 'flex';
    saveBtn.style.display = 'none';
    copyBtn.style.display = 'none';
    spinner.style.display = 'block';

    if (mode === 'FULL_PAGE') {
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      progressPercent.textContent = '0%';
      statusText.textContent = 'Preparing to capture full page...';
    } else if (mode === 'VISIBLE_AREA') {
      statusText.textContent = 'Capturing visible area...';
    } else if (mode === 'SELECTED_ELEMENT') {
      statusText.textContent = 'Select an element on the page...';
    }

    // Set flag
    captureInProgress = true;

    // Get current tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we can inject scripts into this tab
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot capture screenshots on this page type');
    }

    // Execute the content script
    const injectResult = await injectScriptWithPermission(tab.id);
    if (!injectResult.success) {
      throw new Error(injectResult.error);
    }

    // Trigger capture explicitly with mode
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', mode, isPopup: true });

    // Set a timeout for very long captures
    const timeout = mode === 'FULL_PAGE' ? 120000 : 30000;
    setTimeout(() => {
      if (captureInProgress) {
        showErrorAlert('Screenshot capture timed out.');
        statusText.textContent = 'Capture timeout - please retry';
        resetUI();
      }
    }, timeout);

  } catch (error) {
    showErrorAlert(error.message);
    statusText.textContent = 'Failed to start capture';
    console.error(error);
    resetUI();
  }
}

document.getElementById('captureBtn').addEventListener('click', () => startCapture('FULL_PAGE'));
document.getElementById('visibleAreaBtn').addEventListener('click', () => startCapture('VISIBLE_AREA'));
document.getElementById('selectElementBtn').addEventListener('click', () => startCapture('SELECTED_ELEMENT'));

// Cancel button handler
document.getElementById('cancelBtn').addEventListener('click', () => {
  if (captureInProgress) {
    chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
    statusText.textContent = 'Screenshot capture cancelled';
    resetUI();
  }
});

// Save button handler
document.getElementById('saveBtn').addEventListener('click', async () => {
  if (captureData) {
    const a = document.createElement('a');
    a.href = captureData;
    a.download = `screenshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    document.getElementById('statusText').textContent = 'Screenshot saved successfully!';
  } else {
    showErrorAlert('No screenshot data available');
  }
});

// Copy button handler
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (captureData) {
    try {
      // Convert base64 to blob
      const res = await fetch(captureData);
      const blob = await res.blob();

      // Write to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      const statusText = document.getElementById('statusText');
      statusText.textContent = 'Screenshot copied to clipboard!';

      // Visual feedback
      const originalText = document.querySelector('#copyBtn .btn-text').textContent;
      document.querySelector('#copyBtn .btn-text').textContent = 'Copied!';
      setTimeout(() => {
        document.querySelector('#copyBtn .btn-text').textContent = originalText;
      }, 2000);

    } catch (err) {
      console.error('Failed to copy: ', err);
      showErrorAlert('Failed to copy to clipboard');
    }
  } else {
    showErrorAlert('No screenshot data available');
  }
});

// Error alert close button handler
document.getElementById('errorClose').addEventListener('click', hideErrorAlert);

// Reset UI to initial state
function resetUI() {
  captureInProgress = false;
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('visibleAreaBtn').disabled = false;
  document.getElementById('selectElementBtn').disabled = false;
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('progressContainer').style.display = 'none';
}

// Initialize popup
async function initPopup() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_LAST_CAPTURE' });
  if (response) {
    displayCapture(response);
  }
}

function displayCapture(dataUrl) {
  const statusText = document.getElementById('statusText');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const previewDimensions = document.getElementById('previewDimensions');
  const saveBtn = document.getElementById('saveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const editBtn = document.getElementById('editBtn');

  captureData = dataUrl;
  saveBtn.style.display = 'flex';
  copyBtn.style.display = 'flex';
  editBtn.style.display = 'flex';
  statusText.textContent = 'Screenshot ready! Click Save to download or Edit to hide sensitive info.';

  try {
    const img = new Image();
    img.onload = function () {
      previewDimensions.textContent = `${this.width} × ${this.height}px`;
    };
    img.src = dataUrl;

    previewImage.src = dataUrl;
    previewImage.style.display = 'block';
    previewContainer.style.display = 'block';
  } catch (error) {
    console.warn('Could not display preview:', error);
  }
}

// Edit button handler - opens privacy editor
document.getElementById('editBtn').addEventListener('click', () => {
  if (captureData) {
    // Store screenshot data for editor
    localStorage.setItem('screenshotForEdit', captureData);

    // Open editor in new window
    chrome.windows.create({
      url: chrome.runtime.getURL('/editor/editor.html'),
      type: 'popup',
      width: 1200,
      height: 800
    });

    document.getElementById('statusText').textContent = 'Editor opened - Apply blur/pixelate effects to hide sensitive info';
  } else {
    showErrorAlert('No screenshot data available to edit');
  }
});

initPopup();

// Listen for messages from content/background scripts
chrome.runtime.onMessage.addListener((message) => {
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const spinner = document.getElementById('loadingSpinner');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const previewDimensions = document.getElementById('previewDimensions');
  const captureBtn = document.getElementById('captureBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const progressContainer = document.getElementById('progressContainer');

  // Handle progress updates
  if (message.type === 'PROGRESS') {
    statusText.textContent = message.message;

    if (message.percentComplete !== null) {
      progressBar.style.width = `${message.percentComplete}%`;
      progressPercent.textContent = `${message.percentComplete}%`;
    }
  }

  if (message.type === 'CAPTURE_COMPLETE') {
    captureInProgress = false;
    resetUI();
    displayCapture(message.dataUrl);

    // Hide progress after 2 seconds
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 2000);
  }

  // Handle edited screenshot from editor
  if (message.type === 'EDITOR_COMPLETE') {
    captureData = message.dataUrl;
    const previewImage = document.getElementById('previewImage');
    previewImage.src = message.dataUrl;
    statusText.textContent = 'Screenshot edited! Privacy effects applied. Click Save to download.';
  }

  if (message.type === 'CAPTURE_ERROR') {
    resetUI();
    showErrorAlert(message.error);
    statusText.textContent = 'Screenshot capture failed';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  // Initialize theme on page load
  const initTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', initTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
});
