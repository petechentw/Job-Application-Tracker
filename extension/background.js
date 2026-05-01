/**
 * Background service worker.
 *
 * Centralises all network calls to the Job Tracker API so the popup and
 * content script never touch fetch() directly (and never need to store the
 * token in a place accessible from the page context).
 *
 * Message API (chrome.runtime.sendMessage → chrome.runtime.onMessage):
 *
 *   { type: "LOGIN",    payload: { email, password } }
 *     → { ok: true, user } | { ok: false, error }
 *
 *   { type: "LOGOUT" }
 *     → { ok: true }
 *
 *   { type: "GET_SESSION" }
 *     → { ok: true, user, token } | { ok: false }
 *
 *   { type: "LIST_RESUMES" }
 *     → { ok: true, resumes } | { ok: false, error }
 *
 *   { type: "GET_PROFILE" }
 *     → { ok: true, profile } | { ok: false, error }
 *
 *   { type: "GET_WORK_EXPERIENCES" }
 *     → { ok: true, work_experiences } | { ok: false, error }
 *
 *   { type: "GET_EDUCATIONS" }
 *     → { ok: true, educations } | { ok: false, error }
 *
 *   { type: "SAVE_JOB", payload: { company, role, platform, jd_text, resume_id } }
 *     → { ok: true, job } | { ok: false, error }
 *
 *   { type: "FILL_FORM", payload: { tabId } }
 *     → triggers content script auto-fill on the given tab
 */

const API_BASE = "http://localhost:8000";

// ── Storage helpers ───────────────────────────────────────────────────────────

function saveSession(token, user) {
  return chrome.storage.local.set({ jt_token: token, jt_user: JSON.stringify(user) });
}

function clearSession() {
  return chrome.storage.local.remove(["jt_token", "jt_user"]);
}

async function getSession() {
  const data = await chrome.storage.local.get(["jt_token", "jt_user"]);
  if (!data.jt_token) return null;
  return {
    token: data.jt_token,
    user: data.jt_user ? JSON.parse(data.jt_user) : null,
  };
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const session = await getSession();
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Message handlers ──────────────────────────────────────────────────────────

async function handleLogin({ email, password }) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // Fetch user info
  const user = await apiFetch("/auth/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  await saveSession(data.access_token, user);
  return { ok: true, user };
}

async function handleLogout() {
  await clearSession();
  return { ok: true };
}

async function handleGetSession() {
  const session = await getSession();
  if (!session) return { ok: false };
  return { ok: true, user: session.user, token: session.token };
}

async function handleListResumes() {
  const resumes = await apiFetch("/resumes");
  return { ok: true, resumes };
}

async function handleGetProfile() {
  const profile = await apiFetch("/profile");
  return { ok: true, profile };
}

async function handleGetWorkExperiences() {
  const work_experiences = await apiFetch("/work-experiences");
  return { ok: true, work_experiences };
}

async function handleGetEducations() {
  const educations = await apiFetch("/educations");
  return { ok: true, educations };
}

async function handleSaveJob(payload) {
  const job = await apiFetch("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { ok: true, job };
}

// ── Listener ──────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const dispatch = async () => {
    try {
      switch (msg.type) {
        case "LOGIN":              return await handleLogin(msg.payload);
        case "LOGOUT":             return await handleLogout();
        case "GET_SESSION":        return await handleGetSession();
        case "LIST_RESUMES":       return await handleListResumes();
        case "GET_PROFILE":        return await handleGetProfile();
        case "GET_WORK_EXPERIENCES": return await handleGetWorkExperiences();
        case "GET_EDUCATIONS":     return await handleGetEducations();
        case "SAVE_JOB":           return await handleSaveJob(msg.payload);
        case "FILL_FORM": {
          // Forward the fill command to the content script running in the tab
          const { tabId, profileData } = msg.payload;
          const fillRes = await chrome.tabs.sendMessage(tabId, { type: "DO_FILL", payload: profileData });
          return { ok: true, filled: fillRes?.filled ?? 0 };
        }
        case "OPEN_POPUP": {
          // chrome.action.openPopup is only available in Chrome 122+ and only
          // when the extension has user interaction context. We no-op here;
          // the user can click the toolbar icon instead.
          return { ok: true };
        }
        default:
          return { ok: false, error: `Unknown message type: ${msg.type}` };
      }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  // Must return true to keep the message channel open for async responses
  dispatch().then(sendResponse);
  return true;
});
