/**
 * DeadlineOS Content Script — extracts RENDERED page text for Gemini.
 * Focus: opportunity titles + registration/deadline dates (Unstop etc.).
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    try {
      sendResponse({ success: true, ...collectPagePayload() });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }
});

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "IFRAME", "CANVAS", "PATH",
  "HEADER", "NAV", "FOOTER", "ASIDE",
]);

const SKIP_ROLES = new Set(["navigation", "banner", "contentinfo", "complementary"]);

const DEADLINE_LABEL =
  /\b(registration\s*deadline|application\s*deadline|apply\s*by|last\s*date|closes?\s*on|closing\s*date|due\s*date|ends?\s*on|deadline|register\s*by|submission\s*deadline|last\s*day\s*to\s*apply)\b/i;

const DATE_LIKE =
  /\b(?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*'?\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4})\b/i;

function shouldSkipEl(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  if (SKIP_TAGS.has(el.tagName)) return true;
  const role = (el.getAttribute && el.getAttribute("role")) || "";
  if (SKIP_ROLES.has(role)) return true;
  const cls = `${el.className || ""} ${el.id || ""}`.toLowerCase();
  if (/(^|[\s_-])(nav|navbar|menu|footer|cookie|banner|sidebar|breadcrumbs?)([\s_-]|$)/i.test(cls)) {
    return true;
  }
  // Unstop / dashboard chrome
  if (/dashboard|my jobs|notifications|sidebar/i.test(cls) && el.tagName !== "MAIN") {
    return true;
  }
  return false;
}

function walk(node, lines, depth) {
  if (!node || depth > 40) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length > 1) lines.push(t);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (shouldSkipEl(node)) return;

  if (node.shadowRoot) walk(node.shadowRoot, lines, depth + 1);

  const tag = node.tagName;
  const block =
    /^(P|DIV|LI|TR|H1|H2|H3|H4|H5|H6|SECTION|ARTICLE|MAIN|TD|TH|BUTTON|LABEL|SPAN)$/.test(tag);

  if (block && lines.length && lines[lines.length - 1] !== "\n") {
    lines.push("\n");
  }

  for (const child of node.childNodes) {
    walk(child, lines, depth + 1);
  }

  if (block) lines.push("\n");
}

function collectLabeledDeadlines() {
  const hits = [];
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    if (shouldSkipEl(el)) continue;
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!txt || txt.length > 220) continue;

    if (DEADLINE_LABEL.test(txt) || /deadline/i.test(el.className || "") || /deadline/i.test(el.getAttribute("aria-label") || "")) {
      // Include this node + parent + next sibling for date sitting beside label
      const parent = (el.parentElement?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 280);
      const next = (el.nextElementSibling?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
      const combo = [txt.slice(0, 160), next, parent].filter(Boolean).join(" | ");
      if (DATE_LIKE.test(combo) || DEADLINE_LABEL.test(combo)) {
        hits.push(combo);
      }
    }
  }
  return [...new Set(hits)].slice(0, 20);
}

function collectTimeElements() {
  return Array.from(document.querySelectorAll("time[datetime]"))
    .map((t) => {
      const dt = t.getAttribute("datetime") || "";
      const label = (t.textContent || "").trim();
      return `time datetime=${dt} text=${label}`;
    })
    .slice(0, 15);
}

function collectPagePayload() {
  const h1 = (document.querySelector("h1")?.textContent || "").replace(/\s+/g, " ").trim();
  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const title = h1 || ogTitle || document.title || "";

  // Prefer main content; fall back to body
  const root =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector("[role='main']") ||
    document.querySelector("#root") ||
    document.querySelector("#__next") ||
    document.body;

  const lines = [];
  walk(root, lines, 0);
  let bodyText = lines.join(" ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();

  // If we captured mostly chrome, dig deeper into body
  if (bodyText.length < 300 || /Dashboard My Jobs/i.test(bodyText.slice(0, 200))) {
    const lines2 = [];
    walk(document.body, lines2, 0);
    bodyText = lines2.join(" ").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  }

  const labeled = collectLabeledDeadlines();
  const times = collectTimeElements();

  // Extract date-looking lines from body for DEADLINE CONTEXT
  const bodyLines = bodyText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const dateLines = bodyLines.filter(
    (l) => DEADLINE_LABEL.test(l) || (DATE_LIKE.test(l) && l.length < 160)
  );

  const desc =
    document.querySelector('meta[name="description"], meta[property="og:description"]')
      ?.getAttribute("content") || "";

  const prioritized = [
    title ? `Title: ${title}` : "",
    desc ? `Description: ${desc}` : "",
    `Page URL: ${window.location.href}`,
    labeled.length ? `DEADLINE LABELS:\n${labeled.join("\n")}` : "",
    times.length ? `TIME ELEMENTS:\n${times.join("\n")}` : "",
    dateLines.length ? `DEADLINE CONTEXT:\n${dateLines.slice(0, 25).join("\n")}` : "",
    "PAGE TEXT:",
    bodyText.slice(0, 28000),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    text: prioritized.slice(0, 40000),
    url: window.location.href,
    title,
  };
}
