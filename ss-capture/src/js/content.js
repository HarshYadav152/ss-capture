// State variables
let isCancelled = false;

// Constants
const MAX_CANVAS_HEIGHT = 32000; // Browser limit
const CHUNK_HEIGHT = 28000; // Safe chunk size with margin for overlap
const OVERLAP = 100; // Overlap between chunks to ensure seamless stitching

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
  
  let originalX = 0;
  let originalY = 0;
  let fixedElements = [];
  
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
    originalX = window.scrollX;
    originalY = window.scrollY;
    
    // Handle fixed elements
    fixedElements = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        fixedElements.push({ el, originalDisplay: style.display });
        el.style.display = 'none';
      }
    });
    
    // Determine if we need chunking
    const needsChunking = totalHeight > MAX_CANVAS_HEIGHT;
    const numChunks = needsChunking ? Math.ceil(totalHeight / CHUNK_HEIGHT) : 1;
    
    if (needsChunking) {
      sendProgressUpdate(`Page height: ${totalHeight}px. Dividing into ${numChunks} chunks...`, 5);
      await sleep(500);
    }
    
    // Capture chunks
    const chunks = [];
    
    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      if (isCancelled) {
        throw new Error('Screenshot cancelled');
      }
      
      const chunkStartY = chunkIndex * CHUNK_HEIGHT;
      const chunkEndY = Math.min(chunkStartY + CHUNK_HEIGHT + OVERLAP, totalHeight);
      const actualChunkHeight = chunkEndY - chunkStartY;
      
      sendProgressUpdate(
        `Processing chunk ${chunkIndex + 1}/${numChunks}...`,
        Math.round((chunkIndex / numChunks) * 90)
      );
      
      // Create canvas for this chunk
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = viewportWidth;
      chunkCanvas.height = actualChunkHeight;
      const chunkCtx = chunkCanvas.getContext('2d', { willReadFrequently: false });
      
      if (!chunkCtx) {
        throw new Error('Could not create canvas context');
      }
      
      // Capture this chunk viewport by viewport
      let currentY = chunkStartY;
      let capturedParts = 0;
      const totalParts = Math.ceil(actualChunkHeight / viewportHeight);
      
      while (currentY < chunkEndY) {
        if (isCancelled) {
          throw new Error('Screenshot cancelled');
        }
        
        capturedParts++;
        
        // Scroll to position
        window.scrollTo(0, currentY);
        await sleep(300);
        
        // Capture current viewport with retry mechanism
        let dataUrl;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            dataUrl = await new Promise((resolve, reject) => {
              const captureTimeout = setTimeout(() => {
                reject(new Error('Screenshot capture timed out'));
              }, 10000);
              
              chrome.runtime.sendMessage({ type: 'CAPTURE' }, (response) => {
                clearTimeout(captureTimeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (!response || response.error) {
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
            break;
          } catch (error) {
            retryCount++;
            if (error.message === 'RATE_LIMIT_EXCEEDED' && retryCount < maxRetries) {
              await sleep(1000);
              continue;
            } else {
              throw error;
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
        
        // Calculate drawing position relative to chunk
        const drawY = currentY - chunkStartY;
        const drawHeight = Math.min(viewportHeight, chunkEndY - currentY);
        
        // Draw to chunk canvas
        chunkCtx.drawImage(img, 0, drawY, viewportWidth, drawHeight);
        
        // Move to next section
        currentY += viewportHeight;
        
        // Allow garbage collection
        if (capturedParts % 5 === 0) {
          await sleep(100);
        }
      }
      
      chunks.push(chunkCanvas);
    }
    
    // Combine chunks into final canvas
    sendProgressUpdate('Combining chunks into final image...', 92);
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = viewportWidth;
    finalCanvas.height = totalHeight;
    const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: false });
    
    if (!finalCtx) {
      throw new Error('Could not create final canvas context');
    }
    
    for (let i = 0; i < chunks.length; i++) {
      const yPosition = i * CHUNK_HEIGHT;
      finalCtx.drawImage(chunks[i], 0, yPosition);
      
      sendProgressUpdate(
        'Stitching chunks...',
        92 + Math.round((i / chunks.length) * 5)
      );
    }
    
    // Restore original state
    window.scrollTo(originalX, originalY);
    
    // Restore fixed elements
    fixedElements.forEach(({ el, originalDisplay }) => {
      el.style.display = originalDisplay;
    });
    
    sendProgressUpdate('Processing final screenshot...', 98);
    
    // Convert canvas to data URL
    let finalScreenshot;
    try {
      finalScreenshot = finalCanvas.toDataURL('image/png');
    } catch (error) {
      throw new Error('Failed to convert screenshot to image. The page may be too large.');
    }
    
    console.log('Screenshot capture completed successfully');
    chrome.runtime.sendMessage({ 
      type: 'CAPTURE_COMPLETE', 
      dataUrl: finalScreenshot
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    
    // Restore original scroll position
    try {
      window.scrollTo(originalX, originalY);
    } catch (e) {
      console.error('Failed to restore scroll position:', e);
    }
    
    // Restore fixed elements
    fixedElements.forEach(({ el, originalDisplay }) => {
      try {
        el.style.display = originalDisplay;
      } catch (e) {
        console.error('Failed to restore element:', e);
      }
    });
    
    // Send error message
    sendError(error.message || 'Unknown error during screenshot capture');
  }
}

// Start the capture process
captureScreenshot();