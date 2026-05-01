"""
Tests for resume endpoints:
  POST   /resumes                    — upload PDF
  GET    /resumes                    — list (active first, then history)
  PATCH  /resumes/{id}/deactivate   — move to History
  PATCH  /resumes/{id}/activate     — move back to Active
  GET    /resumes/{id}/url           — get download URL

Note: actual file upload uses a minimal 1-byte PDF stub to avoid
reading real files from disk during tests.
"""

import io
import pytest

# Minimal valid-ish PDF bytes for upload testing
FAKE_PDF = b"%PDF-1.4 fake content"


def _upload(client, headers, filename="resume.pdf"):
    """Helper: upload a fake PDF and return the response."""
    return client.post(
        "/resumes",
        files={"file": (filename, io.BytesIO(FAKE_PDF), "application/pdf")},
        headers=headers,
    )


@pytest.fixture()
def uploaded_resume(client, auth_headers):
    """Upload a single resume and return its response data."""
    res = _upload(client, auth_headers)
    assert res.status_code == 201
    return res.json()


# ── Upload ────────────────────────────────────────────────────────────────────

def test_upload_resume_success(client, auth_headers):
    """
    Uploading a valid PDF should return 201.
    The resume should be active and in 'pending' parse status by default.
    """
    res = _upload(client, auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["is_active"] is True
    assert data["parse_status"] == "pending"
    assert data["name"] == "resume.pdf"


def test_upload_rejects_non_pdf(client, auth_headers):
    """
    Uploading a non-PDF file (e.g. plain text) should be rejected with 400.
    Only application/pdf content type is allowed.
    """
    res = client.post(
        "/resumes",
        files={"file": ("resume.txt", io.BytesIO(b"not a pdf"), "text/plain")},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_upload_requires_auth(client):
    """Unauthenticated upload should be rejected with 403."""
    res = client.post(
        "/resumes",
        files={"file": ("resume.pdf", io.BytesIO(FAKE_PDF), "application/pdf")},
    )
    assert res.status_code == 403


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_resumes(client, auth_headers, uploaded_resume):
    """Listing resumes should include the uploaded one."""
    res = client.get("/resumes", headers=auth_headers)
    assert res.status_code == 200
    ids = [r["id"] for r in res.json()]
    assert uploaded_resume["id"] in ids


def test_list_active_comes_before_history(client, auth_headers):
    """
    Active resumes should appear before history resumes in the list.
    Verifies the ordering: is_active DESC, uploaded_at DESC.
    """
    r1 = _upload(client, auth_headers, "active.pdf").json()
    r2 = _upload(client, auth_headers, "to_archive.pdf").json()

    # Move r2 to history
    client.patch(f"/resumes/{r2['id']}/deactivate", headers=auth_headers)

    resumes = client.get("/resumes", headers=auth_headers).json()
    active_ids = [r["id"] for r in resumes if r["is_active"]]
    history_ids = [r["id"] for r in resumes if not r["is_active"]]

    assert r1["id"] in active_ids
    assert r2["id"] in history_ids

    # Active entries must appear before history entries in the list
    active_positions = [i for i, r in enumerate(resumes) if r["is_active"]]
    history_positions = [i for i, r in enumerate(resumes) if not r["is_active"]]
    if active_positions and history_positions:
        assert max(active_positions) < min(history_positions)


# ── Deactivate / Activate ─────────────────────────────────────────────────────

def test_deactivate_resume(client, auth_headers, uploaded_resume):
    """
    Deactivating a resume should set is_active=False (move it to History).
    The resume should still be retrievable in the list.
    """
    res = client.patch(
        f"/resumes/{uploaded_resume['id']}/deactivate",
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False


def test_activate_resume(client, auth_headers, uploaded_resume):
    """
    A resume in History can be moved back to Active by calling /activate.
    """
    # First move to history
    client.patch(f"/resumes/{uploaded_resume['id']}/deactivate", headers=auth_headers)

    # Then move back to active
    res = client.patch(f"/resumes/{uploaded_resume['id']}/activate", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_deactivate_nonexistent_returns_404(client, auth_headers):
    """Trying to deactivate a resume that doesn't exist should return 404."""
    res = client.patch("/resumes/nonexistent-id/deactivate", headers=auth_headers)
    assert res.status_code == 404


# ── Download URL ──────────────────────────────────────────────────────────────

def test_get_resume_url(client, auth_headers, uploaded_resume):
    """
    Requesting a download URL for an existing resume should return 200
    with a non-empty URL string.
    """
    res = client.get(f"/resumes/{uploaded_resume['id']}/url", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["url"].startswith("/resumes/download/")


def test_get_url_for_another_users_resume_returns_404(client, auth_headers):
    """
    A user should not be able to get the download URL of another user's resume.
    Ensures per-user data isolation.
    """
    # Upload as user one
    r = _upload(client, auth_headers).json()

    # Log in as user two
    client.post("/auth/register", json={"email": "other4@example.com", "password": "pass"})
    login = client.post("/auth/login", json={"email": "other4@example.com", "password": "pass"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    res = client.get(f"/resumes/{r['id']}/url", headers=other_headers)
    assert res.status_code == 404
