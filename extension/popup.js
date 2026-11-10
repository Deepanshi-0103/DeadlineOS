/**
 * DeadlineOS Extension Popup Script
 *
 * Auth flow:
 *   1. Check chrome.storage.local for a saved { token, user } object.
 *   2. If absent, show the login form → POST /api/auth/extension-token → store token.
 *   3. If present, show the capture view.
 *
 * Capture flow (Current Page tab — Phase C):
 *   1. Query the active tab to get URL + title.
 *   2. Send GET_PAGE_CONTENT message to the content script.
 *      The content script returns the RENDERED innerText (post-JS execution).
 *   3. POST to /api/capture { type: "text", text, sourceUrl }.
 *      The heuristic pipeline then extracts title, deadline, organiser, etc.
 */

// BASE_URL is loaded from chrome.storage.sync (set via options.html).
// Falls back to localhost:3000. Change via the extension Options page.
let BASE_URL = "http://localhost:3000";

/* ── DOM refs ─────────────────────────────────────────────────────── */
const viewLogin   = document.getElementById("view-login");
const viewCapture = document.getElementById("view-capture");
const btnLogout   = document.getElementById("btn-logout");

const inputEmail    = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const btnLogin      = document.getElementById("btn-login");
const loginError    = document.getElementById("login-error");

const userInfo        = document.getElementById("user-info");
const pageTitle       = document.getElementById("page-title");
const pageUrlEl       = document.getElementById("page-url");
const pageFavicon     = document.getElementById("page-favicon");
const btnCapturePage  = document.getElementById("btn-capture-page");
const inputUrl        = document.getElementById("input-url");
const btnCaptureUrl   = document.getElementById("btn-capture-url");
const captureStatus   = document.getElementById("capture-status");
const tabBtns         = document.querySelectorAll(".tab-btn");
const tabContents     = { page: document.getElementById("tab-page"), url: document.getElementById("tab-url") };
const todayPlanList   = document.getElementById("today-plan-list");
const btnRefreshPlan  = document.getElementById("btn-refresh-plan");
const linkOpenPlan    = document.getElementById("link-open-plan");

/* ── State ────────────────────────────────────────────────────────── */
let authToken = null;
let activeTab = null;

/* ── Init ─────────────────────────────────────────────────────────── */
async function init() {
  // Load configurable base URL from sync storage (set in options page)
  const syncStored = await chrome.storage.sync.get(["baseUrl"]);
  if (syncStored.baseUrl) BASE_URL = syncStored.baseUrl;

  const stored = await chrome.storage.local.get(["token", "user", "rememberedEmail"]);
  if (stored.rememberedEmail && inputEmail) {
    inputEmail.value = stored.rememberedEmail;
  }
  if (stored.token && stored.user) {
    authToken = stored.token;
    showCaptureView(stored.user);
  } else {
    showLoginView();
  }
}

/* ── Views ────────────────────────────────────────────────────────── */
async function showLoginView() {
  viewLogin.style.display   = "flex";
  viewCapture.style.display = "none";
  btnLogout.style.display   = "none";
  const stored = await chrome.storage.local.get(["rememberedEmail"]);
  if (stored.rememberedEmail && inputEmail) {
    inputEmail.value = stored.rememberedEmail;
  }
}

async function showCaptureView(user) {
  viewLogin.style.display   = "none";
  viewCapture.style.display = "flex";
  btnLogout.style.display   = "block";

  userInfo.innerHTML = `<span class="user-dot"></span> Signed in as <strong>${user.name}</strong>`;

  if (linkOpenPlan) {
    linkOpenPlan.href = `${BASE_URL}/plan`;
  }

  // Load active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (tab) {
    pageTitle.textContent = tab.title || "Untitled page";
    pageUrlEl.textContent = tab.url || "";
    inputUrl.value = tab.url || "";

    // Favicon
    if (tab.favIconUrl) {
      pageFavicon.innerHTML = `<img src="${tab.favIconUrl}" alt="" />`;
    }
  }

  loadTodayPlan();
}

/* ── Today's plan ─────────────────────────────────────────────────── */
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadTodayPlan() {
  if (!todayPlanList || !authToken) return;
  todayPlanList.innerHTML = `<p class="today-plan-empty">Loading…</p>`;

  try {
    const res = await fetch(`${BASE_URL}/api/plan`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status === 401) {
      todayPlanList.innerHTML = `<p class="today-plan-empty">Sign in again to see your plan.</p>`;
      return;
    }
    if (!res.ok) {
      todayPlanList.innerHTML = `<p class="today-plan-empty">Couldn’t load plan.</p>`;
      return;
    }

    const data = await res.json();
    const blocks = (data.plan?.blocks || []).filter((b) => b.status !== "skipped");

    if (!blocks.length) {
      todayPlanList.innerHTML = `<p class="today-plan-empty">No blocks yet — open Plan My Day to generate.</p>`;
      return;
    }

    todayPlanList.innerHTML = blocks
      .slice(0, 8)
      .map((b) => {
        const done = b.status === "done" ? " done" : "";
        return `<div class="plan-row${done}" title="${escapeHtml(b.title)}">
          <div class="plan-row-time">${escapeHtml(b.startTime)}<span>${escapeHtml(b.endTime)}</span></div>
          <div class="plan-row-title">${escapeHtml(b.title)}</div>
          <span class="plan-row-cat">${escapeHtml(b.category || "")}</span>
        </div>`;
      })
      .join("");
  } catch {
    todayPlanList.innerHTML = `<p class="today-plan-empty">Server unreachable at ${escapeHtml(BASE_URL)}.</p>`;
  }
}

if (btnRefreshPlan) {
  btnRefreshPlan.addEventListener("click", () => loadTodayPlan());
}

