/**
 * Content script — runs on every page at document_idle.
 *
 * Responsibilities:
 *  1. Detect whether the current page looks like a job posting.
 *  2. Detect whether the page contains an application form.
 *  3. Listen for a DO_FILL message from the background worker and fill
 *     form fields with the user's profile data.
 *  4. Notify the popup (via chrome.runtime.sendMessage) about page context
 *     so the popup can show relevant actions.
 */

// ── JD detection ──────────────────────────────────────────────────────────────

/**
 * Heuristic: look for common job-posting keywords in the page text.
 * Returns true when the page is likely a job posting.
 */
function isJobPage() {
  const text = document.body?.innerText?.toLowerCase() ?? "";
  const signals = [
    "job description",
    "responsibilities",
    "qualifications",
    "requirements",
    "we are looking for",
    "about the role",
    "what you'll do",
    "what we're looking for",
    "apply now",
    "apply for this job",
  ];
  const hits = signals.filter((s) => text.includes(s));
  return hits.length >= 2;
}

/**
 * Try to extract the company name from common meta tags and page patterns.
 */
function extractCompany() {
  // LinkedIn
  const li = document.querySelector(".job-details-jobs-unified-top-card__company-name");
  if (li) return li.innerText.trim();

  // Indeed
  const ind = document.querySelector("[data-company-name]");
  if (ind) return ind.getAttribute("data-company-name").trim();

  // Greenhouse / Lever / generic og:site_name
  const og = document.querySelector('meta[property="og:site_name"]');
  if (og) return og.getAttribute("content")?.trim() ?? "";

  // Fallback: hostname
  return window.location.hostname.replace(/^www\./, "").split(".")[0];
}

/**
 * Try to extract the job title from the page.
 */
function extractJobTitle() {
  // LinkedIn
  const li = document.querySelector(".job-details-jobs-unified-top-card__job-title h1");
  if (li) return li.innerText.trim();

  // Lever
  const lev = document.querySelector(".posting-headline h2");
  if (lev) return lev.innerText.trim();

  // Greenhouse
  const gh = document.querySelector("#header h1");
  if (gh) return gh.innerText.trim();

  // Indeed
  const ind = document.querySelector('[class*="jobTitle"] h1, [class*="job-title"] h1');
  if (ind) return ind.innerText.trim();

  // Generic: first <h1>
  const h1 = document.querySelector("h1");
  return h1 ? h1.innerText.trim() : "";
}

/**
 * Extract a reasonable slice of the job description text (first 3000 chars).
 */
function extractJdText() {
  // Greenhouse
  const gh = document.querySelector("#content");
  if (gh) return gh.innerText.trim().slice(0, 3000);

  // Lever
  const lev = document.querySelector(".posting-description");
  if (lev) return lev.innerText.trim().slice(0, 3000);

  // LinkedIn
  const li = document.querySelector(".jobs-description__content");
  if (li) return li.innerText.trim().slice(0, 3000);

  // Indeed
  const ind = document.querySelector("#jobDescriptionText");
  if (ind) return ind.innerText.trim().slice(0, 3000);

  // Fallback: body text
  return document.body.innerText.trim().slice(0, 3000);
}

// ── Form detection ────────────────────────────────────────────────────────────

/**
 * Returns true if the page has a form that looks like a job application.
 */
function hasApplicationForm() {
  const inputs = Array.from(document.querySelectorAll("input, textarea"));
  const labels = inputs
    .map((el) => {
      const label = document.querySelector(`label[for="${el.id}"]`);
      return (label?.innerText ?? el.placeholder ?? el.name ?? "").toLowerCase();
    })
    .join(" ");

  const formSignals = ["first name", "last name", "email", "phone", "resume", "cover letter", "linkedin"];
  return formSignals.filter((s) => labels.includes(s)).length >= 2;
}

// ── Auto-fill ─────────────────────────────────────────────────────────────────

/**
 * Maps a normalised label string to a profile value.
 * @param {string} label  — lowercased field label/placeholder/name
 * @param {object} profile — user profile from the API
 * @param {object} workExps — work experience list
 * @param {object} educations — education list
 */
