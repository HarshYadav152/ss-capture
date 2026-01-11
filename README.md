# SS-capture
## 📸 Full Page Screenshot Capture

A modern, high-quality full-page screenshot extension with a beautiful glassmorphic interface. Capture entire web pages with automatic scrolling and chunked rendering for pages exceeding browser canvas limitations.

🪜 How to Use SS-Capture (Step-by-Step)
Step 1: Navigate to a Webpage
Open the webpage you want to capture (articles, documentation, long pages, etc.).

![Image](https://github.com/user-attachments/assets/7eed61c3-28e2-4dd1-8add-c06e569edf7c)

Step 2: Start Capture
Click the SS-Capture icon in your browser toolbar and select Capture Full Page.
![Image](https://github.com/user-attachments/assets/4be252cb-8616-4056-8aa0-f41f5199c02f)

Step 3: Capture in Progress
For long pages, the extension automatically scrolls and captures the page in chunks.
You’ll see real-time progress like “Capturing chunk X of Y”.
![Image](https://github.com/user-attachments/assets/429f5a7d-62e2-48d6-a1f6-588299c73fe9)

Step 4: Preview & Save
Once complete, preview the stitched screenshot and click Save to download it as a PNG.
![Image](https://github.com/user-attachments/assets/b1160d19-ed17-4fd5-9351-fffbc5b9d908)


## ✨ Features

- 🎯 **Full Page Capture**: Automatically captures entire web pages, not just the visible viewport
- 📏 **Large Page Support**: Handles pages exceeding 32,000px by automatically dividing them into chunks
- 🎨 **Modern UI**: Beautiful glassmorphic interface with futuristic design
- ⚡ **Smart Processing**: Intelligent chunking and stitching for very long pages
- 🔄 **Progress Tracking**: Real-time progress updates showing chunk processing (X of Y)
- 📱 **Responsive Design**: Works perfectly on all screen sizes
- ⏱️ **Live Updates**: Visual progress bar and status messages
- 🎯 **Error Recovery**: Graceful error handling with clear user messages
- 💾 **High Quality**: PNG format with maximum quality settings
- ⏸️ **Cancellable**: Abort long-running captures at any time

## 🚀 Installation

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

# ✅ Supported Pages
Regular websites (HTTP/HTTPS)
Single Page Applications (SPAs)
Dynamic content
Long scrolling pages
Infinite scroll pages

# ❌ Not Supported
chrome:// pages
chrome-extension:// pages
Browser new tab pages
Local file URLs (without permissions)

# 🧠 How Long Pages Are Handled
When a webpage exceeds browser canvas limitations:
Page is divided into ~30,000px chunks
Each chunk is captured sequentially
Progress shows Capturing chunk X of Y
All chunks are stitched together seamlessly
Final image is rendered and displayed

# 🛠️ Development
Project Structure
ss-capture/
├── src/
│   ├── js/
│   ├── popup/
│   ├── css/
│   └── manifest.json
├── scripts/
├── tests/
├── docs/
│   └── screenshots/
├── dist/
└── README.md

# Setup for Developers
git clone https://github.com/HarshYadav152/ss-capture.git
cd ss-capture
npm install
npm run build

 # Load extension:
Chrome → dist/chrome
Firefox → dist/firefox/manifest.json

# 🤝 Contributing
Contributions are welcome!
Fork the repository
Create a feature branch
Make changes in src/
Run npm run build
Test thoroughly
Submit a Pull Request
Please read CONTRIBUTING.md before contributing.

# 🐞 Reporting Issues
When opening an issue, include:
Browser & version
OS details
Steps to reproduce
Screenshots (if applicable)

# 📄 License
This project is licensed under the MIT License.
See the LICENSE file for details.

# 🙏 Acknowledgements
Chrome Extensions API
Canvas API
Open Source Community


**Made with ❤️ by [Harsh Yadav](https://github.com/HarshYadav152)**