/* ── Login ────────────────────────────────────────────────────────── */
btnLogin.addEventListener("click", async () => {
  const email    = inputEmail.value.trim();
  const password = inputPassword.value;

  if (!email || !password) {
    showError(loginError, "Email and password are required.");
    return;
  }

  btnLogin.disabled     = true;
  btnLogin.textContent  = "Signing in…";
  loginError.style.display = "none";

  try {
    const res = await fetch(`${BASE_URL}/api/auth/extension-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.token) {
      showError(loginError, data.error || "Login failed.");
      return;
    }

    authToken = data.token;
    await chrome.storage.local.set({
      token: data.token,
      user: data.user,
      rememberedEmail: email.toLowerCase(),
    });
    showCaptureView(data.user);
  } catch (err) {
    showError(loginError, `Network error. Is the DeadlineOS server running at ${BASE_URL}?`);
  } finally {
    btnLogin.disabled    = false;
    btnLogin.textContent = "Sign in";
  }
});

// Allow Enter key in password field
inputPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

/* ── Logout ───────────────────────────────────────────────────────── */
btnLogout.addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "user"]);
  authToken = null;
  showLoginView();
});

/* ── Tab switching ────────────────────────────────────────────────── */
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tabName = btn.dataset.tab;
    Object.entries(tabContents).forEach(([key, el]) => {
      el.style.display = key === tabName ? "flex" : "none";
    });
    hideStatus();
  });
});

/* ── Capture: Current Page (Phase C — JS-rendered) ───────────────── */
btnCapturePage.addEventListener("click", async () => {
  if (!activeTab?.id) {
    showStatus("error", "No active tab found.");
    return;
  }

  showStatus("loading", "Reading rendered page (dates, title)…");
  btnCapturePage.disabled = true;

  try {
    let pageText = "";
    let pageUrl = activeTab.url;
    let pageTitleText = activeTab.title || "";

    // Prefer message to content script; re-inject if needed (SPA / late load)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content.js"],
      });
    } catch {
      // already injected or restricted page
    }

    await new Promise((r) => setTimeout(r, 150));

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "GET_PAGE_CONTENT",
      });
      if (response?.success) {
        pageText = response.text || "";
        pageUrl = response.url || pageUrl;
        pageTitleText = response.title || pageTitleText;
      }
    } catch {
      // fall through
    }

    if (!pageText.trim() || pageText.trim().length < 80) {
      showStatus("loading", "Deep-scanning page for deadlines…");
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            const body = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
            const h1 = (document.querySelector("h1")?.innerText || "").trim();
            const labels = [];
            document.querySelectorAll("body *").forEach((el) => {
              const t = (el.textContent || "").replace(/\s+/g, " ").trim();
              if (
                t.length < 200 &&
                /deadline|apply by|registration|last date|ends on/i.test(t)
              ) {
                labels.push(t);
              }
            });
            return [
              h1 ? `Title: ${h1}` : "",
              labels.length ? `DEADLINE LABELS:\n${labels.slice(0, 15).join("\n")}` : "",
              "PAGE TEXT:",
              body.slice(0, 28000),
            ]
              .filter(Boolean)
              .join("\n\n");
          },
        });
        if (result && result.length > pageText.length) pageText = result;
      } catch {
        // ignore
      }
    }

    if (!pageText.trim()) {
      showStatus("loading", "Page text unavailable — capturing URL instead…");
      await captureUrl(pageUrl);
      return;
    }

    showStatus("loading", "AI extracting deadline + details…");

    const res = await fetch(`${BASE_URL}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: "text",
        text: pageText,
        sourceUrl: pageUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      throw new Error(data.error || data.job?.error || "Capture failed");
    }

    const opp = data.opportunity;
    const deadlineBit = opp?.deadline
      ? `deadline ${opp.deadline}`
      : "deadline not found — open Edit to set it";
    const aiBit = data.llmUsed
      ? "AI ok"
      : data.llmError
        ? `AI: ${data.llmError}`
        : "heuristics";
    showStatus(
      "success",
      `✓ Saved “${opp?.title || pageTitleText || "Opportunity"}” (${deadlineBit}, ${aiBit})`
    );
  } catch (err) {
    showStatus("error", err.message || "Something went wrong.");
  } finally {
    btnCapturePage.disabled = false;
  }
});

/* ── Capture: Paste URL ───────────────────────────────────────────── */
btnCaptureUrl.addEventListener("click", async () => {
  const url = inputUrl.value.trim();
  if (!url) {
    showStatus("error", "Please enter a URL.");
    return;
  }
  btnCaptureUrl.disabled = true;
  showStatus("loading", "Fetching page…");
  try {
    await captureUrl(url);
  } finally {
    btnCaptureUrl.disabled = false;
  }
});

async function captureUrl(url) {
  try {
    const res = await fetch(`${BASE_URL}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ type: "url", sourceUrl: url }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (res.status === 401) { await handleUnauthorized(); return; }
      throw new Error(data.error || "Capture failed");
    }

    const opp = data.opportunity;
    showStatus("success", `✓ Saved: "${opp?.title || "Opportunity"}"! Open your inbox to review.`);
  } catch (err) {
    showStatus("error", err.message || "Something went wrong.");
  }
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function showStatus(type, msg) {
  captureStatus.className = `capture-status ${type}`;
  captureStatus.textContent = msg;
  captureStatus.style.display = "block";
}

function hideStatus() {
  captureStatus.style.display = "none";
}

async function handleUnauthorized() {
  await chrome.storage.local.remove(["token", "user"]);
  authToken = null;
  showLoginView();
  showError(loginError, "Session expired. Please sign in again.");
}

/* ── Start ────────────────────────────────────────────────────────── */
init();
