# Testing Guide - Privacy Blur/Pixelate Tool

## Quick Start Testing

### 1. Load the Extension
```bash
# The extension has been built to: dist/chrome
```

**Chrome/Edge:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `c:\Users\91720\open source\ss-capture\ss-capture\dist\chrome`

**Firefox:**
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from `dist/firefox`

### 2. Basic Feature Test

**Step 1: Capture Screenshot**
1. Navigate to any webpage (e.g., https://github.com)
2. Click the extension icon
3. Click "Capture Full Page"
4. Wait for capture to complete

**Step 2: Open Editor**
1. Click "Edit Screenshot" button (orange/yellow)
2. Editor should open in new window (1200x800)
3. Screenshot should be displayed on canvas

**Step 3: Test Blur Tool**
1. Click "Blur" tool button
2. Adjust intensity slider (try 15-30)
3. Click and drag over an area
4. Blur effect should apply immediately
5. Status should update

**Step 4: Test Pixelate Tool**
1. Click "Pixelate" tool button
2. Adjust pixel size slider (try 10-20)
3. Click and drag over a different area
4. Pixelate effect should apply immediately

**Step 5: Test Undo**
1. Click "Undo" button
2. Last effect should be removed
3. Effect count should decrease

**Step 6: Test Save**
1. Click "Save" button
2. Editor should close
3. Popup should show "Screenshot edited successfully!"
4. Preview should update with edited version

**Step 7: Download**
1. Click "Save Screenshot" in popup
2. File should download as PNG
3. Open file and verify effects are present

## Detailed Test Cases

### Test Case 1: Single Blur Effect
**Steps:**
1. Capture screenshot
2. Open editor
3. Select Blur tool
4. Set intensity to 25
5. Draw rectangle over text
6. Save

**Expected:**
- Text should be blurred
- Effect count shows "Effects: 1"
- Saved screenshot contains blur

### Test Case 2: Multiple Effects
**Steps:**
1. Capture screenshot
2. Open editor
3. Apply blur effect (intensity 20)
4. Apply pixelate effect (size 15)
5. Apply another blur effect (intensity 30)
6. Save

**Expected:**
- All 3 effects visible
- Effect count shows "Effects: 3"
- All effects preserved in saved screenshot

### Test Case 3: Undo Multiple Times
**Steps:**
1. Apply 5 different effects
2. Click Undo 3 times
3. Save

**Expected:**
- Only 2 effects remain
- Effect count shows "Effects: 2"
- Correct effects preserved

### Test Case 4: Clear All
**Steps:**
1. Apply 3 effects
2. Click "Clear All"
3. Confirm dialog
4. Apply new effect
5. Save

**Expected:**
- All effects removed
- New effect applied
- Effect count shows "Effects: 1"

### Test Case 5: Keyboard Shortcuts
**Steps:**
1. Press 'B' key → Blur tool selected
2. Press 'P' key → Pixelate tool selected
3. Press 'V' key → Select tool selected
4. Apply effect
5. Press Ctrl+Z → Effect undone
6. Press Ctrl+S → Editor saves and closes

**Expected:**
- All shortcuts work correctly
- Tools switch properly
- Undo works via keyboard
- Save works via keyboard

### Test Case 6: Large Screenshot
**Steps:**
1. Navigate to long page (e.g., documentation)
2. Capture full page (5000+ px height)
3. Open editor
4. Apply blur effect
5. Save

**Expected:**
- Large screenshot loads correctly
- Effect applies (may take 1-2 seconds)
- Save works without errors

### Test Case 7: Small Selection
**Steps:**
1. Try to draw very small rectangle (< 10px)
2. Release mouse

**Expected:**
- Status shows "Selection too small - Try again"
- No effect applied

### Test Case 8: Close Without Saving
**Steps:**
1. Apply 2 effects
2. Click Close button (X)
3. Confirm dialog

**Expected:**
- Confirmation dialog appears
- Editor closes
- Original screenshot unchanged in popup

### Test Case 9: Intensity Adjustment
**Steps:**
1. Select Blur tool
2. Set intensity to minimum (5)
3. Apply effect → should be subtle
4. Undo
5. Set intensity to maximum (50)
6. Apply effect → should be very blurred

**Expected:**
- Low intensity = subtle blur
- High intensity = strong blur
- Visual difference is clear

### Test Case 10: Tool Cursor Changes
**Steps:**
1. Select each tool
2. Observe cursor over canvas

**Expected:**
- Select tool → default cursor
- Blur tool → circular cursor
- Pixelate tool → square cursor

## Browser Compatibility Testing

### Chrome
- [ ] Extension loads
- [ ] Screenshot captures
- [ ] Editor opens
- [ ] Effects apply
- [ ] Save works

### Edge
- [ ] Extension loads
- [ ] Screenshot captures
- [ ] Editor opens
- [ ] Effects apply
- [ ] Save works

### Firefox
- [ ] Extension loads
- [ ] Screenshot captures
- [ ] Editor opens
- [ ] Effects apply
- [ ] Save works

## Performance Testing

### Test 1: Small Screenshot (< 1000px)
- Should be instant
- No lag or delay

### Test 2: Medium Screenshot (1000-3000px)
- Should be fast (< 1 second per effect)
- Smooth interaction

### Test 3: Large Screenshot (> 5000px)
- May take 1-2 seconds per effect
- Should not freeze browser
- Should complete successfully

## Edge Cases

### Edge Case 1: Very Wide Selection
- Draw rectangle across entire width
- Effect should apply correctly

### Edge Case 2: Very Tall Selection
- Draw rectangle across entire height
- Effect should apply correctly

### Edge Case 3: Overlapping Effects
- Apply blur to area A
- Apply pixelate overlapping area A
- Both effects should be visible

### Edge Case 4: Maximum Effects
- Apply 20+ effects
- All should be tracked
- Undo should work for all

## Bug Reporting Template

If you find any issues, please report using this template:

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Browser:** Chrome/Edge/Firefox [version]
**OS:** Windows/Mac/Linux
**Screenshot Size:** [dimensions]
**Console Errors:** [if any]

**Additional Notes:**
[Any other relevant information]
```

## Success Criteria

The feature is considered working correctly if:
- ✅ All basic test cases pass
- ✅ No console errors
- ✅ Effects are visible and correct
- ✅ Saved screenshots contain effects
- ✅ UI is responsive and smooth
- ✅ Keyboard shortcuts work
- ✅ Works on all supported browsers
- ✅ Performance is acceptable

## Known Limitations

1. **Very Large Images**: Blur/pixelate may take a few seconds on images > 10,000px
2. **Browser Memory**: Very large screenshots may use significant memory
3. **Effect Quality**: Blur uses simplified algorithm for performance

## Next Steps After Testing

1. Report any bugs found
2. Suggest improvements
3. Test on different websites
4. Test with different screenshot sizes
5. Provide feedback on UX

---

**Happy Testing! 🎉**
