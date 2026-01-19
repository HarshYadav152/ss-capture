// State
let lastCaptureTime = 0, lastCaptureData = null;
const MIN_CAPTURE_INTERVAL = 600, MAX_SESSION_ITEMS = 20;
let sessionScreenshots = [], notifier = null;


// Init from storage
chrome.storage.local.get(['lastCaptureData'], (r) => r?.lastCaptureData && (lastCaptureData = r.lastCaptureData));

// Check content script connection
async function checkConnection(tabId, timeout = 10000) {
  return new Promise((resolve) => {
    const tid = setTimeout(() => resolve({ connected: false, error: 'Timeout' }), timeout);
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      clearTimeout(tid);
      resolve(chrome.runtime.lastError ? { connected: false, error: chrome.runtime.lastError.message } :
               response === 'PONG' ? { connected: true } : { connected: false, error: 'Invalid response' });
    });
  });
}

// Inject scripts with permission handling
async function injectScripts(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript({ target: { tabId }, files: ['content.js', 'sessionPanel.js'] }, async () => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message;
        if (msg.includes('permission') || msg.includes('access')) {
          chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
            if (!granted) return resolve({ success: false, error: 'Permission denied' });
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js', 'sessionPanel.js'] }, async () => {
              const conn = await checkConnection(tabId);
              resolve(conn.connected ? { success: true } : { success: false, error: `Connection failed: ${conn.error}` });
            });
          });
        } else resolve({ success: false, error: msg });
      } else {
        const conn = await checkConnection(tabId);
        resolve(conn.connected ? { success: true } : { success: false, error: `Connection failed: ${conn.error}` });
      }
    });
  });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'capture_full_page') return;
  const now = Date.now();
  if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false });
  } catch {
    const injected = await injectScripts(tab.id);
    if (injected.success) setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false }), 100);
  }
});

function setNotifier(fn) {
  notifier = fn;
}

function addScreenshot(i) {
  const d = typeof i === 'string' ? i : i.dataUrl, t = typeof i === 'string' ? null : i.thumbnail || null, f = typeof i === 'string' ? `screenshot-${Date.now()}.png` : i.filename || `screenshot-${Date.now()}.png`;
  const item = { id: `ss-${Date.now()}-${Math.floor(Math.random()*10000)}`, timestamp: new Date().toISOString(), dataUrl: d, filename: f };
  if (t) item.thumbnail = t;
  sessionScreenshots.unshift(item);
  if (sessionScreenshots.length > MAX_SESSION_ITEMS) sessionScreenshots.length = MAX_SESSION_ITEMS;
  if (notifier) notifier({ type: 'SESSION_UPDATED' });
  return item;
}

function getScreenshots() { return sessionScreenshots.slice(); }
function deleteScreenshot(id) { const idx = sessionScreenshots.findIndex(s => s.id === id); if (idx !== -1) { sessionScreenshots.splice(idx, 1); if (notifier) notifier({ type: 'SESSION_UPDATED' }); return true; } return false; }
function clearScreenshots() { sessionScreenshots.length = 0; if (notifier) notifier({ type: 'SESSION_UPDATED' }); }
function setScreenshots(items) { if (!Array.isArray(items)) return; sessionScreenshots.length = 0; items.forEach(it => sessionScreenshots.push(it)); if (notifier) notifier({ type: 'SESSION_UPDATED' }); }



// Notify UIs on session updates
setNotifier((msg) => {
  // Only try to send to popup if it's likely open (recent activity)
  // Don't use sendMessageWithRetry here as it can cause connection errors
  try {
    chrome.runtime.sendMessage(msg).catch(() => {
      // Ignore errors - popup might be closed
    });
  } catch (error) {
    // Ignore connection errors
  }

  if (msg?.type === 'SESSION_UPDATED') {
    const area = chrome.storage.session || chrome.storage.local;
    area.set({ sessionScreenshots: getScreenshots() });
  }
});

