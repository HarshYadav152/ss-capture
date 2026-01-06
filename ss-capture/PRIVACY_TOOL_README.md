# 🔒 Privacy Blur/Pixelate Tool

A powerful privacy feature for SS-Capture that allows users to hide sensitive information (API keys, passwords, account balances, personal data, etc.) before sharing screenshots.

## 🎯 Problem Solved

Users often need to redact sensitive information from screenshots, but existing tools (rectangles or pens) aren't ideal for this purpose. This feature adds professional privacy tools with adjustable intensity controls.

## ✨ Features

### Privacy Tools
| Tool | Description | Shortcut |
|------|-------------|----------|
| 🌫️ **Blur** | Apply Gaussian-approximated blur effect | `B` |
| 🔲 **Pixelate** | Apply mosaic/pixelation effect | `P` |
| 👆 **Select** | Default selection mode | `V` |

### Controls
- **Intensity Slider**: Adjust effect strength (5-50)
- **Undo Button**: Remove last effect (`Ctrl+Z`)
- **Clear All**: Remove all effects
- **Save**: Save and return to popup (`Ctrl+S`)

### User Experience
- 🎨 Beautiful glassmorphic UI matching SS-Capture's design
- ⚡ Real-time effect preview
- 📊 Status updates and effect counter
- 📱 Responsive design for different screen sizes
- 📲 Touch device support

## 🚀 How to Use

1. **Capture** a screenshot using the extension
2. **Click** the "Edit Screenshot" button (orange/yellow)
3. **Select** Blur or Pixelate tool from the toolbar
4. **Adjust** intensity using the slider
5. **Draw** rectangles over sensitive areas
6. **Repeat** for multiple areas if needed
7. **Undo** mistakes if necessary
8. **Save** when finished

## 📷 Usage Examples

### Example 1: Hiding API Keys
1. Capture screenshot with API key visible
2. Open editor, select Blur tool
3. Set intensity to 30-40
4. Draw rectangle over API key
5. Save

### Example 2: Hiding Personal Information
1. Capture screenshot with personal data
2. Open editor, select Pixelate tool
3. Set pixel size to 15-20
4. Draw rectangles over email, phone, etc.
5. Save

### Example 3: Multiple Sensitive Areas
1. Apply blur to email address
2. Apply blur to phone number
3. Apply pixelate to account balance
4. Undo and adjust if needed
5. Save

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `B` | Select Blur tool |
| `P` | Select Pixelate tool |
| `V` | Select tool (default) |
| `Ctrl/Cmd + Z` | Undo last effect |
| `Ctrl/Cmd + S` | Save and close |
| `Esc` | Cancel current selection |

## 🔧 Technical Details

### Blur Algorithm
Uses a stack blur approximation (box blur applied multiple times):
- 3 iterations of horizontal + vertical box blur
- Provides smooth results with good performance
- Intensity controls the blur radius

### Pixelate Algorithm
Uses color averaging technique:
- Divides area into pixel-sized blocks
- Calculates average color for each block
- Fills block with the average color

### Performance
- Optimized for images up to 10,000px
- Supports 20+ effects per image
- Sub-second effect application

## 🔐 Privacy & Security

- ✅ **100% Local Processing**: No data leaves your device
- ✅ **No External Servers**: Everything happens in your browser
- ✅ **Temporary Storage**: Data cleared when editor closes
- ✅ **No Analytics**: No tracking or data collection

## 📦 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Full Support |
| Edge | 88+ | ✅ Full Support |
| Firefox | 109+ | ✅ Full Support |

## 🐛 Known Limitations

1. Very large images (>10,000px) may process slower
2. Maximum recommended effects: ~20
3. Blur uses simplified algorithm for performance

## 📝 License

This feature is part of SS-Capture, licensed under the MIT License.