function resolveValue(label, profile, workExps, educations) {
  if (label.includes("first name") || label === "first") {
    return profile.full_name?.split(" ")[0] ?? "";
  }
  if (label.includes("last name") || label === "last") {
    const parts = profile.full_name?.split(" ") ?? [];
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  if (label.includes("full name") || label.includes("your name")) {
    return profile.full_name ?? "";
  }
  if (label.includes("email")) return profile.email ?? "";
  if (label.includes("phone")) return profile.phone ?? "";
  if (label.includes("address") || label.includes("location")) return profile.address ?? "";
  if (label.includes("linkedin")) return profile.linkedin_url ?? "";
  if (label.includes("github")) return profile.github_url ?? "";
  if (label.includes("portfolio") || label.includes("website")) return profile.portfolio_url ?? "";
  if (label.includes("nationality") || label.includes("citizenship")) return profile.nationality ?? "";
  if (label.includes("visa") || label.includes("work authorization")) return profile.visa_status ?? "";

  // Current company from most recent work experience
  if (label.includes("current company") || label.includes("employer")) {
    const current = workExps?.find((e) => e.is_current) ?? workExps?.[0];
    return current?.company ?? "";
  }
  if (label.includes("current title") || label.includes("job title") || label.includes("position")) {
    const current = workExps?.find((e) => e.is_current) ?? workExps?.[0];
    return current?.title ?? "";
  }

  // Most recent school
  if (label.includes("school") || label.includes("university") || label.includes("college")) {
    return educations?.[0]?.school ?? "";
  }
  if (label.includes("degree")) return educations?.[0]?.degree ?? "";
  if (label.includes("major") || label.includes("field of study")) {
    return educations?.[0]?.field_of_study ?? "";
  }
  if (label.includes("gpa")) return educations?.[0]?.gpa ?? "";

  return null; // no match
}

/**
 * Fill a single input/textarea element.
 */
function fillField(el, value) {
  if (!value) return;

  // React / Vue controlled inputs need the native input setter trick
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  if (el.tagName === "TEXTAREA" && nativeTextareaSetter) {
    nativeTextareaSetter.call(el, value);
  } else if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  // Dispatch events so frameworks detect the change
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Walk all visible inputs/textareas on the page and fill matched ones.
 */
function autoFill({ profile, work_experiences, educations }) {
  const fields = Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=file]), textarea"));
  let filled = 0;

  fields.forEach((el) => {
    const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
    const labelText = (
      labelEl?.innerText ??
      el.placeholder ??
      el.getAttribute("aria-label") ??
      el.name ??
      ""
    ).toLowerCase();

    const value = resolveValue(labelText, profile, work_experiences, educations);
    if (value) {
      fillField(el, value);
      filled++;
    }
  });

  return filled;
}

// ── Floating badge ────────────────────────────────────────────────────────────

/**
 * Inject a small "Job Tracker" badge in the bottom-right corner when a job
 * page is detected. Clicking it opens the extension popup.
 * The badge is only shown once per page load.
 */
function injectBadge() {
  if (document.getElementById("jt-badge")) return;

  const badge = document.createElement("div");
  badge.id = "jt-badge";
  badge.innerText = "💼 Job Tracker";
  Object.assign(badge.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#2563eb",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "9999px",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "sans-serif",
    cursor: "pointer",
    zIndex: "2147483647",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    userSelect: "none",
    transition: "opacity 0.2s",
  });

  badge.addEventListener("mouseenter", () => { badge.style.opacity = "0.85"; });
  badge.addEventListener("mouseleave", () => { badge.style.opacity = "1"; });

  // Clicking the badge sends a message so the background can open the popup
  // (chrome.action.openPopup is not available to content scripts directly)
  badge.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
  });

  document.body.appendChild(badge);
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_PAGE_CONTEXT") {
    sendResponse({
      isJobPage: isJobPage(),
      hasForm: hasApplicationForm(),
      company: extractCompany(),
      jobTitle: extractJobTitle(),
      jdText: extractJdText(),
      url: window.location.href,
    });
    return;
  }

  if (msg.type === "DO_FILL") {
    const count = autoFill(msg.payload);
    sendResponse({ ok: true, filled: count });
    return;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

if (isJobPage()) {
  injectBadge();
}
