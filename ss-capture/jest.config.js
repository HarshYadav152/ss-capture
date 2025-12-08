module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],
  collectCoverageFrom: [
    '*.js',
    '!tests/**',
    '!node_modules/**',
    '!scripts/**',
    '!jest.config.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  globals: {
    chrome: {
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
    },
  },
}; 