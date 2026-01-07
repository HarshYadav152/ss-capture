const store = require('../src/js/sessionStore.core.js');

beforeEach(() => {
  store._resetForTests();
});

test('add and get screenshot', () => {
  const dataUrl = 'data:image/png;base64,AAA';
  const item = store.addScreenshot(dataUrl);
  const items = store.getScreenshots();
  expect(items.length).toBe(1);
  expect(items[0].id).toBe(item.id);
  expect(items[0].dataUrl).toBe(dataUrl);
  expect(items[0].filename).toMatch(/screenshot-\d+\.png/);
  expect(new Date(items[0].timestamp).toString()).not.toBe('Invalid Date');
});

test('enforces max items limit', () => {
  for (let i = 0; i < 25; i++) store.addScreenshot(`data:${i}`);
  const items = store.getScreenshots();
  expect(items.length).toBe(20);
  // Most recent item should be the last added
  expect(items[0].dataUrl).toBe('data:24');
  expect(items[items.length-1].dataUrl).toBe('data:5');
});

test('delete removes item and notifies', () => {
  const a = store.addScreenshot('data:a');
  const b = store.addScreenshot('data:b');
  const ok = store.deleteScreenshot(a.id);
  expect(ok).toBe(true);
  const items = store.getScreenshots();
  expect(items.length).toBe(1);
  expect(items[0].id).toBe(b.id);
});

test('clear removes all items', () => {
  store.addScreenshot('x');
  store.addScreenshot('y');
  store.clearScreenshots();
  expect(store.getScreenshots().length).toBe(0);
});

test('notifier is called on changes', () => {
  const mock = jest.fn();
  store.setNotifier(mock);
  store.addScreenshot('data:n');
  expect(mock).toHaveBeenCalledWith({ type: 'SESSION_UPDATED' });
  store.deleteScreenshot(store.getScreenshots()[0].id);
  expect(mock).toHaveBeenCalledTimes(2);
  store.clearScreenshots();
  expect(mock).toHaveBeenCalledTimes(3);
});

test('setScreenshots initializes store', () => {
  const items = [
    { id: 'a', timestamp: new Date().toISOString(), dataUrl: 'data:a', filename: 'a.png' },
    { id: 'b', timestamp: new Date().toISOString(), dataUrl: 'data:b', filename: 'b.png' }
  ];
  store.setScreenshots(items);
  const got = store.getScreenshots();
  expect(got.length).toBe(2);
  expect(got[0].id).toBe('a');
  expect(got[1].id).toBe('b');
});

test('stores thumbnail when provided', () => {
  const dataUrl = 'data:image/png;base64,AAA';
  const thumb = 'data:image/png;base64,THUMB';
  const item = store.addScreenshot({ dataUrl, thumbnail: thumb, filename: 's1.png' });
  const items = store.getScreenshots();
  expect(items.length).toBe(1);
  expect(items[0].thumbnail).toBe(thumb);
  expect(items[0].filename).toBe('s1.png');
});
