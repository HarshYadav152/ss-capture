# 🧪 Testing Guide - Privacy Blur/Pixelate Tool

## Prerequisites

1. Build the extension: `npm run build:chrome`
2. Load the extension in Chrome: `chrome://extensions/` → Load unpacked → Select `dist/chrome`

## Test Cases

### TC-001: Basic Blur Effect
**Steps:**
1. Navigate to any webpage
2. Click extension icon
3. Capture a screenshot (any method)
4. Click "Edit Screenshot" button
5. Click "Blur" tool
6. Set intensity to 20
7. Draw a rectangle on the image
8. Click "Save & Close"

**Expected:**
- Editor opens in new window
- Blur tool becomes active (highlighted)
- Rectangle selection appears while drawing
- Blur effect is applied to selected area
- Screenshot is saved with blur effect

### TC-002: Basic Pixelate Effect
**Steps:**
1. Capture a screenshot
2. Click "Edit Screenshot"
3. Click "Pixelate" tool
4. Set pixel size to 15
5. Draw a rectangle on the image
6. Click "Save & Close"

**Expected:**
- Pixelate tool becomes active
- Pixelation effect is applied
- Screenshot saved with pixelation

### TC-003: Multiple Effects
**Steps:**
1. Open editor with screenshot
2. Apply blur to area 1
3. Apply blur to area 2
4. Switch to Pixelate tool
5. Apply pixelate to area 3
6. Save

**Expected:**
- All three effects are applied
- Effect counter shows "Effects: 3"
- All effects visible in saved image

### TC-004: Undo Functionality
**Steps:**
1. Apply 3 blur effects
2. Click "Undo" button
3. Verify effect counter shows "Effects: 2"
4. Click "Undo" again
5. Verify effect counter shows "Effects: 1"

**Expected:**
- Each undo removes last effect
- Counter updates correctly
- Image updates to show remaining effects

### TC-005: Clear All Effects
**Steps:**
1. Apply 5 effects (mix of blur and pixelate)
2. Click "Clear All" button
3. Confirm in dialog

**Expected:**
- Confirmation dialog appears
- All effects removed
- Counter shows "Effects: 0"
- Original image restored

### TC-006: Keyboard Shortcuts
**Steps:**
1. Open editor
2. Press `B` key
3. Verify Blur tool selected
4. Press `P` key
5. Verify Pixelate tool selected
6. Press `V` key
7. Verify Select tool selected
8. Apply an effect
9. Press `Ctrl+Z`
10. Verify effect undone
11. Press `Ctrl+S`
12. Verify save initiated

**Expected:**
- All shortcuts work correctly
- Tool buttons update to show active state

### TC-007: Minimum Selection Size
**Steps:**
1. Select Blur tool
2. Try to draw a very small rectangle (< 10px)
3. Release mouse

**Expected:**
- Effect is NOT applied
- Status shows "Selection too small - drag a larger area"

### TC-008: Intensity Adjustment
**Steps:**
1. Select Blur tool
2. Move slider to minimum (5)
3. Apply effect
4. Undo
5. Move slider to maximum (50)
6. Apply effect

**Expected:**
- Lower intensity = subtle blur
- Higher intensity = heavy blur
- Slider value updates in real-time

### TC-009: Large Screenshot
**Steps:**
1. Capture a full-page screenshot of a long webpage
2. Open editor
3. Apply multiple effects
4. Save

**Expected:**
- Editor handles large image
- Effects apply correctly
- Save completes successfully

### TC-010: Close Without Saving
**Steps:**
1. Open editor
2. Apply some effects
3. Press `Escape` key
4. Click "OK" on confirmation

**Expected:**
- Confirmation dialog appears
- Editor closes
- Changes are NOT saved

### TC-011: Copy and Edit Flow
**Steps:**
1. Capture screenshot
2. Click "Copy to Clipboard"
3. Click "Edit Screenshot"
4. Apply effects
5. Save
6. Verify preview updates

**Expected:**
- Copy works independently
- Edit shows original screenshot
- After save, preview shows edited version

### TC-012: Theme Consistency
**Steps:**
1. Switch extension theme (dark/light)
2. Open editor

**Expected:**
- Editor maintains its own dark theme (glassmorphic)
- No visual glitches

## Performance Benchmarks

| Test | Target | Acceptable |
|------|--------|------------|
| Editor Load Time | < 500ms | < 1000ms |
| Blur Effect (small area) | < 100ms | < 300ms |
| Blur Effect (large area) | < 500ms | < 1500ms |
| Pixelate Effect | < 50ms | < 200ms |
| Undo Operation | < 200ms | < 500ms |
| Save Operation | < 500ms | < 1000ms |

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Primary Target |
| Edge | 88+ | ✅ Compatible |
| Firefox | 109+ | ✅ Compatible |

## Reporting Issues

If you find bugs during testing, please report with:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshot if applicable
5. Console errors (if any)

---

Happy Testing! 🎉
