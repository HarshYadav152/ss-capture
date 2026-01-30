// Setup chrome mocks for tests
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    captureVisibleTab: jest.fn(),
    sendMessage: jest.fn(),
  },
  scripting: {
    executeScript: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({})),
      set: jest.fn((obj) => {}),
    },
    session: {
      get: jest.fn((keys, cb) => cb({})),
      set: jest.fn((obj) => {}),
    }
  }
};
