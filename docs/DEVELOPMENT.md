# Development Guide

This document provides detailed information for developers working on the Full Page Screenshot Capture extension.

## 🏗️ Architecture Overview

### Component Structure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   popup.html    │    │   content.js    │    │ background.js   │
│   popup.js      │    │                 │    │                 │
│   (UI Layer)    │◄──►│ (Page Capture)  │◄──►│ (Service Worker)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **User Interaction**: User clicks extension icon → popup.html opens
2. **Capture Request**: popup.js sends message to background.js
3. **Script Injection**: background.js injects content.js into active tab
4. **Page Capture**: content.js captures page sections and composes full image
5. **Progress Updates**: content.js sends progress to popup.js via background.js
6. **Result**: Final screenshot sent back to popup.js for download

## 🔧 Development Setup

### Prerequisites

- Node.js 16+ 
- Git
- Modern browser (Chrome, Firefox, Edge)
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/harshyadav152/ss-capture.git
cd ss-capture

# Install dependencies
npm install

# Load extension in browser for development
npm run dev
```

### Development Workflow

1. **Make Changes**: Edit source files
2. **Test Locally**: Load extension in browser
3. **Run Tests**: `npm test`
4. **Lint Code**: `npm run lint`
5. **Build**: `npm run build`
6. **Commit**: Follow conventional commits

## 📁 File Structure

```
ss-capture/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI interface
├── popup.js              # UI logic and event handling
├── content.js            # Page capture logic
├── background.js         # Background service worker
├── icons/                # Extension icons
├── scripts/              # Build and utility scripts
├── tests/                # Test files
├── docs/                 # Documentation
├── dist/                 # Build output
└── package.json          # Project configuration
```

## 🧪 Testing

### Manual Testing Checklist

Before submitting changes, test the following scenarios:

#### Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens correctly
- [ ] Capture button works
- [ ] Progress bar updates
- [ ] Screenshot saves successfully

#### Page Types
- [ ] Short pages (< 1 viewport)
- [ ] Long pages (5-10 viewports)
- [ ] Pages with fixed elements
- [ ] Single Page Applications (SPAs)
- [ ] Dynamic content pages

#### Error Scenarios
- [ ] Rate limiting (capture too quickly)
- [ ] Network timeouts
- [ ] Invalid page types (chrome://)
- [ ] Cancellation during capture
- [ ] Browser compatibility issues

#### Browser Testing
- [ ] Chrome 88+
- [ ] Firefox 109+
- [ ] Edge 88+
- [ ] Different screen sizes
- [ ] Different zoom levels

### Automated Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/content.test.js

# Watch mode for development
npm test -- --watch
```

### Test Structure

```
tests/
├── setup.js              # Test environment setup
├── popup.test.js         # UI component tests
├── content.test.js       # Capture logic tests
├── background.test.js    # Service worker tests
└── integration.test.js   # End-to-end tests
```

## 🔍 Code Quality

### Linting

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check specific files
npm run lint -- popup.js content.js
```

### Code Style Guidelines

- Use **ES6+** features (arrow functions, const/let, template literals)
- Follow **consistent indentation** (2 spaces)
- Use **meaningful variable names**
- Add **JSDoc comments** for complex functions
- Keep functions **small and focused** (< 50 lines)
- Use **async/await** instead of callbacks
- Handle **errors gracefully** with try/catch

### Example Code Style

```javascript
/**
 * Captures a section of the page at the specified position
 * @param {number} y - Vertical position to capture
 * @param {number} height - Height of section to capture
 * @returns {Promise<string>} Data URL of captured image
 */
async function captureSection(y, height) {
  try {
    // Scroll to position
    window.scrollTo(0, y);
    await sleep(500);
    
    // Capture viewport
    const dataUrl = await captureViewport();
    
    return dataUrl;
  } catch (error) {
    console.error('Capture failed:', error);
    throw new Error(`Failed to capture section at ${y}: ${error.message}`);
  }
}
```

## 🚀 Building and Deployment

### Development Build

```bash
# Build for development
npm run build:dev

