// State variables
let isCancelled = false;

// Helper functions
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function sendProgressUpdate(message, percentComplete = null) {
  chrome.runtime.sendMessage({ 
    type: 'PROGRESS', 
    message,
    percentComplete
  });
}

function sendError(errorMessage) {
  chrome.runtime.sendMessage({ 
    type: 'CAPTURE_ERROR', 
    error: errorMessage
  });
}

// Listen for cancel messages
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CANCEL') {
    isCancelled = true;
  }
});

// Main capture function
async function captureScreenshot() {
   console.log('Starting screenshot capture...');
   
   try {
    sendProgressUpdate('Preparing to capture screenshot...', 0);
    
    // Check browser compatibility
    if (!chrome.runtime) {
      throw new Error('Browser not supported or extension context invalid');
    }
    
    // Calculate page dimensions
    const body = document.body;
    const html = document.documentElement;
    const totalWidth = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth);
    const totalHeight = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight);
    
    // Check if dimensions are valid
    if (totalWidth <= 0 || totalHeight <= 0) {
      throw new Error('Could not determine page dimensions');
    }
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Save original scroll position
    const originalX = window.scrollX;
    const originalY = window.scrollY;
    
    // Handle fixed elements that might overlay screenshots
    const fixedElements = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        fixedElements.push({ el, originalDisplay: style.display });
        el.style.display = 'none';
      }
    });
    
    // Create canvas for the full page
    const canvas = document.createElement('canvas');
    canvas.width = viewportWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }
    
         let currentY = 0;
     let capturedParts = 0;
     const totalParts = Math.ceil(totalHeight / viewportHeight);
     
     // Limit the number of captures to prevent excessive API calls
     const maxCaptures = 50; // Maximum 50 captures per screenshot
     if (totalParts > maxCaptures) {
       throw new Error(`Page is too long (${totalParts} parts). Maximum supported: ${maxCaptures} parts.`);
     }
    
         while (currentY < totalHeight) {
       if (isCancelled) {
         throw new Error('Screenshot cancelled');
       }
       
       capturedParts++;
       const percentComplete = Math.min(Math.round((currentY / totalHeight) * 100), 99);
       sendProgressUpdate(`Capturing part ${capturedParts}/${totalParts} (rate limited for stability)...`, percentComplete);
       
       // Scroll to position
       window.scrollTo(0, currentY);
       await sleep(500); // Increased wait time for rendering
       
       // Add delay between capture calls to respect rate limits (max 2 calls per second)
       if (capturedParts > 1) {
         await sleep(600); // Wait 600ms between captures (ensures < 2 calls per second)
       }
       
       // Capture current viewport with retry mechanism
       let dataUrl;
       let retryCount = 0;
       const maxRetries = 3;
       
       while (retryCount < maxRetries) {
         try {
           dataUrl = await new Promise((resolve, reject) => {
             const captureTimeout = setTimeout(() => {
               reject(new Error('Screenshot capture timed out'));
             }, 10000); // Increased timeout to 10 seconds
             
             chrome.runtime.sendMessage({ type: 'CAPTURE' }, (response) => {
               clearTimeout(captureTimeout);
               if (chrome.runtime.lastError) {
                 reject(new Error(chrome.runtime.lastError.message));
               } else if (!response || response.error) {
                 // Handle quota exceeded error specifically
                 if (response?.error && response.error.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
                   reject(new Error('RATE_LIMIT_EXCEEDED'));
                 } else {
                   reject(new Error(response?.error || 'Failed to capture screenshot'));
                 }
               } else {
                 resolve(response);
               }
             });
           });
           break; // Success, exit retry loop
         } catch (error) {
           retryCount++;
           if (error.message === 'RATE_LIMIT_EXCEEDED' && retryCount < maxRetries) {
             sendProgressUpdate(`Rate limit hit, retrying in 2 seconds... (${retryCount}/${maxRetries})`, null);
             await sleep(2000); // Wait 2 seconds before retry
             continue;
           } else {
             throw error; // Re-throw if max retries reached or other error
           }
         }
       }
      
      // Load image onto canvas
      const img = new Image();
      await new Promise((resolve, reject) => {
        const imgTimeout = setTimeout(() => {
          reject(new Error('Image loading timed out'));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(imgTimeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(imgTimeout);
          reject(new Error('Failed to load captured image'));
        };
        img.src = dataUrl;
      });
      
      // Calculate the actual height to draw (might be less than viewport for last part)
      const drawHeight = Math.min(viewportHeight, totalHeight - currentY);
      
      // Draw to canvas
      ctx.drawImage(img, 0, currentY, viewportWidth, drawHeight);
      
      // Move to next section
      currentY += viewportHeight;
    }
    
    // Restore original state
    window.scrollTo(originalX, originalY);
    
    // Restore fixed elements
    fixedElements.forEach(({ el, originalDisplay }) => {
      el.style.display = originalDisplay;
    });
    
    sendProgressUpdate('Processing screenshot...', 99);
    
    // Convert canvas to data URL and send back
    console.log('Screenshot capture completed successfully');
    const finalScreenshot = canvas.toDataURL('image/png');
    chrome.runtime.sendMessage({ 
      type: 'CAPTURE_COMPLETE', 
      dataUrl: finalScreenshot
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    
    // Restore original scroll position
    window.scrollTo(originalX || 0, originalY || 0);
    
    // Restore fixed elements if they exist
    if (typeof fixedElements !== 'undefined') {
      fixedElements.forEach(({ el, originalDisplay }) => {
        el.style.display = originalDisplay;
      });
    }
    
    // Send error message
    sendError(error.message || 'Unknown error during screenshot capture');
  }
}

// Start the capture process
captureScreenshot();