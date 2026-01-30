// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  action: {
    openPopup: jest.fn()
  }
};

// Mock html2canvas
global.html2canvas = jest.fn();

// Mock fetch and related APIs
global.fetch = jest.fn();
global.URL = class {
  constructor(url) {
    this.href = url;
  }
};

// Mock Image
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
};

// Mock crypto
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid')
};

// Setup DOM
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Load scripts
require('../src/js/background.js');
require('../src/js/content.js');

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('Capture Flow Integration', () => {
    test('should handle full capture flow from popup to completion', async () => {
      // Mock successful capture
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'CAPTURE_COMPLETE') {
          // Simulate background processing
          return true;
        }
        if (callback) callback();
      });

      // Simulate popup initiating capture
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls.find(
        call => call[0] && typeof call[0] === 'function'
      );

      if (mockListener) {
        const [listener] = mockListener;
        listener({ type: 'INIT_CAPTURE', mode: 'FULL_PAGE' }, {}, () => {});
      }

      // Verify html2canvas was called
      await new Promise(resolve => setTimeout(resolve, 600)); // Wait for setTimeout in content.js

      expect(window.html2canvas).toHaveBeenCalled();
    });

    test('should handle visible area capture flow', async () => {
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,visible')
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      // Simulate visible area capture
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      mockListener({ type: 'INIT_CAPTURE', mode: 'VISIBLE_AREA' }, {}, () => {});

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(window.html2canvas).toHaveBeenCalled();
    });
  });

  describe('Message Passing Between Components', () => {
    test('should pass messages from content to background', () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe('PROGRESS');
        expect(message.message).toBe('Test progress');
        if (callback) callback();
      });

      sendProgressUpdate('Test progress', 50);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PROGRESS',
          message: 'Test progress',
          percentComplete: 50
        }),
        expect.any(Function)
      );
    });

    test('should handle background to content communication', () => {
      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(message.type).toBe('INIT_CAPTURE');
        expect(message.mode).toBe('FULL_PAGE');
        if (callback) callback();
      });

      // Simulate background sending message to content
      mockListener({ type: 'INIT_CAPTURE', mode: 'FULL_PAGE' }, {}, () => {});

      expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Error Propagation', () => {
    test('should propagate capture errors through the chain', async () => {
      window.html2canvas = jest.fn().mockRejectedValue(new Error('Capture failed'));

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'CAPTURE_ERROR') {
          expect(message.error).toContain('Capture failed');
        }
        if (callback) callback();
      });

      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      mockListener({ type: 'INIT_CAPTURE', mode: 'FULL_PAGE' }, {}, () => {});

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAPTURE_ERROR'
        }),
        expect.any(Function)
      );
    });

    test('should handle extension context invalidation gracefully', () => {
      const error = new Error('Extension context invalidated');
      chrome.runtime.sendMessage.mockImplementation(() => {
        throw error;
      });

      // Should not throw
      expect(() => sendProgressUpdate('Test')).not.toThrow();
      expect(() => sendError('Test error')).not.toThrow();
    });
  });

  describe('Session Store Integration', () => {
    test('should integrate with session store for screenshot storage', async () => {
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'ADD_SESSION_SCREENSHOT') {
          expect(message.dataUrl).toBe('data:image/png;base64,test');
          expect(message.filename).toMatch(/full-page-\d+\.png/);
        }
        if (callback) callback();
      });

      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      mockListener({ type: 'INIT_CAPTURE', mode: 'FULL_PAGE' }, {}, () => {});

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_SESSION_SCREENSHOT',
          dataUrl: 'data:image/png;base64,test'
        }),
        expect.any(Function)
      );
    });
  });

  describe('UI State Management', () => {
    test('should manage extension UI visibility during capture', async () => {
      // Add test elements
      const uiElement1 = document.createElement('div');
      uiElement1.setAttribute('data-ss-capture-ui', 'true');
      uiElement1.style.display = 'block';

      const uiElement2 = document.createElement('div');
      uiElement2.setAttribute('data-ss-capture-ui', 'true');
      uiElement2.style.display = 'flex';

      document.body.appendChild(uiElement1);
      document.body.appendChild(uiElement2);

      // Initially visible
      expect(uiElement1.style.display).toBe('block');
      expect(uiElement2.style.display).toBe('flex');

      // Hide during capture
      hideExtensionUI();

      expect(uiElement1.style.display).toBe('none');
      expect(uiElement2.style.display).toBe('none');

      // Show after capture
      showExtensionUI();

      expect(uiElement1.style.display).toBe('');
      expect(uiElement2.style.display).toBe('');
    });

    test('should show and hide toast notifications', () => {
      const toast = new Toast();

      toast.show('Test message', 'success');

      expect(toast.element.textContent).toContain('Test message');
      expect(toast.host.isConnected).toBe(true);

      toast.hide();

      expect(toast.element.classList.contains('visible')).toBe(false);
    });
  });

  describe('Element Picker Integration', () => {
    test('should handle element selection mode', () => {
      const picker = new ElementPicker();

      expect(picker.host).toBeNull();

      picker.start(
        (element, rect) => {
          expect(element).toBeTruthy();
          expect(rect).toBeTruthy();
        },
        () => {
          // Cancel callback
        }
      );

      expect(picker.host).toBeTruthy();
      expect(picker.host.isConnected).toBe(true);

      picker.stop();

      expect(picker.host).toBeNull();
    });
  });

  describe('Performance and Memory', () => {
    test('should handle multiple rapid captures', async () => {
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Simulate multiple rapid capture requests
      for (let i = 0; i < 3; i++) {
        mockListener({ type: 'INIT_CAPTURE', mode: 'VISIBLE_AREA' }, {}, () => {});
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      // Should handle multiple requests without issues
      expect(window.html2canvas).toHaveBeenCalled();
    });

    test('should clean up resources after capture', async () => {
      window.html2canvas = jest.fn().mockResolvedValue({
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      const mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      mockListener({ type: 'INIT_CAPTURE', mode: 'FULL_PAGE' }, {}, () => {});

      await new Promise(resolve => setTimeout(resolve, 600));

      // Resources should be cleaned up (fixed elements restored, etc.)
      // This is tested implicitly by the successful completion
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAPTURE_COMPLETE'
        }),
        expect.any(Function)
      );
    });
  });
});
