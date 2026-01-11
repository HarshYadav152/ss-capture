Session Screenshot Panel — Manual E2E test instructions

1) Load the extension (development build)
   - Open Chrome/Edge/Brave and go to chrome://extensions
   - Enable Developer Mode
   - Click "Load unpacked" and select the `ss-capture/` build directory (or run `npm run build:dev` and load `dist/<browser>`)

2) Open a normal web page (not chrome://) and open the extension popup

3) Capture flow
   - Click **Capture Full Page** in the popup
   - Wait for the capture to complete (progress bar)
   - Once complete, preview shows in popup and a thumbnail is generated and added to the session

4) In-popup validation
   - Open the popup's Recent Screenshots panel
   - Verify a thumbnail appears (shows timestamp)
   - Click thumbnail → modal opens with full-size image
   - Use **Download**, **Copy** and **Delete** in the modal and confirm behavior
   - Click **Clear** to clear all session screenshots

5) In-page panel validation
   - On the same page you visited, the in-page panel (bottom-right) should appear
   - Expand it and confirm the same thumbnail is visible
   - Click thumbnail → modal opens on page
   - Confirm Download/Copy/Delete behave as above

6) Memory / size check
   - Capture multiple screenshots (20+), confirm that old items are removed (cap at 20)

7) Edge cases
   - Try capturing quickly more than twice per second to confirm rate-limiting	
   - Capture on pages with cross-origin iframes (may fail to capture portion)

Notes
- Thumbnail generation happens inside the popup (smaller canvas) to avoid background service worker DOM usage.
- Session store is in-memory (service worker) and will be cleared when the extension service worker restarts.
