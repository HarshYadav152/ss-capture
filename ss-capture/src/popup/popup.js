let captureData = null;
let captureInProgress = false;

// Global functions that will be defined after DOM loads
let showErrorAlert, hideErrorAlert, resetUI, startCapture;

// Extract handlers (required)
async function handleSave() {
  if (!captureData) return;

  try {
    const response = await fetch(captureData);
    const blob = await response.blob();

    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `Pictures/screenshot-${Date.now()}.png`,
      saveAs: false
    });

    showErrorAlert('Screenshot saved to Downloads/Pictures!');
    setTimeout(hideErrorAlert, 3000);
  } catch (error) {
    console.error('Failed to save screenshot:', error);
    showErrorAlert('Failed to save screenshot');
  }
}

async function handleCopy() {
  if (!captureData) return;

  const blob = await (await fetch(captureData)).blob();
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
}

// Wrap ALL DOM access in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const errorMessage = document.getElementById('errorMessage');
  const errorAlert = document.getElementById('errorAlert');
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const previewDimensions = document.getElementById('previewDimensions');
  const saveBtn = document.getElementById('saveBtn');
  const copyBtn = document.getElementById('copyBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Define functions that access DOM
  showErrorAlert = (message) => {
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
  };

  hideErrorAlert = () => {
    errorAlert.style.display = 'none';
  };

  resetUI = () => {
    captureInProgress = false;
    captureData = null;
    statusText.textContent = 'Ready to capture';
    progressBar.style.width = '0%';
    progressPercent.textContent = '';
    previewImage.style.display = 'none';
    previewContainer.style.display = 'none';
    saveBtn.style.display = 'none';
    copyBtn.style.display = 'none';
    loadingSpinner.style.display = 'none';
  };

  startCapture = async (mode = 'FULL_PAGE') => {
    hideErrorAlert();

    if (captureInProgress) {
      return;
    }

    captureInProgress = true;
    statusText.textContent = 'Starting capture...';
    loadingSpinner.style.display = 'block';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showErrorAlert('Cannot capture this page');
      resetUI();
      // Don't close popup - let user try again
      return;
    }

    if (mode === 'VISIBLE_AREA') {
      // Use chrome.tabs.captureVisibleTab for visible area
      try {
        const res = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
        if (res?.dataUrl) {
          captureData = res.dataUrl;
          captureInProgress = false;
          loadingSpinner.style.display = 'none';
          saveBtn.style.display = 'flex';
          copyBtn.style.display = 'flex';
          statusText.textContent = 'Screenshot complete!';

          // Add to session store via background to content
          chrome.runtime.sendMessage({
            type: 'SCREENSHOT_CAPTURED',
            dataUrl: captureData,
            filename: `visible-area-${Date.now()}.png`
          });

          // Show preview
          previewImage.src = captureData;
          previewImage.onload = () => {
            previewDimensions.textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
          };
          previewImage.style.display = 'block';
          previewContainer.style.display = 'block';
        } else {
          throw new Error('No data URL received');
        }
      } catch (error) {
        console.error('Visible area capture failed:', error);
        showErrorAlert('Failed to capture visible area');
        resetUI();
      }
    } else {
      // Use content script for full page and element capture
      try {
        chrome.runtime.sendMessage({ type: 'INIT_CAPTURE', mode, isPopup: true });
        // Keep popup open to receive results
      } catch (error) {
        console.error('Failed to send init capture message:', error);
        resetUI();
        showErrorAlert('Failed to start capture');
      }
    }
  };

  // -------------------- Buttons --------------------

  // Safe button binding with guards
  const saveBtnEl = document.getElementById('saveBtn');
  const copyBtnEl = document.getElementById('copyBtn');
  const fullPageBtnEl = document.getElementById('fullPageBtn');
  const visibleAreaBtnEl = document.getElementById('visibleAreaBtn');
  const selectElementBtnEl = document.getElementById('selectElementBtn');
  const cancelBtnEl = document.getElementById('cancelBtn');
  const editBtnEl = document.getElementById('editBtn');
  const errorCloseEl = document.getElementById('errorClose');

  if (saveBtnEl) saveBtnEl.onclick = handleSave;
  if (copyBtnEl) copyBtnEl.onclick = handleCopy;
  if (fullPageBtnEl) fullPageBtnEl.onclick = () => startCapture('FULL_PAGE');
  if (visibleAreaBtnEl) visibleAreaBtnEl.onclick = () => startCapture('VISIBLE_AREA');
  if (selectElementBtnEl) selectElementBtnEl.onclick = () => startCapture('SELECTED_ELEMENT');
  if (cancelBtnEl) {
    cancelBtnEl.onclick = () => {
      resetUI();
      chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
    };
  }
  if (editBtnEl) {
    editBtnEl.onclick = () => {
      if (!captureData) return;
      chrome.runtime.sendMessage({
        type: 'OPEN_EDITOR',
        dataUrl: captureData
      });
    };
  }
  if (errorCloseEl) errorCloseEl.onclick = hideErrorAlert;

  // Cleanup on popup close
  window.addEventListener('unload', () => {
    chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  });
});



