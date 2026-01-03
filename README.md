# SS-capture
## 📸 Full Page Screenshot Capture

A modern, high-quality full-page screenshot extension with a beautiful glassmorphic interface. Capture entire web pages with automatic scrolling and chunked rendering for pages exceeding browser canvas limitations.

![Extension Preview](https://raw.githubusercontent.com/HarshYadav152/ss-capture/main/docs/PREVIEW.png)

## ✨ Features

- **🎯 Full Page Capture**: Automatically captures entire web pages, not just the visible viewport
- **📏 Large Page Support**: Handles pages exceeding 32,000px by automatically dividing them into chunks
- **🎨 Modern UI**: Beautiful glassmorphic interface with futuristic design
- **⚡ Smart Processing**: Intelligent chunking and stitching for very long pages
- **🔄 Progress Tracking**: Real-time progress updates showing chunk processing (X of Y)
- **📱 Responsive Design**: Works perfectly on all screen sizes
- **⏱️ Live Updates**: Visual progress bar and status messages
- **🎯 Error Recovery**: Graceful error handling with clear user messages
- **💾 High Quality**: PNG format with maximum quality settings
- **⏸️ Cancellable**: Abort long-running captures at any time

## 🚀 Installation

### Prerequisites
Before installing **SS-Capture**, make sure you have:

- A modern browser (Chrome, Edge, or Firefox)
- Basic knowledge of browser extensions
- For developers:
  - **Node.js** (v16 or later recommended)
  - **npm** (comes with Node.js)

### For Users

#### Chrome/Edge
1. Download the latest release from [Releases](https://github.com/HarshYadav152/ss-capture/releases)
2. Extract the ZIP file
3. Open Chrome/Edge and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `dist/chrome` folder (or `dist/edge`)

#### Firefox
1. Download the latest release from [Releases](https://github.com/HarshYadav152/ss-capture/releases)
2. Extract the ZIP file
3. Open Firefox and go to `about:debugging`
4. Click "This Firefox" tab
5. Click "Load Temporary Add-on" and select `manifest.json` from the `dist/firefox` folder

### For Developers

```bash
# Clone the repository
git clone https://github.com/HarshYadav152/ss-capture.git
cd ss-capture

# Install dependencies
npm install

# Build for all browsers
npm run build

# Or build for specific browser
node scripts/build.js chrome
node scripts/build.js firefox
```

## 📖 Usage

1. **Navigate** to any webpage you want to capture
2. **Click** the extension icon in your browser toolbar
3. **Click** "Capture Full Page" button
4. **Wait** for the progress bar to complete (chunks will be processed sequentially for large pages)
5. **Preview** the captured screenshot
6. **Click** "Save" to download the screenshot

### Supported Page Types
- ✅ Regular web pages (HTTP/HTTPS)
- ✅ Single Page Applications (SPAs)
- ✅ Dynamic content
- ✅ Long scrolling pages (automatically chunked at ~30,000px intervals)
- ✅ Pages with infinite scroll
- ✅ Complex layouts with fixed elements

### Limitations
- ❌ Chrome internal pages (`chrome://`)
- ❌ Extension pages (`chrome-extension://`)
- ❌ Browser new tab pages
- ❌ Local file URLs (without proper permissions)

### How Large Pages Are Handled
When a page exceeds **32,000px** in height (browser canvas limitation):
1. Page is automatically divided into ~30,000px chunks
2. Each chunk is captured sequentially
3. Progress shows "Capturing chunk X of Y"
4. All chunks are stitched together seamlessly
5. Final image is rendered and displayed

## 🛠️ Development

### Project Structure
```
ss-capture/
├── src/
│   ├── manifest.json          # Extension manifest (V3)
│   ├── js/
│   │   ├── background.js      # Service worker
│   │   └── content.js         # Screenshot capture logic
│   ├── popup/
│   │   ├── popup.html         # UI interface
│   │   └── popup.js           # UI logic
│   └── css/
│       └── style.css          # Glassmorphic styling
├── scripts/
│   ├── build.js               # Build automation
│   ├── validate.js            # Extension validation
│   └── zip.js                 # Package for distribution
├── tests/
│   ├── test-build.js          # Build tests
│   └── test-build-fixed.js    # Fixed build tests
├── icons/                     # Extension icons
├── docs/                      # Documentation
├── dist/                      # Built extensions (gitignored)
│   ├── chrome/
│   ├── firefox/
│   └── edge/
├── README.md
├── UNDERSTAND.md              # Project documentation
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── jest.config.js
```

### Key Components

#### [`src/manifest.json`](src/manifest.json)
Extension configuration with:
- Manifest V3 compliance
- Permissions: `activeTab`, `scripting`, `downloads`
- Host permissions for all URLs
- Firefox-specific settings (`browser_specific_settings`)

#### [`src/popup/popup.html`](src/popup/popup.html) & [`src/popup/popup.js`](src/popup/popup.js)
Modern glassmorphic UI with:
- Capture, Cancel, and Save buttons
- Real-time progress bar (0-100%)
- Status messages and error alerts
- Screenshot preview
- 120-second timeout for very large pages

#### [`src/js/content.js`](src/js/content.js)
Core screenshot logic:
- Page dimension calculation
- Automatic chunking for pages > 32,000px
- Sequential chunk capture with scrolling
- Canvas stitching of multiple chunks
- Progress reporting to popup
- Error handling and recovery

#### [`src/js/background.js`](src/js/background.js)
Service worker:
- Message routing between popup and content scripts
- Download coordination
- Capture state management
- Cancel request handling

#### [`src/css/style.css`](src/css/style.css)
Glassmorphic design:
- Frosted glass effect with backdrop-filter
- Smooth animations and transitions
- Responsive button states
- Progress bar styling

### Development Setup

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/ss-capture.git`
3. **Install** dependencies: `npm install`
4. **Build** the extension: `npm run build`
5. **Load** in browser:
   - Chrome: Load `dist/chrome` folder
   - Firefox: Load `dist/firefox/manifest.json`
6. **Make** your changes in the `src/` directory
7. **Rebuild** after changes: `npm run build`
8. **Test** thoroughly
9. **Submit** a pull request

### Available Scripts

```bash
# Build extension for all browsers
npm run build

# Validate extension structure
npm run validate

# Create distribution ZIP files
npm run zip

# Run tests
npm test

# Build for specific browser
node scripts/build.js chrome
node scripts/build.js firefox
node scripts/build.js edge
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Capture short pages (< 5,000px)
- [ ] Capture medium pages (5,000-32,000px)
- [ ] Capture very long pages (> 32,000px) - verify chunking
- [ ] Test progress updates during chunked capture
- [ ] Test cancel functionality mid-capture
- [ ] Test save functionality
- [ ] Test error handling (timeout, restricted pages)
- [ ] Test on different browsers (Chrome, Firefox, Edge)
- [ ] Test responsive popup design
- [ ] Verify preview image displays correctly

### Testing Very Long Pages
Try these sites for chunked capture testing:
- Long documentation pages
- Social media infinite scroll feeds
- E-commerce product listings
- News article archives

### Automated Testing
```bash
# Run Jest tests
npm test

# Run specific test file
npm test test-build-fixed.js
```

## 📦 Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 88+ | ✅ Full Support | Primary target, Manifest V3 |
| Edge | 88+ | ✅ Full Support | Chromium-based |
| Firefox | 109+ | ✅ Full Support | Manifest V3 support |
| Safari | 16+ | ❌ Not Supported | No Manifest V3 support |

## 🔧 Configuration

### Chunk Size
Adjust in [`src/js/content.js`](src/js/content.js):
```javascript
const MAX_CANVAS_HEIGHT = 32000; // Browser limit
const CHUNK_HEIGHT = 30000;      // Safe chunk size
```

### Capture Timeout
Modify in [`src/popup/popup.js`](src/popup/popup.js):
```javascript
setTimeout(() => {
  if (captureInProgress) {
    showErrorAlert('Capture timeout');
  }
}, 120000); // 120 seconds
```

### Progress Updates
Content script sends progress messages:
```javascript
chrome.runtime.sendMessage({
  type: 'PROGRESS',
  message: `Capturing chunk ${i+1} of ${numChunks}`,
  percentComplete: Math.round((i / numChunks) * 100)
});
```

## 🚀 Publishing

### Chrome Web Store
1. Build: `node scripts/build.js chrome`
2. Package: `node scripts/zip.js chrome`
3. Upload ZIP to [Chrome Web Store Dashboard](https://chrome.google.com/webstore/devconsole/)
4. Fill in listing details (screenshots, description)
5. Submit for review (typically 1-3 days)

### Firefox Add-ons
1. Build: `node scripts/build.js firefox`
2. Package: `node scripts/zip.js firefox`
3. Upload to [Firefox Add-ons](https://addons.mozilla.org/developers/)
4. Fill in listing details
5. Submit for review (typically 1-5 days)

### Edge Add-ons
1. Build: `node scripts/build.js edge`
2. Package: `node scripts/zip.js edge`
3. Upload to [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/)
4. Fill in listing details
5. Submit for review (typically 1-3 days)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes in `src/` directory
4. Build and test: `npm run build`
5. Add tests if applicable
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Reporting Issues
- Use [GitHub Issues](https://github.com/HarshYadav152/ss-capture/issues)
- Include browser version and OS
- Provide steps to reproduce
- Attach screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extensions API** for screenshot capabilities
- **Canvas API** for image stitching
- **Glassmorphism Design** for modern UI inspiration
- **Open Source Community** for feedback and contributions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/HarshYadav152/ss-capture/issues)
- **Discussions**: [GitHub Discussions](https://github.com/HarshYadav152/ss-capture/discussions)
- **Email**: harshyadav152@outlook.com

## 🔄 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

**Made with ❤️ by [Harsh Yadav](https://github.com/HarshYadav152)**