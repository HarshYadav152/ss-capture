# Privacy Blur/Pixelate Tool - Feature Documentation

## Overview
The Privacy Blur/Pixelate Tool allows users to hide sensitive information (like API keys, passwords, or account balances) before sharing screenshots. This feature integrates seamlessly with the existing screenshot capture workflow.

## Features

### 🔒 Privacy Tools
- **Blur Effect**: Apply Gaussian blur to selected areas
- **Pixelate Effect**: Apply pixelation to selected areas
- **Adjustable Intensity**: Control blur strength (5-50px) or pixel size (5-30px)
- **Multiple Effects**: Apply multiple blur/pixelate effects to different areas
- **Undo Functionality**: Remove the last applied effect
- **Clear All**: Remove all effects at once

### 🎨 User Interface
- **Glassmorphic Design**: Matches the existing extension theme
- **Tool Selection**: Easy-to-use toolbar with visual feedback
- **Real-time Preview**: See effects as you apply them
- **Status Updates**: Clear feedback on actions
- **Keyboard Shortcuts**: Quick access to tools and actions

### ⚡ Performance
- **Optimized Algorithms**: Efficient blur and pixelate implementations
- **Canvas-based**: Uses HTML5 Canvas API for fast rendering
- **Large Image Support**: Handles screenshots of any size

## User Flow

1. **Capture Screenshot** (existing flow)
   - Click extension icon
   - Click "Capture Full Page"
   - Wait for capture to complete

2. **Open Editor**
   - Click "Edit Screenshot" button
   - Editor opens in new window

3. **Apply Effects**
   - Select Blur or Pixelate tool
   - Adjust intensity slider
   - Click and drag to draw rectangle over sensitive area
   - Effect is applied immediately
   - Repeat for multiple areas

4. **Save Changes**
   - Click "Save" button
   - Editor closes and returns to popup
   - Edited screenshot is ready to download

## Keyboard Shortcuts

- **V**: Select tool
- **B**: Blur tool
- **P**: Pixelate tool
- **Ctrl+Z** / **Cmd+Z**: Undo last effect
- **Ctrl+S** / **Cmd+S**: Save and close

## Technical Implementation

### Files Added
```
src/editor/
├── editor.html    # Editor UI
├── editor.js      # Editor logic
└── editor.css     # Editor styling
```

### Files Modified
```
src/popup/
├── popup.html     # Added Edit button
└── popup.js       # Added editor integration

src/css/
└── style.css      # Added btn-warning class

src/
└── manifest.json  # Added storage permission
```

### Key Technologies
- **HTML5 Canvas API**: For image manipulation
- **Stack Blur Algorithm**: For blur effect
- **Downsampling/Upsampling**: For pixelate effect
- **LocalStorage**: For passing data between popup and editor
- **Chrome Extension APIs**: For window management

### Blur Implementation
The blur effect uses a simplified stack blur algorithm:
1. Get image data from selected region
2. Apply horizontal box blur
3. Apply vertical box blur
4. Repeat for better quality
5. Put blurred data back to canvas

### Pixelate Implementation
The pixelate effect uses downsampling:
1. Get image data from selected region
2. Draw to small canvas (downsampled)
3. Disable image smoothing
4. Draw back at original size (pixelated)
5. Re-enable smoothing

## Usage Examples

### Hiding API Keys
1. Capture screenshot containing API key
2. Click "Edit Screenshot"
3. Select Blur tool
4. Set intensity to 30-40
5. Draw rectangle over API key
6. Click Save

### Hiding Personal Information
1. Capture screenshot with personal data
2. Click "Edit Screenshot"
3. Select Pixelate tool
4. Set pixel size to 15-20
5. Draw rectangles over sensitive areas
6. Click Save

### Multiple Areas
1. Apply first effect (blur or pixelate)
2. Select different tool or adjust intensity
3. Apply second effect
4. Repeat as needed
5. Use Undo if needed
6. Click Save when done

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 88+ | ✅ Full Support | Primary target |
| Edge 88+ | ✅ Full Support | Chromium-based |
| Firefox 109+ | ✅ Full Support | Manifest V3 |

## Performance Considerations

- **Large Screenshots**: Blur/pixelate operations are optimized but may take a few seconds for very large images
- **Multiple Effects**: Each effect is stored and can be undone individually
- **Memory Usage**: Original image is kept in memory for undo functionality

## Future Enhancements

Potential improvements for future versions:
- [ ] Adjustable effect regions (resize/move)
- [ ] More effect types (mosaic, gaussian noise)
- [ ] Effect presets (low/medium/high privacy)
- [ ] Export settings
- [ ] Annotation tools (arrows, text)
- [ ] Effect layers management

## Testing

### Manual Testing Checklist
- [x] Blur tool applies correctly
- [x] Pixelate tool applies correctly
- [x] Multiple effects can be applied
- [x] Undo functionality works
- [x] Clear all effects works
- [x] Edited screenshot can be saved
- [x] UI is responsive
- [x] Matches existing design theme
- [x] Works on different screenshot sizes
- [x] Keyboard shortcuts work

### Test Scenarios
1. **Single Blur**: Apply one blur effect and save
2. **Single Pixelate**: Apply one pixelate effect and save
3. **Multiple Effects**: Apply 5+ effects and save
4. **Undo Test**: Apply 3 effects, undo 2, save
5. **Clear Test**: Apply effects, clear all, apply new ones
6. **Large Image**: Test on 4K+ screenshot
7. **Intensity Test**: Test min and max intensity values

## Troubleshooting

### Editor doesn't open
- Check browser console for errors
- Ensure popup blockers are disabled
- Verify manifest.json has correct permissions

### Effects not applying
- Ensure rectangle is large enough (>10px)
- Check browser console for errors
- Try refreshing the extension

### Performance issues
- Reduce blur intensity for faster processing
- Use pixelate instead of blur for large areas
- Close other browser tabs to free memory

## Credits

Implemented as part of Issue #33: "Implement Privacy Blur/Pixelate Tool in Screenshot Editor"

**Tech Stack:**
- JavaScript (ES6+)
- HTML5 Canvas API
- CSS3 (Glassmorphism)
- Chrome Extension APIs

**Author:** Implemented for ss-capture extension
**License:** MIT (same as parent project)
