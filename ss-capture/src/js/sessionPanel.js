(function () {
  if (window.__SS_CAPTURE_PANEL_INSTALLED && document.getElementById('ss-session-panel')) return;
  window.__SS_CAPTURE_PANEL_INSTALLED = true;

  const PANEL_ID = 'ss-session-panel';
  const MODAL_ID = 'ss-session-modal';

  function el(tag, props = {}, ...children) {
    const d = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') d.className = v;
      else if (k === 'html') d.innerHTML = v;
      else d.setAttribute(k, v);
    });
    children.forEach(c => { if (c) d.appendChild(c); });
    return d;
  }

  function createPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) return existing;

    // Create host element for Shadow DOM
    const host = el('div', { id: PANEL_ID });
    host.setAttribute('data-ss-capture-ui', 'true');
    host.style.position = 'fixed';
    host.style.top = '50%';
    host.style.right = '16px';
    host.style.transform = 'translateY(-50%)';
    host.style.zIndex = '2147483647';
    host.style.width = 'auto';
    host.style.height = 'auto';
    host.style.pointerEvents = 'auto';

    // Create Shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });

    // Create panel content inside Shadow DOM
    const container = el('div', { class: 'ss-panel collapsed', role: 'region', 'aria-label': 'Session screenshots' });
    container.style.all = 'initial';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const toggle = el('button', { id: 'ss-panel-toggle', class: 'ss-panel-toggle', 'aria-expanded': 'false' });
    toggle.textContent = 'Screenshots';

    const content = el('div', { id: 'ss-panel-content', class: 'ss-panel-content', 'aria-hidden': 'true' });
    const thumbs = el('div', { id: 'ss-panel-thumbs', class: 'ss-panel-thumbs', role: 'list' });
    const actions = el('div', { class: 'ss-panel-actions' });
    const clearBtn = el('button', { id: 'ss-panel-clear', class: 'btn small' });
    clearBtn.textContent = 'Clear';

    actions.appendChild(clearBtn);
    content.appendChild(thumbs);
    content.appendChild(actions);

    container.appendChild(toggle);
    container.appendChild(content);
    shadow.appendChild(container);

    document.documentElement.appendChild(host);

    toggle.addEventListener('click', () => {
      const collapsed = container.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      content.setAttribute('aria-hidden', String(collapsed));
    });

    clearBtn.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type: 'CLEAR_SESSION_SCREENSHOTS' }, () => {
            refresh();
          });
        } catch (error) {
          console.error('Failed to clear session screenshots:', error);
          refresh();
        }
      } else {
        // Non-extension environments (tests) - just refresh
        refresh();
      }
    });

    return container;
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return document.getElementById(MODAL_ID);

    // Create host element for Shadow DOM
    const host = el('div', { id: MODAL_ID });
    host.setAttribute('data-ss-capture-ui', 'true');
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'auto';

    // Create Shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });
    host._shadowRoot = shadow;

    const overlay = el('div', { class: 'ss-modal', 'aria-hidden': 'true', role: 'dialog' });
    overlay.style.all = 'initial';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2147483647';

    const wrapper = el('div', { class: 'ss-modal-content' });
    wrapper.style.all = 'initial';
    wrapper.style.background = 'white';
    wrapper.style.borderRadius = '8px';
    wrapper.style.padding = '20px';
    wrapper.style.maxWidth = '90vw';
    wrapper.style.maxHeight = '90vh';
    wrapper.style.overflow = 'auto';
    wrapper.style.position = 'relative';

    const close = el('button', { id: 'ss-modal-close', class: 'ss-modal-close' });
    close.innerHTML = '&times;';
    close.style.all = 'initial';
    close.style.position = 'absolute';
    close.style.top = '10px';
    close.style.right = '10px';
    close.style.background = 'none';
    close.style.border = 'none';
    close.style.fontSize = '24px';
    close.style.cursor = 'pointer';

    const toolbar = el('div', { class: 'ss-modal-toolbar' });
    toolbar.style.all = 'initial';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '10px';
    toolbar.style.marginBottom = '10px';

    const download = el('button', { id: 'ss-modal-download', class: 'btn small' });
    download.textContent = 'Download';
    download.style.all = 'initial';
    download.style.padding = '5px 10px';
    download.style.border = '1px solid #ccc';
    download.style.borderRadius = '4px';
    download.style.cursor = 'pointer';

    const copy = el('button', { id: 'ss-modal-copy', class: 'btn small' });
    copy.textContent = 'Copy';
    copy.style.all = 'initial';
    copy.style.padding = '5px 10px';
    copy.style.border = '1px solid #ccc';
    copy.style.borderRadius = '4px';
    copy.style.cursor = 'pointer';

    const del = el('button', { id: 'ss-modal-delete', class: 'btn small danger' });
    del.textContent = 'Delete';
    del.style.all = 'initial';
    del.style.padding = '5px 10px';
    del.style.border = '1px solid #ccc';
    del.style.borderRadius = '4px';
    del.style.cursor = 'pointer';
    del.style.background = '#ff4444';
    del.style.color = 'white';

    toolbar.appendChild(download);
    toolbar.appendChild(copy);
    toolbar.appendChild(del);

    const imgWrap = el('div', { class: 'ss-modal-image-wrapper' });
    imgWrap.style.all = 'initial';
    imgWrap.style.textAlign = 'center';

    const img = el('img', { id: 'ss-modal-image', alt: 'Screenshot' });
    img.style.all = 'initial';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '70vh';

    const info = el('div', { id: 'ss-modal-info', class: 'ss-modal-info' });
    info.style.all = 'initial';
    info.style.marginTop = '10px';
    info.style.fontSize = '14px';
    info.style.color = '#666';

    imgWrap.appendChild(img);
    imgWrap.appendChild(info);
    wrapper.appendChild(close);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(imgWrap);
    overlay.appendChild(wrapper);
    shadow.appendChild(overlay);

    document.documentElement.appendChild(host);

    close.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    download.addEventListener('click', () => {
      const modalHost = document.getElementById(MODAL_ID);
      const imgEl = modalHost?._shadowRoot?.getElementById('ss-modal-image');
      if (!imgEl) return;
      const filename = (imgEl.dataset.filename) || `screenshot-${Date.now()}.png`;
      const a = document.createElement('a');
      a.href = imgEl.src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    copy.addEventListener('click', async () => {
      const modalHost = document.getElementById(MODAL_ID);
      const imgEl = modalHost?._shadowRoot?.getElementById('ss-modal-image');
      if (!imgEl) return;
      try {
        const resp = await fetch(imgEl.src);
        const blob = await resp.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          showModalInfo('Copied to clipboard ✓');
        } else {
          await navigator.clipboard.writeText(imgEl.src);
          showModalInfo('Data URL copied to clipboard ✓');
        }
      } catch (e) {
        showModalInfo('Copy failed');
      }
    });

    del.addEventListener('click', async () => {
      const modalHost = document.getElementById(MODAL_ID);
      const imgEl = modalHost?._shadowRoot?.getElementById('ss-modal-image');
      if (!imgEl) return;
      const id = imgEl.dataset.id;
      if (!id) return;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type: 'DELETE_SESSION_SCREENSHOT', id }, () => {
            closeModal();
            refresh();
          });
        } catch (error) {
          console.error('Failed to delete session screenshot:', error);
          closeModal();
          refresh();
        }
      } else {
        // Test/non-extension environment: just close and refresh (fetchItems will return [] here)
        closeModal();
        refresh();
      }
    });

    return overlay;
  }

  function showModalInfo(text) {
    const modalHost = document.getElementById(MODAL_ID);
    const info = modalHost?._shadowRoot?.getElementById('ss-modal-info');
    if (!info) return;
    info.textContent = text;
    setTimeout(() => { info.textContent = ''; }, 2000);
  }

