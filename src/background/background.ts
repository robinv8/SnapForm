// Background service worker for Chrome extension

chrome.runtime.onInstalled.addListener(() => {
  // Extension installed or updated
});

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  return true;
});

export {};
