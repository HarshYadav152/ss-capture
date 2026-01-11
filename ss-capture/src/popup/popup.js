let captureInProgress = false;
let captureData = null;

// -------------------- Helpers --------------------

function showErrorAlert(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorAlert').style.display = 'block';
}

function hideErrorAlert() {
  document.getElementById('errorAlert').style.display = 'none';
}

function resetUI() {
  captureInProgress = false;
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('visibleAreaBtn').disabled = false;
  document.getElementById('selectElementBtn').disabled = false;
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('progressContainer').style.display = 'none';
}

// Create thumbnail helper
function createThumbnail(dataUrl, maxWidth = 320) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.src = dataUrl;
  const scale = maxWidth / img.width;

  canvas.width = maxWidth;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// -------------------- Capture Start --------------------

async function startCapture(mode = 'FULL_PAGE') {
  hideErrorAlert();

  const statusText = document.getElementById('statusText');
  const spinner = document.getElementById('loadingSpinner');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');

  captureInProgress = true;
  captureData = null;

  document.getElementById('captureBtn').disabled = true;
  document.getElementById('visibleAreaBtn').disabled = true;
  document.getElementById('selectElementBtn').disabled = true;
  document.getElementById('cancelBtn').style.display = 'flex';
  spinner.style.display = 'block';

  if (mode === 'FULL_PAGE') {
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    statusText.textContent = 'Preparing to capture full page...';
  } else if (mode === 'VISIBLE_AREA') {
    statusText.textContent = 'Capturing visible area...';
  } else {
    statusText.textContent = 'Select an element on the page...';
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://')) {
    showErrorAlert('Cannot capture this page');
    resetUI();
    return;
  }

  chrome.runtime.sendMessage({ type: 'INIT_CAPTURE', mode, isPopup: true });

  setTimeout(() => {
    if (captureInProgress) {
      showErrorAlert('Screenshot capture timed out');
      resetUI();
    }
  }, mode === 'FULL_PAGE' ? 120000 : 30000);
}

// -------------------- Buttons --------------------

document.getElementById('captureBtn').onclick = () => startCapture('FULL_PAGE');
document.getElementById('visibleAreaBtn').onclick = () => startCapture('VISIBLE_AREA');
document.getElementById('selectElementBtn').onclick = () => startCapture('SELECTED_ELEMENT');

document.getElementById('cancelBtn').onclick = () => {
  chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  resetUI();
};

document.getElementById('saveBtn').onclick = () => {
  if (!captureData) return;
  const a = document.createElement('a');
  a.href = captureData;
  a.download = `screenshot-${Date.now()}.png`;
  a.click();
};

document.getElementById('copyBtn').onclick = async () => {
  const blob = await (await fetch(captureData)).blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
};

document.getElementById('errorClose').onclick = hideErrorAlert;

// -------------------- Messages --------------------

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

    previewImage.src = captureData;
    previewImage.style.display = 'block';
    previewContainer.style.display = 'block';

    const img = new Image();
    img.onload = () => {
      previewDimensions.textContent = `${img.width} × ${img.height}px`;
      const thumbnail = createThumbnail(captureData);
      chrome.runtime.sendMessage({
        type: 'ADD_SESSION_SCREENSHOT',
        dataUrl: captureData,
        thumbnail,
        filename: `screenshot-${Date.now()}.png`
      });
    };
    img.src = captureData;
  }

  if (message.type === 'CAPTURE_ERROR') {
    showErrorAlert(message.error);
    resetUI();
  }
});