function openModalForItem(item) {
  createModal();
  const overlay = document.getElementById(MODAL_ID);
  const modalHost = document.getElementById(MODAL_ID);
  const img = modalHost?._shadowRoot?.getElementById('ss-modal-image');
  if (!img) return;
  img.src = item.dataUrl;
  img.dataset.id = item.id;
  img.dataset.filename = item.filename || `screenshot-${Date.now()}.png`;
  const info = modalHost?._shadowRoot?.getElementById('ss-modal-info');
  if (info) info.textContent = `${item.filename || img.dataset.filename} • ${new Date(item.timestamp).toLocaleString()}`;
  overlay.setAttribute('aria-hidden', 'false');
}

  function closeModal() {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    const modalHost = document.getElementById(MODAL_ID);
    const img = modalHost?._shadowRoot?.getElementById('ss-modal-image');
    if (img) img.src = '';
  }

  async function fetchItems() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_SESSION_SCREENSHOTS' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Failed to fetch session screenshots:', chrome.runtime.lastError);
              resolve([]);
            } else {
              resolve(response || []);
            }
          });
        });
      } catch (error) {
        console.error('Error fetching session screenshots:', error);
        return [];
      }
    } else {
      // Test environment or non-extension context
      return window.sessionScreenshots || [];
    }
  }

  const MAX_ITEMS_DISPLAY = 20;
  function renderItems(items) {
    const thumbs = document.getElementById('ss-panel-thumbs');
    if (!thumbs) return;
    thumbs.innerHTML = '';
    if (!items || items.length === 0) {
      const empty = el('div', { class: 'ss-panel-empty' }); empty.textContent = 'No screenshots in this session';
      thumbs.appendChild(empty);
      return;
    }

    // Limit items displayed to MAX_ITEMS_DISPLAY
    const displayItems = items.slice(0, MAX_ITEMS_DISPLAY);

    displayItems.forEach(item => {
      const box = el('div', { class: 'ss-thumb', role: 'listitem' });
      const src = item.thumbnail || item.dataUrl;
      const img = el('img', { src, alt: item.filename || 'screenshot' });
      const meta = el('div', { class: 'ss-thumb-meta' });
      meta.textContent = new Date(item.timestamp).toLocaleTimeString();
      box.appendChild(img);
      box.appendChild(meta);
      box.addEventListener('click', (e) => { e.stopPropagation(); openModalForItem(item); });
      thumbs.appendChild(box);
    });
  }

  async function refresh() {
    try {
      const items = await fetchItems();
      renderItems(items);
    } catch (e) {
      // ignore
    }
  }

  // Listen for session updates from background (guarded for test environments where `chrome` is undefined)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SESSION_UPDATED') {
        refresh().catch(() => {});
      }
    });
  }

  // Test hook: when ?ss-test=1 present, listen for window postMessage to inject items directly
  try {
    if (window.location.search && window.location.search.indexOf('ss-test=1') !== -1) {
      window.addEventListener('message', (ev) => {
        if (!ev.data || ev.data.type !== 'SS_TEST_ADD') return;
        (async () => {
          // Prepend item and re-render. In test env fetchItems() returns [], so maintain
          // a local in-memory list on window to simulate a session store for tests.
          const newItem = ev.data.item;
          // ensure timestamp/id
          if (!newItem.timestamp) newItem.timestamp = new Date().toISOString();
          if (!newItem.id) newItem.id = `test-${Date.now()}`;

          const items = await fetchItems();
          if (!items || items.length === 0) {
            window.__SS_TEST_ITEMS = window.__SS_TEST_ITEMS || [];
            window.__SS_TEST_ITEMS.unshift(newItem);
            window.__SS_TEST_ITEMS = window.__SS_TEST_ITEMS.slice(0, MAX_ITEMS_DISPLAY);
            renderItems(window.__SS_TEST_ITEMS);
          } else {
            items.unshift(newItem);
            renderItems(items);
          }
        })();
      });
    }
  } catch (e) {
    // ignore
  }

  // Export functions for external use (e.g., after capture)
  window.createSessionPanel = createPanel;
  window.createSessionModal = createModal;

  // Wait for DOM to be ready before creating UI
  function initPanel() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createPanel(); createModal(); refresh();
      });
    } else {
      createPanel(); createModal(); refresh();
    }
  }

  initPanel();

  // Small keyboard handler to close modal with Esc
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });
})();
