/**
 * LinkedIn Profile Parser — modular, section-based, with fallback selectors.
 */

// ── Selector helpers ──

function getFirst(...selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    const text = el?.innerText?.trim();
    if (text) return text;
  }
  return "";
}

function queryFirst(...selectors) {
  for (const s of selectors) {
    const els = document.querySelectorAll(s);
    if (els.length > 0) return els;
  }
  return [];
}

// ── Section parsers ──

function parseName() {
  return getFirst(
    "h1.text-heading-xlarge",
    "h1.inline.t-24",
    ".pv-top-card--list h1",
    ".ph5 h1",
    // Last resort: any h1 inside main content
    "main h1",
    "h1"
  );
}

function parseHeadline() {
  return getFirst(
    ".text-body-medium.break-words",
    ".pv-top-card--list .text-body-medium",
    ".ph5 .text-body-medium",
    "[data-generated-suggestion-target] .text-body-medium"
  );
}

function parseLocation() {
  return getFirst(
    ".text-body-small.inline.t-black--light.break-words",
    ".pv-top-card--list .text-body-small",
    ".ph5 span.text-body-small"
  );
}

function parseAbout() {
  // Try multiple strategies for the About section
  const text = getFirst(
    "#about ~ div .inline-show-more-text",
    "#about ~ div span[aria-hidden='true']",
    "#about + div + div span.visually-hidden",
    "#about ~ div .pv-shared-text-with-see-more span[aria-hidden]"
  );

  // Fallback: find section by heading text
  if (!text) {
    const headings = document.querySelectorAll("section h2 span, section h2");
    for (const h of headings) {
      const t = h.innerText?.trim()?.toLowerCase();
      if (t === "about" || t === "о себе" || t === "info") {
        const section = h.closest("section");
        if (section) {
          const span = section.querySelector(
            ".inline-show-more-text, span[aria-hidden='true'], .pv-shared-text-with-see-more span"
          );
          if (span) return span.innerText.trim();
        }
      }
    }
  }

  return text;
}

function parseExperience() {
  const items = queryFirst(
    "#experience ~ div .pvs-list__outer-container li.artdeco-list__item",
    "#experience ~ div ul li.artdeco-list__item",
    "section[id='experience'] li"
  );

  // Fallback: find experience section by heading text
  let expItems = Array.from(items);
  if (expItems.length === 0) {
    const headings = document.querySelectorAll("section h2 span, section h2");
    for (const h of headings) {
      const t = h.innerText?.trim()?.toLowerCase();
      if (t === "experience" || t === "опыт работы" || t === "опыт") {
        const section = h.closest("section");
        if (section) {
          expItems = Array.from(section.querySelectorAll("li"));
          break;
        }
      }
    }
  }

  return expItems
    .slice(0, 3)
    .map((li) => {
      const title =
        li.querySelector(".t-bold .visually-hidden")?.innerText?.trim() ||
        li.querySelector(".t-bold span[aria-hidden]")?.innerText?.trim() ||
        li.querySelector(".t-bold")?.innerText?.trim() ||
        "";
      const company =
        li.querySelector(".t-normal .visually-hidden")?.innerText?.trim() ||
        li.querySelector(".t-normal span[aria-hidden]")?.innerText?.trim() ||
        li.querySelector(".t-14.t-normal")?.innerText?.trim() ||
        "";
      return [title, company].filter(Boolean).join(" @ ");
    })
    .filter(Boolean);
}

function deriveCompanyAndRole(headline, experience) {
  const company =
    experience[0]?.split(" @ ")[1] ||
    headline.split(" at ").slice(1).join(" at ") ||
    headline.split(" @ ").slice(1).join(" @ ") ||
    "";

  const currentRole =
    experience[0]?.split(" @ ")[0] ||
    headline.split(" at ")[0]?.trim() ||
    headline.split(" @ ")[0]?.trim() ||
    "";

  return { company, currentRole };
}

// ── Main extraction ──

function extractLinkedInProfile() {
  const name = parseName();
  const headline = parseHeadline();
  const location = parseLocation();
  const about = parseAbout();
  const experience = parseExperience();
  const { company, currentRole } = deriveCompanyAndRole(headline, experience);

  return {
    name,
    headline,
    current_role: currentRole,
    current_company: company,
    location,
    about: (about || "").slice(0, 1000),
    experience,
    profile_url: window.location.href,
  };
}

// ── Wait for h1 to appear, then extract ──

function waitForProfile(timeoutMs = 15000) {
  return new Promise((resolve) => {
    // Try immediately first
    const profile = extractLinkedInProfile();
    if (profile.name) {
      resolve(profile);
      return;
    }

    // Watch DOM for h1 to appear
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearTimeout(timeout);
      // Small delay after h1 appears — let LinkedIn finish rendering nearby elements
      setTimeout(() => resolve(extractLinkedInProfile()), 300);
    };

    const observer = new MutationObserver(() => {
      // Check if any h1 now has text content
      const h1 = document.querySelector("h1");
      if (h1 && h1.innerText.trim()) {
        done();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Timeout fallback — return whatever we have
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(extractLinkedInProfile());
      }
    }, timeoutMs);
  });
}

// ── Message listener ──

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "extractProfile") {
    waitForProfile().then(sendResponse);
    return true;
  }
  return true;
});

// ── Floating button ──

function injectFloatingButton() {
  if (document.getElementById("firstline-fab")) return;

  const btn = document.createElement("button");
  btn.id = "firstline-fab";
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>FirstLine</span>`;

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
    transition: "all 0.2s ease",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.5)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 14px rgba(79, 70, 229, 0.4)";
  });

  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openSidePanel" });
  });

  document.body.appendChild(btn);
}

// ── Button management via polling ──
// Show button on profile pages, hide on other pages.

setInterval(() => {
  const onProfile = window.location.pathname.startsWith("/in/");
  const btnExists = document.getElementById("firstline-fab");

  if (onProfile && !btnExists) {
    injectFloatingButton();
  } else if (!onProfile && btnExists) {
    btnExists.remove();
  }
}, 500);
