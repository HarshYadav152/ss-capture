# Privacy Tool - Testing Guide

## 🧪 Test Cases

### Basic Functionality Tests

#### Test 1: Open Editor
1. Capture a screenshot
2. Click "Edit Screenshot" button
3. **Expected**: Editor window opens with screenshot loaded
4. **Verify**: Canvas displays the screenshot, dimensions shown in status bar

#### Test 2: Blur Tool Basic
1. Open editor with a screenshot
2. Click "Blur" tool button
3. Draw a rectangle over an area (at least 10x10 pixels)
4. **Expected**: Area becomes blurred
5. **Verify**: Effect count shows "1 effect applied"

#### Test 3: Pixelate Tool Basic
1. Open editor with a screenshot
2. Click "Pixelate" tool button
3. Draw a rectangle over an area (at least 10x10 pixels)
4. **Expected**: Area becomes pixelated (blocky)
5. **Verify**: Effect count shows "1 effect applied"

#### Test 4: Intensity Adjustment
1. Open editor with a screenshot
2. Select Blur tool
3. Set intensity to maximum (50)
4. Draw an area
5. **Expected**: Strong blur effect
6. Set intensity to minimum (5)
7. Draw another area
8. **Expected**: Subtle blur effect

#### Test 5: Multiple Effects
1. Open editor with a screenshot
2. Apply blur to area 1
3. Apply pixelate to area 2
4. Apply blur to area 3
5. **Expected**: All 3 effects visible
6. **Verify**: Effect count shows "3 effects applied"

### Undo/Clear Tests

#### Test 6: Undo Single Effect
1. Apply 3 effects
2. Click "Undo" button
3. **Expected**: Last effect removed
4. **Verify**: Effect count shows "2 effects applied"

#### Test 7: Undo Multiple Times
1. Apply 5 effects
2. Click "Undo" 3 times
3. **Expected**: Last 3 effects removed
4. **Verify**: Effect count shows "2 effects applied"

#### Test 8: Undo All
1. Apply 3 effects
2. Click "Undo" 3 times
3. **Expected**: All effects removed, original image restored
4. **Verify**: Effect count shows "0 effects applied"

#### Test 9: Clear All with Confirmation
1. Apply 3 effects
2. Click "Clear All" button
3. **Expected**: Confirmation dialog appears
4. Click "Cancel"
5. **Expected**: Effects remain
6. Click "Clear All" again
7. Click "OK"
8. **Expected**: All effects removed

### Keyboard Shortcuts Tests

#### Test 10: Tool Shortcuts
1. Press `B`
2. **Expected**: Blur tool selected
3. Press `P`
4. **Expected**: Pixelate tool selected
5. Press `V`
6. **Expected**: Select tool selected

#### Test 11: Undo Shortcut
1. Apply 2 effects
2. Press `Ctrl+Z` (or `Cmd+Z` on Mac)
3. **Expected**: Last effect undone

#### Test 12: Save Shortcut
1. Apply some effects
2. Press `Ctrl+S` (or `Cmd+S` on Mac)
3. **Expected**: Editor saves and closes

### Edge Cases

#### Test 13: Small Selection
1. Select Blur tool
2. Draw a tiny area (less than 10x10 pixels)
3. **Expected**: Status message says "Selection too small"
4. **Verify**: No effect applied

#### Test 14: Selection at Canvas Edge
1. Select Blur tool
2. Draw a rectangle at the edge of the canvas
3. **Expected**: Effect applied correctly, no errors

#### Test 15: Cancel Selection
1. Start drawing a selection
2. Press `Escape`
3. **Expected**: Selection cancelled, no effect applied

### Save and Integration Tests

#### Test 16: Save Returns to Popup
1. Apply effects
2. Click "Save"
3. **Expected**: Editor closes
4. **Verify**: Popup shows edited screenshot preview

#### Test 17: Download After Edit
1. Edit screenshot
2. Save
3. In popup, click "Save Screenshot"
4. **Expected**: PNG file downloaded with effects

#### Test 18: Copy After Edit
1. Edit screenshot
2. Save
3. In popup, click "Copy to Clipboard"
4. Paste in image editor
5. **Expected**: Edited image pasted correctly

### Performance Tests

#### Test 19: Large Screenshot
1. Capture a very long page (>5000px)
2. Open editor
3. Apply multiple effects
4. **Expected**: Effects apply within 2 seconds each

#### Test 20: Many Effects
1. Apply 15+ effects to different areas
2. Click "Undo" repeatedly
3. **Expected**: Each undo completes within 1 second

### UI/UX Tests

#### Test 21: Responsive Design
1. Resize editor window to small size
2. **Expected**: Toolbar adapts, labels may hide
3. **Verify**: All buttons remain accessible

#### Test 22: Cursor Changes
1. Select tool - cursor should be default
2. Blur tool - cursor should be crosshair
3. Pixelate tool - cursor should be crosshair

#### Test 23: Status Messages
1. Load editor - "Screenshot loaded..."
2. Select blur - "Blur tool selected..."
3. Apply effect - "Blur effect applied! 1 effect(s) total"
4. Undo - "Effect undone. 0 effect(s) remaining"

## ✅ Test Checklist

- [ ] Blur tool applies correctly
- [ ] Pixelate tool applies correctly
- [ ] Intensity slider works
- [ ] Multiple effects can be applied
- [ ] Undo removes last effect
- [ ] Clear all removes all effects
- [ ] Keyboard shortcuts work
- [ ] Small selections handled
- [ ] Edge selections work
- [ ] Save closes editor
- [ ] Edited screenshot returned to popup
- [ ] Download works with edited image
- [ ] Copy to clipboard works
- [ ] Large images handled
- [ ] UI is responsive
- [ ] Cursor changes correctly
- [ ] Status messages update

## 🐛 Known Limitations

1. Very large images (>10,000px) may take longer to process
2. Maximum recommended effects: ~20 (for performance)
3. Blur uses simplified algorithm (not true Gaussian) for performance
