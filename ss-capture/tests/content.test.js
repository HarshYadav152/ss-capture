// Mock chrome API
global.chrome = {
  runtime: {
    getURL: jest.fn(),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock html2canvas
global.html2canvas = jest.fn();

// Mock crypto
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid')
};

// Mock Image
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
};

// Mock fetch
global.fetch = jest.fn();

// Setup basic DOM mocks to avoid JSDOM TextEncoder issues
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  postMessage: jest.fn(),
  html2canvas: undefined,
  devicePixelRatio: 1
};

global.document = {
  createElement: jest.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
      remove: jest.fn(),
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn()
      },
      addEventListener: jest.fn(),
      click: jest.fn(),
      querySelector: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100, top: 0, left: 0 }))
    };
    return element;
  }),
  documentElement: {
    appendChild: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    style: {}
  },
  body: {
    appendChild: jest.fn(),
    style: {},
    scrollWidth: 1200,
    scrollHeight: 800,
    offsetWidth: 1200,
    offsetHeight: 800,
    clientWidth: 1200,
    clientHeight: 800
  },
  head: {
    appendChild: jest.fn()
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  readyState: 'complete'
};

global.navigator = {
  clipboard: {
    write: jest.fn(),
    writeText: jest.fn()
  }
};

// Mock ClipboardItem
global.ClipboardItem = class {
  constructor(data) {
    this.data = data;
  }
};

// Load the content script
require('../src/js/content.js');

describe('Content Script Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    // Reset window.html2canvas
    delete window.html2canvas;
  });

  describe('injectHtml2Canvas', () => {
    test('should resolve immediately if html2canvas is already loaded', async () => {
      window.html2canvas = jest.fn();
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/js/html2canvas.min.js');

      const result = await injectHtml2Canvas();

      expect(result).toBeUndefined();
      expect(chrome.runtime.getURL).not.toHaveBeenCalled();
    });

    test('should inject script and resolve on load', async () => {
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/js/html2canvas.min.js');

      const injectPromise = injectHtml2Canvas();

      // Simulate script load
      const script = document.querySelector('script');
      expect(script).toBeTruthy();
      expect(script.src).toBe('chrome-extension://test/js/html2canvas.min.js');

      // Mock successful load
      window.html2canvas = jest.fn();
      script.onload();

      await expect(injectPromise).resolves.toBeUndefined();
    });

    test('should reject on script load error', async () => {
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/js/html2canvas.min.js');

      const injectPromise = injectHtml2Canvas();

      const script = document.querySelector('script');
      script.onerror(new Error('Script load failed'));

      await expect(injectPromise).rejects.toThrow('html2canvas failed to load');
    });
  });

  describe('captureViaBridge', () => {
    beforeEach(() => {
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
      });
    });

    test('should capture with selector and return data URL', async () => {
      const result = await captureViaBridge('body', { useCORS: true });

      expect(window.html2canvas).toHaveBeenCalledWith(document.querySelector('body'), { useCORS: true });
      expect(result).toBe('data:image/png;base64,test');
    });

    test('should handle html2canvas errors', async () => {
      window.html2canvas.mockRejectedValue(new Error('Capture failed'));

      await expect(captureViaBridge('body', {})).rejects.toThrow('Capture failed');
    });

    test('should use getBestCaptureElement when no selector provided', async () => {
      // Mock getBestCaptureElement to return document.body
      const originalGetBestCaptureElement = window.getBestCaptureElement;
      window.getBestCaptureElement = jest.fn().mockReturnValue(document.body);

      await captureViaBridge(null, { useCORS: true });

      expect(window.getBestCaptureElement).toHaveBeenCalled();
      expect(window.html2canvas).toHaveBeenCalledWith(document.body, { useCORS: true });

      // Restore
      window.getBestCaptureElement = originalGetBestCaptureElement;
    });
  });

  describe('Toast class', () => {
    test('should create toast with shadow DOM', () => {
      const toast = new Toast();

      expect(toast.host).toBeInstanceOf(window.Element);
      expect(toast.host.shadowRoot).toBeTruthy();
      expect(toast.element).toBeTruthy();
    });

    test('should show toast with message and type', () => {
      const toast = new Toast();

      toast.show('Test message', 'success');

      expect(toast.element.textContent).toContain('Test message');
      expect(toast.element.classList.contains('visible')).toBe(true);
      expect(toast.host.isConnected).toBe(true);
    });

    test('should hide toast after delay', async () => {
      jest.useFakeTimers();
      const toast = new Toast();
      toast.show('Test');

      toast.hide(100);

      expect(toast.element.classList.contains('visible')).toBe(true);

      jest.advanceTimersByTime(100);

      expect(toast.element.classList.contains('visible')).toBe(false);

      jest.useRealTimers();
    });

    test('should handle click callbacks', () => {
      const toast = new Toast();
      const mockCallback = jest.fn();

      toast.show('Test', 'info', mockCallback);
      toast.element.click();

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('ElementPicker class', () => {
    test('should create overlay and highlight elements', () => {
      const picker = new ElementPicker();

      expect(picker.host).toBeNull();
      expect(picker.overlay).toBeNull();
      expect(picker.highlight).toBeNull();
    });

    test('should start picker and create DOM elements', () => {
      const picker = new ElementPicker();
      const mockOnSelect = jest.fn();
      const mockOnCancel = jest.fn();

      picker.start(mockOnSelect, mockOnCancel);

      expect(picker.host).toBeTruthy();
      expect(picker.shadow).toBeTruthy();
      expect(picker.overlay).toBeTruthy();
      expect(picker.highlight).toBeTruthy();
      expect(picker.host.isConnected).toBe(true);
    });

    test('should stop picker and clean up', () => {
      const picker = new ElementPicker();
      picker.start(() => {}, () => {});

      picker.stop();

      expect(picker.host).toBeNull();
      expect(picker.shadow).toBeNull();
      expect(picker.overlay).toBeNull();
      expect(picker.highlight).toBeNull();
    });
  });

  describe('hideExtensionUI and showExtensionUI', () => {
    test('should hide and show extension UI elements', () => {
      const div1 = document.createElement('div');
      div1.setAttribute('data-ss-capture-ui', 'true');
      div1.style.display = 'block';

      const div2 = document.createElement('div');
      div2.setAttribute('data-ss-capture-ui', 'true');
      div2.style.display = 'flex';

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      hideExtensionUI();

      expect(div1.style.display).toBe('none');
      expect(div2.style.display).toBe('none');

      showExtensionUI();

      expect(div1.style.display).toBe('');
      expect(div2.style.display).toBe('');
    });
  });

  describe('sendProgressUpdate', () => {
    test('should send progress message to runtime', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback && callback();
      });

      sendProgressUpdate('Test progress', 50);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'PROGRESS',
        message: 'Test progress',
        percentComplete: 50
      });
    });

    test('should handle extension context invalidated errors', () => {
      const error = new Error('Extension context invalidated');
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw error;
      });

      // Should not throw
      expect(() => sendProgressUpdate('Test')).not.toThrow();
    });
  });

  describe('sendError', () => {
    test('should send error message to runtime', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback && callback();
      });

      sendError('Test error');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_ERROR',
        error: 'Test error'
      });
    });

    test('should handle extension context invalidated errors', () => {
      const error = new Error('Extension context invalidated');
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw error;
      });

      // Should not throw
      expect(() => sendError('Test error')).not.toThrow();
    });
  });
});
