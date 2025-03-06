// Increase timeout for tests that involve database operations
jest.setTimeout(30000);

// Suppress console output during tests
global.console = {
  ...console,
  // Comment these out for debugging
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 