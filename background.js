chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveHighlight",
    title: "Save Highlight",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveHighlight" && info.selectionText) {
    const highlight = {
      id: Date.now(),
      text: info.selectionText.trim(),
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString()
    };

    chrome.storage.local.get({ highlights: [] }, (data) => {
      const highlights = data.highlights;
      highlights.unshift(highlight); // newest first
      chrome.storage.local.set({ highlights });
    });
  }
});
