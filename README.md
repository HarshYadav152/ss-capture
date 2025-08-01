# SS-capture
## 📸 Full Page Screenshot Capture

A modern, high-quality full-page screenshot extension with a beautiful glassmorphic interface. Capture entire web pages with automatic scrolling, rate limiting, and error handling.

![Extension Preview](docs/preview.png)

## ✨ Features

- **🎯 Full Page Capture**: Automatically captures entire web pages, not just the visible viewport
- **🎨 Modern UI**: Beautiful glassmorphic interface with futuristic design
- **⚡ Smart Rate Limiting**: Prevents browser API quota issues with intelligent delays
- **🔄 Retry Mechanism**: Automatic retry on failures with user feedback
- **📱 Responsive Design**: Works perfectly on all screen sizes
- **🚫 Fixed Element Handling**: Automatically hides fixed/sticky elements during capture
- **⏱️ Progress Tracking**: Real-time progress updates with visual feedback
- **🎯 Error Recovery**: Graceful error handling with clear user messages
- **💾 High Quality**: PNG format with maximum quality settings

## 🚀 Installation

### For Users

#### Chrome/Edge
1. Download the latest release from [Releases](https://github.com/yourusername/ss-capture/releases)
2. Extract the ZIP file
3. Open Chrome/Edge and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

#### Firefox
1. Download the latest release from [Releases](https://github.com/yourusername/ss-capture/releases)
2. Extract the ZIP file
3. Open Firefox and go to `about:debugging`
4. Click "This Firefox" tab
5. Click "Load Temporary Add-on" and select `manifest.json`

### For Developers

```bash
# Clone the repository
git clone https://github.com/HarshYadav152/ss-capture.git
cd ss-capture

# Install dependencies (if any)
npm install

# Build for production
npm run build
```

## 📖 Usage

1. **Navigate** to any webpage you want to capture
2. **Click** the extension icon in your browser toolbar
3. **Click** "Capture Full Page" to start the screenshot process
4. **Wait** for the progress bar to complete
5. **Click** "Save" to download the screenshot

### Supported Page Types
- ✅ Regular web pages (HTTP/HTTPS)
- ✅ Single Page Applications (SPAs)
- ✅ Dynamic content
- ✅ Long scrolling pages (up to 50 viewport heights)

### Limitations
- ❌ Chrome internal pages (`chrome://`)
- ❌ Extension pages (`chrome-extension://`)
- ❌ Pages longer than 50 viewport heights
- ❌ Pages with excessive fixed elements

## 🛠️ Development

### Project Structure
```
ss-capture/
├── manifest.json          # Extension manifest
├── popup.html            # Main UI interface
├── popup.js              # UI logic and event handling
├── content.js            # Page capture logic
├── background.js         # Background service worker
├── icons/                # Extension icons
├── docs/                 # Documentation
├── README.md             # This file
├── LICENSE               # License file
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # Contribution guidelines
├── .github/              # GitHub templates
└── package.json          # Node.js dependencies
```

### Key Components

#### `manifest.json`
Extension configuration with permissions and browser compatibility settings.

#### `popup.html` & `popup.js`
Modern glassmorphic UI with real-time progress updates and error handling.

#### `content.js`
Core screenshot logic with:
- Page dimension calculation
- Fixed element handling
- Rate-limited capture process
- Canvas composition
- Error recovery

#### `background.js`
Service worker handling:
- Screenshot API calls
- Rate limiting enforcement
- Message routing
- State management

### Development Setup

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Load** extension in browser for testing
5. **Make** your changes
6. **Test** thoroughly
7. **Submit** a pull request

### Building for Production

```bash
# Build for all browsers
npm run build:all

# Build for specific browser
npm run build:chrome
npm run build:firefox
npm run build:edge
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Capture short pages (< 1 viewport)
- [ ] Capture long pages (5-10 viewports)
- [ ] Test on pages with fixed elements
- [ ] Test error scenarios (rate limits, timeouts)
- [ ] Test cancel functionality
- [ ] Test save functionality
- [ ] Test responsive design
- [ ] Test on different browsers

### Automated Testing
```bash
# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 📦 Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 88+ | ✅ Full Support | Primary target |
| Edge | 88+ | ✅ Full Support | Chromium-based |
| Firefox | 109+ | ✅ Full Support | Manifest V3 |
| Safari | 16+ | ⚠️ Limited | No Manifest V3 |

## 🔧 Configuration

### Rate Limiting
Adjust capture timing in `content.js`:
```javascript
const MIN_CAPTURE_INTERVAL = 600; // milliseconds between captures
```

### Maximum Captures
Change the limit in `content.js`:
```javascript
const maxCaptures = 50; // maximum captures per screenshot
```

### Timeouts
Modify timeout values:
```javascript
const captureTimeout = 10000; // capture timeout
const imgTimeout = 5000;      // image loading timeout
```

## 🚀 Publishing

### Chrome Web Store
1. Build the extension: `npm run build:chrome`
2. Create a ZIP file of the `dist/chrome` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
4. Fill in store listing details
5. Submit for review

### Firefox Add-ons
1. Build the extension: `npm run build:firefox`
2. Create a ZIP file of the `dist/firefox` folder
3. Upload to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
4. Fill in store listing details
5. Submit for review

### Edge Add-ons
1. Build the extension: `npm run build:edge`
2. Create a ZIP file of the `dist/edge` folder
3. Upload to [Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge/)
4. Fill in store listing details
5. Submit for review

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](https://github.com/HarshYadav152/ss-capture/blob/main/CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/HarshYadav152/ss-capture/blob/main/LICENSE) file for details.

## 🙏 Acknowledgments

- **Chrome Extensions API** for the screenshot capabilities
- **Glassmorphism Design** inspiration from modern UI trends
- **Open Source Community** for feedback and contributions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/HarshYadav152/ss-capture/issues)
- **Discussions**: [GitHub Discussions](https://github.com/HarshYadav152/ss-capture/discussions)
- **Email**: harshyadav152@outlook.com
---

**Made with ❤️** 