// Load persisted session
(() => {
  const area = chrome.storage.session || chrome.storage.local;
  area.get(['sessionScreenshots'], (res) => {
    if (Array.isArray(res?.sessionScreenshots)) {
      setScreenshots(res.sessionScreenshots);
    }
  });
})();

// Messages
chrome.runtime.onMessage.addListener(async (m, s, r) => {
  if (m.type === 'INIT_CAPTURE') {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (t) try { chrome.tabs.sendMessage(t.id, m); } catch (e) { console.error('Failed to send init capture message:', e); }
  // Removed CAPTURE_REQUEST handling - now handled entirely by content script
  } else if (m.type === 'CAPTURE') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => {
      if (!t || !t.url || t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://')) { r({ error: 'Cannot capture this page. Please try on a regular web page.' }); return; }
      const n = Date.now(), d = Math.max(0, MIN_CAPTURE_INTERVAL - (n - lastCaptureTime));
      setTimeout(() => {
        lastCaptureTime = Date.now();
        let c = 0, mr = 5, bd = 1000;
        const a = () => chrome.tabs.captureVisibleTab(t.id, { format: 'png' }, (u) => {
          if (chrome.runtime.lastError) {
            c++; console.warn(`Capture attempt ${c} failed:`, chrome.runtime.lastError.message);
            if (c >= mr) { r({ error: chrome.runtime.lastError.message }); return; }
            setTimeout(a, bd * Math.pow(2, c - 1));
          } else if (!u || typeof u !== 'string' || !u.startsWith('data:image/png;base64,') || u.length < 100) {
            c++; console.warn(`Capture attempt ${c} failed: invalid image data`);
            if (c >= mr) { r({ error: 'Failed to capture screenshot - invalid image data' }); return; }
            setTimeout(a, bd * Math.pow(2, c - 1));
          } else if (typeof u !== 'string' || !u.startsWith('data:image/')) {
            c++; console.warn(`Capture attempt ${c} failed: invalid data URL format`);
            if (c >= mr) { r({ error: 'Invalid image data received' }); return; }
            setTimeout(a, bd * Math.pow(2, c - 1));
          } else r(u);
        });
        a();
      }, d);
    });
    return true;
  } else if (m.type === 'CANCEL_CAPTURE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_CAPTURE' }); });
  } else if (m.type === 'GET_SESSION_SCREENSHOTS') { r(getScreenshots()); return true; }
  else if (m.type === 'DELETE_SESSION_SCREENSHOT') { r({ ok: deleteScreenshot(m.id) }); return true; }
  else if (m.type === 'CLEAR_SESSION_SCREENSHOTS') { clearScreenshots(); r({ ok: true }); return true; }
  else if (m.type === 'ADD_SESSION_SCREENSHOT') { addScreenshot(m); r({ ok: true }); return true; }
  else if (['PROGRESS', 'CAPTURE_COMPLETE', 'CAPTURE_ERROR'].includes(m.type)) {
    if (m.type === 'CAPTURE_COMPLETE') { lastCaptureData = m.dataUrl; chrome.storage.local.set({ lastCaptureData }); }
    try { chrome.runtime.sendMessage(m).catch(() => {}); } catch (e) { /* ignore */ }
  } else if (m.type === 'GET_LAST_CAPTURE') { r(lastCaptureData || null); return true; }
  else if (m.type === 'OPEN_POPUP') chrome.action.openPopup().catch(() => {});
});

// Install
chrome.runtime.onInstalled.addListener(() => {
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

// Context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

  let mode = 'FULL_PAGE';
  if (info.menuItemId === 'capture_visible_area_context') mode = 'VISIBLE_AREA';
  if (info.menuItemId === 'capture_element_context') mode = 'SELECTED_ELEMENT';

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false, mode });
    } catch (error) {
      console.error('Failed to send init capture message:', error);
    }
  } catch {
    const injected = await injectScripts(tab.id);
    if (injected.success) setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'INIT_CAPTURE', isPopup: false, mode }), 100);
  }
});
