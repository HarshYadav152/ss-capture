const { JSDOM } = require('jsdom');

// Mock chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    },
    onSuspend: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getURL: jest.fn()
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    captureVisibleTab: jest.fn()
  },
  downloads: {
    download: jest.fn()
  },
  action: {
    openPopup: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://example.com'
});

global.window = dom.window;
global.document = dom.window.document;

// Load the background script
require('../src/js/background.js');

describe('Background Script Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset lastCaptureData
    global.lastCaptureData = null;
  });

  describe('Extension Installation', () => {
    test('should create context menus on installation', () => {
      const mockListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];

      mockListener();

      expect(chrome.contextMenus.create).toHaveBeenCalledTimes(3);
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'capture-visible-area',
        title: 'Capture Visible Area',
        contexts: ['page', 'selection']
      });
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'capture-full-page',
        title: 'Capture Full Page',
        contexts: ['page']
      });
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'capture-element',
        title: 'Capture Selected Element',
        contexts: ['page']
      });
    });
  });

  describe('Context Menu Click Handler', () => {
    test('should handle capture-visible-area command', () => {
      const mockListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      const mockInfo = { menuItemId: 'capture-visible-area' };
      const mockTab = { id: 123 };

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback && callback();
      });

      mockListener(mockInfo, mockTab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'INIT_CAPTURE',
        mode: 'VISIBLE_AREA'
      });
    });

    test('should handle capture-full-page command', () => {
      const mockListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      const mockInfo = { menuItemId: 'capture-full-page' };
      const mockTab = { id: 123 };

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback && callback();
      });

      mockListener(mockInfo, mockTab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'INIT_CAPTURE',
        mode: 'FULL_PAGE'
      });
    });

    test('should handle capture-element command', () => {
      const mockListener = chrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      const mockInfo = { menuItemId: 'capture-element' };
      const mockTab = { id: 123 };

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback && callback();
      });

      mockListener(mockInfo, mockTab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'INIT_CAPTURE',
        mode: 'SELECTED_ELEMENT'
      });
    });
  });

  describe('Command Shortcuts', () => {
    test('should handle capture_full_page command', () => {
      const mockListener = chrome.commands.onCommand.addListener.mock.calls[0][0];
      const mockTabs = [{ id: 123 }];

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback && callback();
      });

      mockListener('capture_full_page');

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'INIT_CAPTURE',
        mode: 'FULL_PAGE'
      });
    });

    test('should do nothing if no active tab', () => {
      const mockListener = chrome.commands.onCommand.addListener.mock.calls[0][0];
      const mockTabs = [];

      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });

      mockListener('capture_full_page');

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message Listener', () => {
    let mockListener;
    let mockSendResponse;

    beforeEach(() => {
      mockListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      mockSendResponse = jest.fn();
    });

    test('should handle CAPTURE_COMPLETE message', () => {
      const message = {
        type: 'CAPTURE_COMPLETE',
        dataUrl: 'data:image/png;base64,test',
        autoSave: true,
        filename: 'test.png'
      };

      chrome.downloads.download.mockImplementation((options, callback) => {
        callback && callback(123);
      });

      mockListener(message, {}, mockSendResponse);

      expect(global.lastCaptureData).toBe('data:image/png;base64,test');
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'data:image/png;base64,test',
        filename: 'test.png',
        saveAs: false
      });
    });

    test('should use default filename if not provided', () => {
      const message = {
        type: 'CAPTURE_COMPLETE',
        dataUrl: 'data:image/png;base64,test',
        autoSave: true
      };

      chrome.downloads.download.mockImplementation((options, callback) => {
        callback && callback(123);
      });

      mockListener(message, {}, mockSendResponse);

      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'data:image/png;base64,test',
        filename: expect.stringMatching(/screenshot-\d+\.png/),
        saveAs: false
      });
    });

    test('should skip auto-save if autoSave is false', () => {
      const message = {
        type: 'CAPTURE_COMPLETE',
        dataUrl: 'data:image/png;base64,test',
        autoSave: false
      };

      mockListener(message, {}, mockSendResponse);

      expect(chrome.downloads.download).not.toHaveBeenCalled();
    });

    test('should handle GET_LAST_CAPTURE message', () => {
      global.lastCaptureData = 'data:image/png;base64,test';

      const message = { type: 'GET_LAST_CAPTURE' };

      mockListener(message, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith('data:image/png;base64,test');
    });

    test('should return null for GET_LAST_CAPTURE if no data', () => {
      global.lastCaptureData = null;

      const message = { type: 'GET_LAST_CAPTURE' };

      mockListener(message, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith(null);
    });

    test('should handle OPEN_POPUP message', () => {
      const message = { type: 'OPEN_POPUP' };

      chrome.action.openPopup.mockImplementation((callback) => {
        callback && callback();
      });

      mockListener(message, {}, mockSendResponse);

      expect(chrome.action.openPopup).toHaveBeenCalled();
    });

    test('should handle OPEN_POPUP rejection gracefully', () => {
      const message = { type: 'OPEN_POPUP' };

      chrome.action.openPopup.mockRejectedValue(new Error('Popup failed'));

      // Should not throw
      expect(() => mockListener(message, {}, mockSendResponse)).not.toThrow();
    });
  });

  describe('Action Click Handler', () => {
    test('should send INIT_CAPTURE message on action click', () => {
      const mockListener = chrome.action.onClicked.addListener.mock.calls[0][0];
      const mockTab = { id: 123 };

      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback && callback();
      });

      mockListener(mockTab);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        type: 'INIT_CAPTURE',
        mode: 'FULL_PAGE'
      });
    });
  });

  describe('Extension Suspend', () => {
    test('should log on suspend', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockListener = chrome.runtime.onSuspend.addListener.mock.calls[0][0];

      mockListener();

      expect(consoleSpy).toHaveBeenCalledWith('SS-Capture background script suspending');

      consoleSpy.mockRestore();
    });
  });
});
