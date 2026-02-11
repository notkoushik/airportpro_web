// This file's Tesseract.js logic has been removed to prevent build errors.
// Ensure any essential non-Tesseract functions previously here are moved elsewhere
// or confirm this file is truly obsolete.

export const performLivenessCheck = async (videoElement: HTMLVideoElement) => {
  console.error("livenessDetection.ts is obsolete. This function should not be called.");
  console.log(videoElement); // To prevent "unused parameter" errors
  return Promise.resolve({ success: false, error: 'Liveness detection is obsolete.' });
};

// Add back any other exports from this file that ARE still needed,
// ensuring they do not depend on Tesseract.