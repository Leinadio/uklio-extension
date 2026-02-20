// Show badge on LinkedIn profile pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (/linkedin\.com\/in\//.test(tab.url)) {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  }
});

// Also set badge when tab is activated
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && /linkedin\.com\/in\//.test(tab.url)) {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb", tabId });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  } catch {
    // Tab might not exist anymore
  }
});
