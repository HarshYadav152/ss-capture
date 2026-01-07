// CommonJS core implementation for session store (used by tests)
const MAX_SESSION_ITEMS = 20;
let sessionScreenshots = [];
let notifier = null;

function setNotifier(fn) {
  notifier = fn;
}

function addScreenshot(input) {
  // input can be a string (dataUrl) or an object { dataUrl, thumbnail, filename }
  const dataUrl = (typeof input === 'string') ? input : input.dataUrl;
  const thumbnail = (typeof input === 'string') ? null : input.thumbnail || null;
  const filename = (typeof input === 'string') ? `screenshot-${Date.now()}.png` : (input.filename || `screenshot-${Date.now()}.png`);
  const timestamp = new Date().toISOString();
  const id = `ss-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const item = { id, timestamp, dataUrl, filename };
  if (thumbnail) item.thumbnail = thumbnail;
  sessionScreenshots.unshift(item);
  if (sessionScreenshots.length > MAX_SESSION_ITEMS) {
    sessionScreenshots.length = MAX_SESSION_ITEMS;
  }
  if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
  return item;
}

function getScreenshots() {
  // return shallow copy
  return sessionScreenshots.slice();
}

function deleteScreenshot(id) {
  const idx = sessionScreenshots.findIndex(s => s.id === id);
  if (idx !== -1) {
    sessionScreenshots.splice(idx, 1);
    if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
    return true;
  }
  return false;
}

function clearScreenshots() {
  sessionScreenshots.length = 0;
  if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
}

function setScreenshots(items) {
  if (!Array.isArray(items)) return;
  sessionScreenshots.length = 0;
  // shallow copy
  items.forEach(it => sessionScreenshots.push(it));
  if (typeof notifier === 'function') notifier({ type: 'SESSION_UPDATED' });
}

// Test helper
function _resetForTests() {
  sessionScreenshots.length = 0;
  notifier = null;
}

module.exports = {
  addScreenshot,
  getScreenshots,
  deleteScreenshot,
  clearScreenshots,
  setScreenshots,
  setNotifier,
  _resetForTests
};
