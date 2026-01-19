let captureData = null;
let captureInProgress = false;



function showErrorAlert(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorAlert').style.display = 'block';
}

function hideErrorAlert() {
  document.getElementById('errorAlert').style.display = 'none';
}

function resetUI() {
  captureInProgress = false;
  captureData = null;
  document.getElementById('statusText').textContent = 'Ready to capture';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressPercent').textContent = '';
  document.getElementById('previewImage').style.display = 'none';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('saveBtn').style.display = 'none';
  document.getElementById('copyBtn').style.display = 'none';
  document.getElementById('loadingSpinner').style.display = 'none';
}



// -------------------- Capture Start --------------------

async function startCapture(mode = 'FULL_PAGE') {
  hideErrorAlert();

  if (captureInProgress) {
    return;
  }

  captureInProgress = true;
  document.getElementById('statusText').textContent = 'Starting capture...';
  document.getElementById('loadingSpinner').style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    showErrorAlert('Cannot capture this page');
    resetUI();
    // Don't close popup - let user try again
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    try {
      chrome.runtime.sendMessage({ type: 'INIT_CAPTURE', mode, isPopup: true });
      // Keep popup open to receive results
    } catch (error) {
      console.error('Failed to send init capture message:', error);
      resetUI();
      showErrorAlert('Failed to start capture');
    }
  } catch {
    // Content script not loaded, try to inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/js/content.js', 'src/js/sessionPanel.js']
      });
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ type: 'INIT_CAPTURE', mode, isPopup: true });
          // Keep popup open to receive results
        } catch (error) {
          console.error('Failed to send init capture message after injection:', error);
          resetUI();
          showErrorAlert('Failed to start capture after loading scripts');
        }
      }, 100);
    } catch (error) {
      showErrorAlert('Failed to load extension on this page');
      resetUI();
      return;
    }
  }
}


// -------------------- Buttons --------------------


document.getElementById('saveBtn').onclick = async () => {
  if (!captureData) return;

  try {
    // Convert data URL to blob
    const response = await fetch(captureData);
    const blob = await response.blob();

    // Use chrome.downloads API to save to Downloads/Pictures folder
    const filename = `Pictures/screenshot-${Date.now()}.png`;

    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename,
      saveAs: false
    });

    showErrorAlert('Screenshot saved to Downloads/Pictures!');
    setTimeout(() => hideErrorAlert(), 3000);
  } catch (error) {
    console.error('Failed to save screenshot:', error);
    showErrorAlert('Failed to save screenshot');
  }
};

document.getElementById('copyBtn').onclick = async () => {
  const blob = await (await fetch(captureData)).blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
};

document.getElementById('captureBtn').onclick = () => startCapture('FULL_PAGE');
document.getElementById('visibleAreaBtn').onclick = () => startCapture('VISIBLE_AREA');
document.getElementById('selectElementBtn').onclick = () => startCapture('SELECT_ELEMENT');
document.getElementById('cancelBtn').onclick = resetUI;

document.getElementById('errorClose').onclick = hideErrorAlert;

chrome.runtime.onMessage.addListener((message) => {
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const previewDimensions = document.getElementById('previewDimensions');
  const saveBtn = document.getElementById('saveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const spinner = document.getElementById('loadingSpinner');

  if (message.type === 'PROGRESS') {
    statusText.textContent = message.message;
    if (message.percentComplete != null) {
      progressBar.style.width = `${message.percentComplete}%`;
      progressPercent.textContent = `${message.percentComplete}%`;
    }
  }

  if (message.type === 'CAPTURE_COMPLETE') {
    captureInProgress = false;
    captureData = message.dataUrl;

    spinner.style.display = 'none';
    saveBtn.style.display = 'flex';
    copyBtn.style.display = 'flex';
    statusText.textContent = 'Screenshot complete!';

    // Validate data URL before setting src
    if (!captureData || typeof captureData !== 'string' || !captureData.startsWith('data:image/')) {
      console.error('Invalid image data received:', captureData);
      showErrorAlert('Invalid image data received');
      resetUI();
      return;
    }

    // Additional validation for data URL format
    try {
      const url = new URL(captureData);
      if (!url.protocol.startsWith('data:') || !url.pathname.startsWith('image/')) {
        throw new Error('Invalid data URL format');
      }
    } catch (error) {
      console.error('Data URL validation failed:', error);
      showErrorAlert('Invalid image data format received');
      resetUI();
      return;
    }

    // Check if data URL has actual image data (not just "data:image/png,")
    if (captureData.length < 100) { // Very short data URLs are likely invalid
      console.error('Image data too short, likely invalid:', captureData.substring(0, 50) + '...');
      showErrorAlert('Captured image data appears to be invalid');
      resetUI();
      return;
    }

    previewImage.src = captureData;
    previewImage.onload = () => {
      previewDimensions.textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
    };
    previewImage.style.display = 'block';
    previewContainer.style.display = 'block';


  }

  if (message.type === 'CAPTURE_ERROR') {
    showErrorAlert(message.error);
    resetUI();
  }
});
