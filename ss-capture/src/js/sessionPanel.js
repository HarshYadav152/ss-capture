(function () {
  if (window.__SS_CAPTURE_PANEL_INSTALLED) return;
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

    const container = el('div', { id: PANEL_ID, class: 'ss-panel collapsed', role: 'region', 'aria-label': 'Session screenshots' });
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
    document.body.appendChild(container);

    toggle.addEventListener('click', () => {
      const collapsed = container.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      content.setAttribute('aria-hidden', String(collapsed));
    });

    clearBtn.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'CLEAR_SESSION_SCREENSHOTS' }, () => {
          refresh();
        });
      } else {
        // Non-extension environments (tests) - just refresh
        refresh();
      }
    });

    return container;
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return document.getElementById(MODAL_ID);
    const overlay = el('div', { id: MODAL_ID, class: 'ss-modal', 'aria-hidden': 'true', role: 'dialog' });
    const wrapper = el('div', { class: 'ss-modal-content' });
    const close = el('button', { id: 'ss-modal-close', class: 'ss-modal-close' }); close.innerHTML = '&times;';
    const toolbar = el('div', { class: 'ss-modal-toolbar' });
    const download = el('button', { id: 'ss-modal-download', class: 'btn small' }); download.textContent = 'Download';
    const copy = el('button', { id: 'ss-modal-copy', class: 'btn small' }); copy.textContent = 'Copy';
    const del = el('button', { id: 'ss-modal-delete', class: 'btn small danger' }); del.textContent = 'Delete';
    toolbar.appendChild(download); toolbar.appendChild(copy); toolbar.appendChild(del);
    const imgWrap = el('div', { class: 'ss-modal-image-wrapper' });
    const img = el('img', { id: 'ss-modal-image', alt: 'Screenshot' });
    const info = el('div', { id: 'ss-modal-info', class: 'ss-modal-info' });
    imgWrap.appendChild(img);
    imgWrap.appendChild(info);
    wrapper.appendChild(close);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(imgWrap);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    close.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    download.addEventListener('click', () => {
      const imgEl = document.getElementById('ss-modal-image');
      const filename = (imgEl.dataset.filename) || `screenshot-${Date.now()}.png`;
      const a = document.createElement('a');
      a.href = imgEl.src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    copy.addEventListener('click', async () => {
      const imgEl = document.getElementById('ss-modal-image');
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
      const imgEl = document.getElementById('ss-modal-image');
      const id = imgEl.dataset.id;
      if (!id) return;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'DELETE_SESSION_SCREENSHOT', id }, () => {
          closeModal();
          refresh();
        });
      } else {
        // Test/non-extension environment: just close and refresh (fetchItems will return [] here)
        closeModal();
        refresh();
      }
    });

    return overlay;
  }

  function showModalInfo(text) {
    const info = document.getElementById('ss-modal-info');
    if (!info) return;
    info.textContent = text;
    setTimeout(() => { info.textContent = ''; }, 2000);
  }

  function openModalForItem(item) {
    const modal = createModal();
    const overlay = document.getElementById(MODAL_ID);
    const img = document.getElementById('ss-modal-image');
    img.src = item.dataUrl;
    img.dataset.id = item.id;
    img.dataset.filename = item.filename || `screenshot-${Date.now()}.png`;
    document.getElementById('ss-modal-info').textContent = `${item.filename || img.dataset.filename} • ${new Date(item.timestamp).toLocaleString()}`;
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    const img = document.getElementById('ss-modal-image'); if (img) img.src = '';
  }

  async function fetchItems() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      // In test or non-extension environments, there is no runtime to query
      return [];
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SESSION_SCREENSHOTS' }, (res) => {
        resolve(res || []);
      });
    });
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

  // Create UI and initial fetch
  createPanel(); createModal(); refresh();

  // Small keyboard handler to close modal with Esc
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });
})();
