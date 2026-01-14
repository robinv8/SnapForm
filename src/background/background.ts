// Background service worker for Chrome extension

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('FormFiller Pro: Extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Currently just a passthrough, but can be extended for:
  // - API key management
  // - Cross-tab communication
  // - Background data processing
  console.log('Background received message:', message);
  return true;
});

export {};
