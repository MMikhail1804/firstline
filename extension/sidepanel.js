// ── State ──
let profile = null;
let insights = [];
let currentRole = "sales";

// ── Role config ──
const ROLE_CONFIG = {
  sales: {
    senderLabel: "About you / your product",
    senderPlaceholder: "e.g. I sell an AI-powered QA tool that saves engineering teams 10+ hours/week",
    goals: [
      { value: "book_demo", label: "Book a Demo / Meeting" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
  recruiter: {
    senderLabel: "About the role / company",
    senderPlaceholder: "e.g. Hiring a Senior Backend Engineer at Acme Corp. Remote, $180-220k, building real-time data pipeline",
    goals: [
      { value: "pitch_role", label: "Pitch a Role" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
  founder: {
    senderLabel: "About your startup",
    senderPlaceholder: "e.g. I'm building an AI tool for sales teams. Looking for design partners and early adopters in B2B SaaS",
    goals: [
      { value: "book_meeting", label: "Book a Meeting" },
      { value: "start_conversation", label: "Start a Conversation" },
    ],
  },
};

// ── DOM refs ──
const $ = (id) => document.getElementById(id);

const senderProfile = $("senderProfile");
const senderLabel = $("senderLabel");
const saveSenderBtn = $("saveSenderBtn");
const analyzeBtn = $("analyzeBtn");
const profileInfo = $("profileInfo");
const status = $("status");
const insightsSection = $("insightsSection");
const insightsList = $("insightsList");
const generateSection = $("generateSection");
const goalSelect = $("goalSelect");
const generateBtn = $("generateBtn");
const resultsSection = $("resultsSection");
const message1 = $("message1");
const message2 = $("message2");
const resetBtn = $("resetBtn");

// ── Helpers ──

function setStatus(text, isError = false) {
  status.textContent = text;
  status.className = isError ? "status error" : "status";
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

async function apiCall(endpoint, body) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "apiCall", endpoint, body },
      (res) => {
        if (res?.ok) resolve(res.data);
        else reject(new Error(res?.error || "API call failed"));
      }
    );
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ── Role Selector ──

function setRole(role) {
  currentRole = role;
  const config = ROLE_CONFIG[role];

  // Update active button
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });

  // Update sender label and placeholder
  senderLabel.textContent = config.senderLabel;
  senderProfile.placeholder = config.senderPlaceholder;

  // Update goal options
  goalSelect.innerHTML = "";
  config.goals.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    goalSelect.appendChild(opt);
  });

  // Save role
  chrome.runtime.sendMessage({ action: "saveRole", value: role });
}

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", () => setRole(btn.dataset.role));
});

// ── Load saved settings ──

chrome.runtime.sendMessage({ action: "loadSettings" }, (res) => {
  if (res?.role) setRole(res.role);
  else setRole("sales");
  if (res?.senderProfile) senderProfile.value = res.senderProfile;
});

// ── Save sender profile ──

saveSenderBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "saveSenderProfile", value: senderProfile.value });
  saveSenderBtn.textContent = "Saved!";
  setTimeout(() => (saveSenderBtn.textContent = "Save"), 1500);
});

// ── Step 1: Analyze Profile ──

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  setStatus("Reading profile...");

  try {
    const tab = await getActiveTab();

    if (!tab?.url?.includes("linkedin.com/in/")) {
      setStatus("Open a LinkedIn profile first", true);
      analyzeBtn.disabled = false;
      return;
    }

    // Try to extract profile from content script
    try {
      profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
    } catch {
      // Content script not loaded — inject programmatically
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content_script.js"],
      });
      await new Promise((r) => setTimeout(r, 300));
      profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
    }

    // If name not found (SPA navigation from feed) — reload page and retry once
    if (!profile?.name) {
      setStatus("Refreshing page...");
      await chrome.tabs.reload(tab.id);

      // Wait for page to load
      await new Promise((resolve) => {
        const onUpdated = (tabId, info) => {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
        // Safety timeout
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }, 10000);
      });

      // Wait a bit more for LinkedIn to render content
      await new Promise((r) => setTimeout(r, 1000));

      try {
        profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content_script.js"],
        });
        await new Promise((r) => setTimeout(r, 500));
        profile = await chrome.tabs.sendMessage(tab.id, { action: "extractProfile" });
      }
    }

    if (!profile?.name) {
      setStatus("Could not read profile. Scroll down and retry.", true);
      analyzeBtn.disabled = false;
      return;
    }

    profileInfo.innerHTML = `
      <div class="name">${profile.name}</div>
      <div class="headline">${profile.headline || profile.current_role}</div>
    `;
    show(profileInfo);

    setStatus("Finding insights...");
    const res = await apiCall("/api/insights", { profile, role: currentRole });
    insights = res.insights;

    renderInsights(insights);
    show(insightsSection);
    show(generateSection);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }

  analyzeBtn.disabled = false;
});

// ── Step 2: Render Insights ──

function renderInsights(items) {
  insightsList.innerHTML = "";

  items.forEach((insight, i) => {
    const div = document.createElement("div");
    div.className = "insight-item selected";
    div.innerHTML = `
      <input type="checkbox" checked data-index="${i}" />
      <div>
        <div class="insight-text">${insight.text}</div>
        <div class="insight-type">${insight.type.replace(/_/g, " ")}</div>
      </div>
    `;

    const checkbox = div.querySelector("input");
    div.addEventListener("click", (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      div.classList.toggle("selected", checkbox.checked);
    });
    checkbox.addEventListener("change", () => {
      div.classList.toggle("selected", checkbox.checked);
    });

    insightsList.appendChild(div);
  });
}

function getSelectedInsights() {
  const checkboxes = insightsList.querySelectorAll("input[type='checkbox']");
  return Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => insights[parseInt(cb.dataset.index)]);
}

// ── Step 3: Generate Messages ──

generateBtn.addEventListener("click", async () => {
  const selected = getSelectedInsights();

  if (selected.length === 0) {
    setStatus("Select at least one insight", true);
    return;
  }

  generateBtn.disabled = true;
  setStatus("Generating messages...");

  // Auto-save
  if (senderProfile.value) {
    chrome.runtime.sendMessage({ action: "saveSenderProfile", value: senderProfile.value });
  }

  try {
    const res = await apiCall("/api/generate", {
      profile,
      selected_insights: selected,
      goal: goalSelect.value,
      sender_profile: senderProfile.value,
      role: currentRole,
    });

    // Show approach card
    const approachCard = $("approachCard");
    if (res.angle) {
      $("approachAngle").textContent = res.angle;
      const parts = [res.reason, res.goal_applied].filter(Boolean);
      $("approachSub").textContent = parts.join(" — ");
      show(approachCard);
    } else {
      hide(approachCard);
    }

    message1.value = res.message_1;
    message2.value = res.message_2;
    show(resultsSection);
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }

  generateBtn.disabled = false;
});

// ── Tabs ──

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ── Copy ──

document.querySelectorAll(".btn-copy").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const textarea = document.getElementById(btn.dataset.target);
    await navigator.clipboard.writeText(textarea.value);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
});

// ── Reset ──

resetBtn.addEventListener("click", () => {
  profile = null;
  insights = [];
  hide(profileInfo);
  hide(insightsSection);
  hide(generateSection);
  hide(resultsSection);
  hide($("approachCard"));
  insightsList.innerHTML = "";
  message1.value = "";
  message2.value = "";
  setStatus("");
});
