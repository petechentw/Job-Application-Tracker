/**
 * Popup controller.
 *
 * Views:
 *   - login      → not authenticated
 *   - main       → authenticated, on a job page  (save + fill actions)
 *   - idle       → authenticated, not a job page (just shows account info)
 */

const app = document.getElementById("app");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Send a message to the background service worker. */
function bg(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

/** Escape HTML to prevent XSS from page-extracted text. */
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Get the currently active browser tab. */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** Ask the content script for the page context (job info, form presence). */
async function getPageContext(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_CONTEXT" });
  } catch {
    // Content script not injected (e.g. chrome:// page)
    return { isJobPage: false, hasForm: false, company: "", jobTitle: "", jdText: "", url: "" };
  }
}

// ── Views ─────────────────────────────────────────────────────────────────────

/** Show the login form. */
function renderLogin(errorMsg = "") {
  app.innerHTML = `
    <div class="body">
      <p class="login-title">💼 Job Tracker</p>
      ${errorMsg ? `<p class="error-msg">${esc(errorMsg)}</p>` : ""}
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <button class="btn btn-primary" id="login-btn">Sign In</button>
    </div>
  `;

  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const loginBtn   = document.getElementById("login-btn");

  const doLogin = async () => {
    const email    = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) return;
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";
    const res = await bg("LOGIN", { email, password });
    if (res.ok) {
      init();
    } else {
      renderLogin(res.error ?? "Login failed");
    }
  };

  loginBtn.addEventListener("click", doLogin);
  passInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
}

/** Show the main authenticated view. */
async function renderMain(user, ctx, tab) {
  // Fetch resumes and profile data in parallel
  const [resumesRes, profileRes, workRes, eduRes] = await Promise.all([
    bg("LIST_RESUMES"),
    bg("GET_PROFILE"),
    bg("GET_WORK_EXPERIENCES"),
    bg("GET_EDUCATIONS"),
  ]);

  const resumes        = resumesRes.ok ? resumesRes.resumes : [];
  const activeResumes  = resumes.filter((r) => r.is_active);
  const historyResumes = resumes.filter((r) => !r.is_active);

  // Track which resume is selected for saving with the job
  let selectedResumeId = activeResumes[0]?.id ?? resumes[0]?.id ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderResumeList = () => {
    const all = [...activeResumes, ...historyResumes];
    if (all.length === 0) {
      return `<p style="font-size:12px;color:#6b7280;">No resumes found. Upload one in the web app.</p>`;
    }
    return all.map((r) => {
      const selected = r.id === selectedResumeId ? "selected" : "";
      const badgeClass = r.is_active ? "active" : "history";
      const badgeText  = r.is_active ? "Active" : "History";
      const tags = (r.tags ?? []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
      return `
        <div class="resume-item ${selected}" data-id="${esc(r.id)}">
          <span class="ri-name">${esc(r.name)}</span>
          <span class="ri-badge ${badgeClass}">${badgeText}</span>
        </div>
        ${tags ? `<div class="tags" style="padding:0 10px 6px;">${tags}</div>` : ""}
      `;
    }).join("");
  };

  app.innerHTML = `
    <div class="header">
      <span class="header-logo">💼 Job Tracker</span>
      <span class="header-email">${esc(user.email)}</span>
    </div>
    <div class="body">

      ${ctx.isJobPage ? `
        <div class="context-card">
          <div class="company">${esc(ctx.company || "Unknown Company")}</div>
          <div class="role">${esc(ctx.jobTitle || "—")}</div>
          <div class="url">${esc(ctx.url)}</div>
        </div>
      ` : `
        <div class="no-job">
          <div class="icon">🔍</div>
          <p>Open a job posting to save it or auto-fill an application form.</p>
        </div>
        <div class="divider"></div>
      `}

      <p class="section-title">Resume to use</p>
      <div class="resume-list" id="resume-list">
        ${renderResumeList()}
      </div>

      <div id="status-msg"></div>

      <div class="actions">
        ${ctx.isJobPage ? `
          <button class="btn btn-primary" id="save-btn">
            + Save this Job
          </button>
        ` : ""}
        ${ctx.hasForm ? `
          <button class="btn btn-green" id="fill-btn">
            ✨ Auto-fill Form
          </button>
        ` : ""}
        <button class="btn btn-ghost" id="open-app-btn">
          Open Web App
        </button>
        <button class="btn btn-danger" id="logout-btn">
          Sign Out
        </button>
      </div>

    </div>
  `;

  // ── Resume selection ────────────────────────────────────────────────────────

  document.getElementById("resume-list").addEventListener("click", (e) => {
    const item = e.target.closest(".resume-item");
    if (!item) return;
    selectedResumeId = item.dataset.id;
    document.querySelectorAll(".resume-item").forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === selectedResumeId);
    });
  });

  // ── Save job ────────────────────────────────────────────────────────────────

  document.getElementById("save-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("save-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";

    const res = await bg("SAVE_JOB", {
      company:   ctx.company || window.location.hostname,
      role:      ctx.jobTitle || "Unknown Role",
      platform:  new URL(ctx.url).hostname,
      jd_text:   ctx.jdText || null,
      resume_id: selectedResumeId || null,
    });

    const msgEl = document.getElementById("status-msg");
    if (res.ok) {
      msgEl.innerHTML = `<p class="success-msg">✓ Job saved successfully!</p>`;
      btn.textContent = "✓ Saved";
    } else {
      msgEl.innerHTML = `<p class="error-msg">Failed: ${esc(res.error)}</p>`;
      btn.disabled = false;
      btn.textContent = "+ Save this Job";
    }
  });

  // ── Auto-fill form ──────────────────────────────────────────────────────────

  document.getElementById("fill-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("fill-btn");
    btn.disabled = true;
    btn.textContent = "Filling…";

    const profileData = {
      profile:          profileRes.ok ? profileRes.profile : {},
      work_experiences: workRes.ok    ? workRes.work_experiences : [],
      educations:       eduRes.ok     ? eduRes.educations : [],
    };

    // Send fill command to the content script via background
    const res = await bg("FILL_FORM", {
      tabId:       tab.id,
      profileData,
    });

    const msgEl = document.getElementById("status-msg");
    if (res.ok) {
      msgEl.innerHTML = `<p class="success-msg">✓ Filled ${res.filled ?? "?"} field(s)</p>`;
    } else {
      msgEl.innerHTML = `<p class="error-msg">Fill failed: ${esc(res.error)}</p>`;
    }
    btn.disabled = false;
    btn.textContent = "✨ Auto-fill Form";
  });

  // ── Open web app ────────────────────────────────────────────────────────────

  document.getElementById("open-app-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000" });
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await bg("LOGOUT");
    renderLogin();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  app.innerHTML = `<p class="loading">Loading…</p>`;

  const session = await bg("GET_SESSION");
  if (!session.ok) {
    renderLogin();
    return;
  }

  const tab = await getActiveTab();
  const ctx = await getPageContext(tab.id);

  renderMain(session.user, ctx, tab);
}

init();
