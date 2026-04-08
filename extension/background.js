const API_BASE = "https://firstline-bpg9.onrender.com";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "openSidePanel") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === "apiCall") {
    fetch(`${API_BASE}${msg.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.body),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.detail || err.message || String(err) }));
    return true;
  }

  if (msg.action === "saveSenderProfile") {
    chrome.storage.sync.set({ senderProfile: msg.value });
    sendResponse({ ok: true });
  }

  if (msg.action === "saveRole") {
    chrome.storage.sync.set({ role: msg.value });
    sendResponse({ ok: true });
  }

  if (msg.action === "loadSettings") {
    chrome.storage.sync.get(["senderProfile", "role"], (d) => {
      sendResponse({
        senderProfile: d.senderProfile || "",
        role: d.role || "sales",
      });
    });
    return true;
  }
});
