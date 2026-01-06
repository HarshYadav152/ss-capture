// Global variable to track capture state
let captureInProgress = false;
let captureData = null;

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

document.getElementById('captureBtn').addEventListener('click', async () => {
  const captureBtn = document.getElementById('captureBtn');
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
  const previewDimensions = document.getElementById('previewDimensions');

  // Reset state
  captureData = null;
  previewImage.style.display = 'none';
  previewContainer.style.display = 'none';
  previewImage.src = '';
  hideErrorAlert();

  try {
    // Update UI
    captureBtn.disabled = true;
    cancelBtn.style.display = 'flex';
    captureBtn.disabled = true;
    cancelBtn.style.display = 'flex';
    saveBtn.style.display = 'none';
    copyBtn.style.display = 'none';
    spinner.style.display = 'block';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    statusText.textContent = 'Preparing to capture screenshot...';

    // Set flag
    captureInProgress = true;

    // Get current tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we can inject scripts into this tab
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot capture screenshots on this page type');
    }

    // Execute the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Trigger capture explicitly
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', isPopup: true });

    // Set a timeout for very long captures (increased for chunking)
    setTimeout(() => {
      if (captureInProgress) {
        showErrorAlert('Screenshot capture is taking too long. The page may be extremely large.');
        statusText.textContent = 'Capture timeout - please retry';
        resetUI();
      }
    }, 120000); // 120 second timeout for large pages

  } catch (error) {
    showErrorAlert(error.message);
    statusText.textContent = 'Failed to start capture';
    console.error(error);
    resetUI();
  }
});

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
    try {
      // Get current tab to retrieve site URL
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Extract filename from URL
      let url = new URL(tab.url);
      let filename = url.hostname || 'screenshot';
      
      // Remove www. prefix if present
      if (filename.startsWith('www.')) {
        filename = filename.substring(4);
      }
      
      // Replace dots and slashes with hyphens for better filename compatibility
      filename = filename.replace(/[\.\/\?#&=]/g, '-').replace(/\s+/g, ' ').trim();
      // Remove trailing hyphens
      filename = filename.replace(/-+$/, '');
      
      const a = document.createElement('a');
      a.href = captureData;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      document.getElementById('statusText').textContent = 'Screenshot saved successfully!';
    } catch (error) {
      console.error('Error saving screenshot:', error);
      showErrorAlert('Failed to save screenshot');
    }
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

  captureData = dataUrl;
  saveBtn.style.display = 'flex';
  statusText.textContent = 'Screenshot ready! Click Save to download.';

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

  if (message.type === 'CAPTURE_ERROR') {
    resetUI();
    showErrorAlert(message.error);
    statusText.textContent = 'Screenshot capture failed';
  }
});