# Watch for changes
npm run watch
```

### Production Build

```bash
# Build for all browsers
npm run build:all

# Build for specific browser
npm run build:chrome
npm run build:firefox
npm run build:edge
```

### Distribution

```bash
# Create ZIP packages
npm run zip

# Full release process
npm run release
```

## 🔒 Security Considerations

### Content Security Policy

The extension follows strict CSP guidelines:

- No inline scripts
- No eval() usage
- No external script loading
- Sandboxed content scripts

### Permission Usage

Only request necessary permissions:

- `activeTab`: Access current tab for capture
- `scripting`: Inject content scripts
- `downloads`: Save screenshots

### Data Handling

- No user data collection
- No external API calls
- Screenshots saved locally only
- No persistent storage

## 🐛 Debugging

### Chrome DevTools

1. Open extension popup
2. Right-click → Inspect
3. Use Console for debugging
4. Check Network tab for API calls

### Content Script Debugging

1. Go to target webpage
2. Open DevTools
3. Check Console for content script logs
4. Use Sources tab to debug content.js

### Background Script Debugging

1. Go to `chrome://extensions/`
2. Find extension
3. Click "Service Worker" link
4. Debug in new DevTools window

### Common Issues

#### Rate Limiting
```
Error: MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota exceeded
```
**Solution**: Increase delays between captures

#### Permission Denied
```
Error: Cannot access chrome:// pages
```
**Solution**: Check page URL before attempting capture

#### Memory Issues
```
Error: Canvas size too large
```
**Solution**: Implement chunking for very large pages

## 📈 Performance Optimization

### Capture Optimization

- **Rate Limiting**: 600ms between captures
- **Chunking**: Maximum 50 captures per screenshot
- **Memory Management**: Clean up canvas after use
- **Timeout Handling**: 10s capture timeout

### UI Optimization

- **Debounced Updates**: Limit progress updates
- **Lazy Loading**: Load images on demand
- **Memory Cleanup**: Clear references after use

### Code Optimization

- **Minification**: Use build tools for production
- **Tree Shaking**: Remove unused code
- **Caching**: Cache DOM queries
- **Async Operations**: Use Web Workers for heavy tasks

## 🔄 Release Process

### Version Management

1. **Update Version**: Modify `package.json` and `manifest.json`
2. **Update Changelog**: Add entries to `CHANGELOG.md`
3. **Test Thoroughly**: Run full test suite
4. **Build Packages**: `npm run build:all`
5. **Create Release**: Tag and push to GitHub
6. **Publish**: Submit to browser stores

### Release Checklist

- [ ] All tests pass
- [ ] Code linting passes
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers updated
- [ ] Build artifacts created
- [ ] Release notes written
- [ ] Browser store submissions ready

## 🤝 Contributing

### Pull Request Process

1. **Fork** the repository
2. **Create** feature branch
3. **Make** changes with tests
4. **Update** documentation
5. **Submit** pull request
6. **Wait** for review and CI
7. **Merge** after approval

### Code Review Guidelines

- **Functionality**: Does it work as expected?
- **Performance**: Any performance impacts?
- **Security**: Any security concerns?
- **Maintainability**: Is code readable and well-documented?
- **Testing**: Are tests comprehensive?

## 📚 Resources

### Documentation
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Add-ons Documentation](https://extensionworkshop.com/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Web Extensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Extension Manifest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)

### Community
- [Chrome Extensions Forum](https://groups.google.com/forum/#!forum/chrome-extensions)
- [Firefox Add-ons Community](https://discourse.mozilla.org/c/add-ons/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/browser-extension)

---

For additional help, see [CONTRIBUTING.md](../CONTRIBUTING.md) or open an issue on GitHub. 