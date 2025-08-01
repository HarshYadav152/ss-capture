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
  const spinner = document.getElementById('loadingSpinner');
  const statusText = document.getElementById('statusText');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const previewImage = document.getElementById('previewImage');
  
  // Reset state
  captureData = null;
  previewImage.style.display = 'none';
  previewImage.src = '';
  hideErrorAlert(); // Hide any existing errors
  
  try {
    // Update UI
    captureBtn.disabled = true;
    cancelBtn.style.display = 'block';
    saveBtn.style.display = 'none';
    spinner.style.display = 'block';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
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
    
    // Set a timeout to detect if the capture process gets stuck
    setTimeout(() => {
      if (captureInProgress) {
        showErrorAlert('Screenshot capture is taking too long. Please try again.');
        statusText.textContent = 'Capture timeout - please retry';
        resetUI();
      }
    }, 60000); // 60 second timeout
    
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
document.getElementById('saveBtn').addEventListener('click', () => {
  if (captureData) {
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = captureData;
    a.download = `screenshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    statusText.textContent = 'Screenshot saved successfully!';
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

// Listen for messages from content/background scripts
chrome.runtime.onMessage.addListener((message) => {
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const spinner = document.getElementById('loadingSpinner');
  const previewImage = document.getElementById('previewImage');
  const captureBtn = document.getElementById('captureBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  
  // Handle progress updates
  if (message.type === 'PROGRESS') {
    statusText.textContent = message.message;
    
    if (message.percentComplete !== null) {
      progressBar.style.width = `${message.percentComplete}%`;
    }
  }
  
  if (message.type === 'CAPTURE_COMPLETE') {
    captureInProgress = false;
    captureData = message.dataUrl;
    
    // Update UI
    spinner.style.display = 'none';
    captureBtn.disabled = false;
    cancelBtn.style.display = 'none';
    saveBtn.style.display = 'block';
    statusText.textContent = 'Screenshot complete! Click Save to download.';
    
    // Show preview
    if (captureData) {
      previewImage.src = captureData;
      previewImage.style.display = 'block';
    }
  }
  
  if (message.type === 'CAPTURE_ERROR') {
    resetUI();
    showErrorAlert(message.error);
    statusText.textContent = 'Screenshot capture failed';
  }
});