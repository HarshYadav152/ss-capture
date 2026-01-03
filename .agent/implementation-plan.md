# Privacy Blur/Pixelate Tool Implementation Plan

## Overview
Implement a screenshot editor with blur and pixelate tools to allow users to hide sensitive information before sharing screenshots.

## Feature Requirements
1. **Blur Tool**: Apply Gaussian blur effect to selected areas
2. **Pixelate Tool**: Apply pixelation effect to selected areas
3. **Selection**: Allow users to draw rectangles to select areas
4. **Adjustable**: Users can modify or remove effects
5. **Integration**: Seamlessly integrate with existing screenshot capture flow

## Technical Architecture

### New Files to Create
1. **`src/editor/editor.html`** - Editor UI
2. **`src/editor/editor.js`** - Editor logic and canvas manipulation
3. **`src/editor/editor.css`** - Editor styling (glassmorphic theme)

### Modified Files
1. **`src/popup/popup.js`** - Add "Edit" button to open editor
2. **`src/popup/popup.html`** - Add Edit button UI
3. **`src/manifest.json`** - Add editor page permissions

## Implementation Steps

### Step 1: Create Editor HTML Structure
- Canvas for screenshot display
- Toolbar with tools: Select, Blur, Pixelate, Undo, Clear, Save
- Intensity/size controls for blur and pixelate
- Modern glassmorphic UI matching existing design

### Step 2: Implement Editor JavaScript
- Canvas initialization with screenshot data
- Tool selection system
- Mouse event handlers for drawing selections
- Blur effect implementation using canvas filters
- Pixelate effect implementation using pixel manipulation
- Undo/redo functionality
- Effect management (store, modify, remove)

### Step 3: Integrate with Popup
- Add "Edit Screenshot" button after capture
- Pass screenshot data to editor via localStorage or message passing
- Handle return from editor with edited screenshot

### Step 4: Styling
- Match glassmorphic design from existing UI
- Responsive layout
- Tool button states and hover effects
- Canvas cursor changes based on active tool

## Technical Details

### Blur Implementation
```javascript
// Use canvas context filter for blur
ctx.filter = `blur(${blurIntensity}px)`;
ctx.drawImage(canvas, x, y, width, height, x, y, width, height);
```

### Pixelate Implementation
```javascript
// Downsample and upsample for pixelation effect
const pixelSize = 10;
ctx.imageSmoothingEnabled = false;
// Draw small then scale up
```

### Effect Storage
```javascript
// Store each effect as an object
effects = [
  { type: 'blur', x, y, width, height, intensity },
  { type: 'pixelate', x, y, width, height, size }
]
```

## User Flow
1. User captures screenshot (existing flow)
2. Preview shows with "Edit" button
3. Click "Edit" → Opens editor in new window/tab
4. User selects tool (Blur/Pixelate)
5. User draws rectangle over sensitive area
6. Effect is applied immediately
7. User can add more effects or undo
8. Click "Save" → Returns to popup with edited screenshot
9. User can download edited screenshot

## Testing Checklist
- [ ] Blur tool applies correctly
- [ ] Pixelate tool applies correctly
- [ ] Multiple effects can be applied
- [ ] Undo functionality works
- [ ] Clear all effects works
- [ ] Edited screenshot can be saved
- [ ] UI is responsive
- [ ] Matches existing design theme
- [ ] Works on different screenshot sizes
- [ ] Performance is acceptable for large images
