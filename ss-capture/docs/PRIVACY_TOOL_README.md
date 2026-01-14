# 🔒 Privacy Blur/Pixelate Tool

## Overview

The Privacy Blur/Pixelate Tool allows users to hide sensitive information (API keys, passwords, account balances, personal data, etc.) in screenshots before sharing them.

## Features

### Core Privacy Tools
- 🌫️ **Blur Tool**: Apply Gaussian blur effect with adjustable intensity (5-50px)
- 🔲 **Pixelate Tool**: Apply pixelation effect with adjustable pixel size (5-30px)
- 📐 **Rectangle Selection**: Click and drag to select areas to blur/pixelate
- 🔄 **Multiple Effects**: Apply multiple blur/pixelate effects to different areas
- ↶ **Undo Functionality**: Remove the last applied effect with one click
- 🗑️ **Clear All**: Remove all effects at once (with confirmation)

### User Experience
- 🎨 **Glassmorphic UI**: Beautiful interface matching the extension's existing design
- ⚡ **Real-time Preview**: See effects applied immediately
- 📊 **Status Updates**: Clear feedback on actions and effect count

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `B` | Select Blur tool |
| `P` | Select Pixelate tool |
| `V` | Select tool (default) |
| `Ctrl+Z` / `Cmd+Z` | Undo last effect |
| `Ctrl+S` / `Cmd+S` | Save and close |
| `Escape` | Close without saving |

## How to Use

### Step 1: Capture a Screenshot
Use any of the capture methods in the extension (Full Page, Visible Area, or Selected Element).

### Step 2: Click "Edit Screenshot"
After capturing, click the yellow "🔒 Edit Screenshot" button to open the Privacy Editor.

### Step 3: Select a Tool
- Click **🌫️ Blur** to apply blur effect
- Click **🔲 Pixelate** to apply pixelation effect

### Step 4: Adjust Intensity
Use the slider to adjust:
- **Blur Radius** (5-50px) - Higher values create more blur
- **Pixel Size** (5-30px) - Higher values create larger pixels

### Step 5: Apply Effects
Click and drag on the screenshot to select the area you want to hide. Release to apply the effect.

### Step 6: Undo if Needed
- Click **↶ Undo** to remove the last effect
- Click **🗑️ Clear All** to remove all effects

### Step 7: Save
Click **💾 Save & Close** to save your edited screenshot.

## Use Cases

### Hiding API Keys
1. Capture screenshot with API key visible
2. Open editor, select Blur tool
3. Set intensity to 30-40px
4. Draw rectangle over API key
5. Save

### Hiding Personal Information
1. Capture screenshot with personal data
2. Open editor, select Pixelate tool
3. Set pixel size to 15-20px
4. Draw rectangles over sensitive areas
5. Save

### Multiple Sensitive Areas
1. Apply blur to email address
2. Apply blur to phone number
3. Apply pixelate to account balance
4. Use Undo if needed
5. Save when satisfied

## Technical Details

### Blur Algorithm
The blur effect uses a **stack blur algorithm** (optimized box blur with multiple passes) that approximates Gaussian blur while maintaining good performance.

### Pixelate Algorithm
The pixelation effect uses **downsampling/upsampling** technique:
1. Sample color from block center
2. Fill entire block with sampled color
3. Repeat for all blocks

### Performance
- Blur/pixelate operations are optimized for speed
- Multiple effects supported (recommended: up to 20 effects)
- Works with large screenshots (5000+ pixels)

## Privacy & Security
- ✅ All processing is done **locally** in your browser
- ✅ No data is sent to external servers
- ✅ Screenshot data is stored temporarily in localStorage
- ✅ Data is cleared after editor closes
- ✅ No network requests for image processing

## Troubleshooting

### Effect not applying?
- Ensure you've selected either Blur or Pixelate tool (not Select)
- Make sure your selection is larger than 10x10 pixels

### Editor won't open?
- Check if popup is still open
- Try capturing a new screenshot

### Can't undo?
- Undo only works if there are effects to remove
- Check the "Effects: X" counter in the status bar

## Contributing

This feature was implemented for Issue #33. Contributions and improvements are welcome!

---

Made with ❤️ for the SS-Capture community
