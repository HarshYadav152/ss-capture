## 🎯 Project Purpose
This is a browser extension that captures high-quality full-page screenshots with a modern glassmorphic user interface. It handles pages of any length by automatically dividing them into chunks when they exceed browser canvas limitations (32000px).

---

## 📁 File Structure & Responsibilities

### **Root Configuration Files**

- **package.json** - Defines project dependencies, npm scripts, and metadata
- **jest.config.js** - Configuration for Jest testing framework
- **.gitignore** - Specifies which files Git should ignore
- **LICENSE** - Project license information
- **README.md** - Main project documentation and usage instructions
- **CONTRIBUTING.md** - Guidelines for contributing to the project

---

### **📄 Documentation** (docs)

- **DEVELOPMENT.md** - Developer setup guide and technical documentation (soon)

---

### **🎨 Icons** (icons)

Contains extension icons in various sizes for browser toolbars and extension stores.

---

### **⚙️ Build Scripts** (scripts)

#### **build.js**
- Compiles and packages the extension for different browsers
- Creates separate builds for Chrome/Edge and Firefox
- Copies source files to dist directories
- Handles manifest modifications for browser compatibility

#### **validate.js**
- Validates extension structure and files
- Checks manifest.json syntax
- Ensures all required files exist
- Verifies code quality

#### **zip.js**
- Creates ZIP archives of built extensions
- Packages for Chrome Web Store and Firefox Add-ons submissions
- Generates versioned release files

---

### **🔧 Source Code** (src)

#### **manifest.json**
- Extension configuration file (Manifest V3)
- Defines permissions: `activeTab`, `scripting`, `downloads`
- Specifies background service worker and popup
- Contains browser-specific settings (Firefox compatibility)

#### **JavaScript Files** (js)

**background.js**
- Service worker that runs in the background
- Handles communication between popup and content scripts
- Manages download functionality
- Coordinates the screenshot capture process
- Handles capture cancellation and error states

**content.js**
- Injected into web pages to capture screenshots
- Implements chunked screenshot capture for pages > 32000px
- Uses canvas API to stitch multiple captures together
- Scrolls through page sections during capture
- Sends progress updates back to popup
- Handles page rendering and timing issues

#### **Popup Interface** (popup)

**popup.html**
- Extension popup UI structure
- Contains capture button, progress bar, and status display
- Shows preview of captured screenshot
- Includes error alert container

**popup.js**
- Controls popup UI behavior and state management
- Handles button clicks (Capture, Cancel, Save)
- Displays capture progress (0-100%)
- Shows error messages to users
- Manages screenshot preview and download
- Communicates with background and content scripts
- Implements 120-second timeout for large pages

#### **Styles** (css)

**style.css**
- Glassmorphic design styling
- Responsive layout for popup
- Button animations and transitions
- Progress bar styling
- Error alert styling

---

### **🧪 Tests** (tests)

**test-build.js**
- Original build process tests

**test-build-fixed.js**
- Updated/fixed build process tests
- Validates build output
- Checks file integrity

---

## 🔄 How It Works

### **1. User Interaction Flow**

```
User clicks "Capture" button in popup
         ↓
popup.js initiates capture process
         ↓
Injects content.js into active tab
         ↓
content.js captures page in chunks (if needed)
         ↓
Sends progress updates to popup.js
         ↓
Returns final screenshot data
         ↓
popup.js displays preview and Save button
         ↓
User clicks Save to download
```

### **2. Large Page Handling**

When a page exceeds 32000px height:
1. **content.js** divides page into ~30000px chunks
2. Scrolls to each section sequentially
3. Captures each chunk using canvas API
4. Stitches all chunks into final image
5. Reports progress: "Capturing chunk X of Y"

### **3. Message Communication**

- **PROGRESS** - Content script → Popup (status updates, % complete)
- **CAPTURE_COMPLETE** - Content script → Popup (screenshot data)
- **CAPTURE_ERROR** - Content script → Popup (error messages)
- **CANCEL_CAPTURE** - Popup → Background (user cancellation)

---

## 🚀 Common Commands

```sh
# Install dependencies
npm install

# Build extension for all browsers
npm run build

# Validate extension structure
npm run validate

# Create distribution ZIP files
npm run zip

# Run tests
npm test
```

---

## 📝 Key Features

✅ **Full-page capture** - Captures entire webpage, not just visible area  
✅ **Large page support** - Automatically chunks pages > 32000px  
✅ **Progress tracking** - Real-time percentage and status updates  
✅ **Modern UI** - Glassmorphic design with smooth animations  
✅ **Cross-browser** - Works on Chrome, Edge, and Firefox  
✅ **Error handling** - User-friendly error messages and recovery  
✅ **Preview** - Shows captured screenshot before download  
✅ **Cancellable** - User can abort long-running captures  

---