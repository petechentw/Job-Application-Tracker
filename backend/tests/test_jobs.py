import pytest


JOB_PAYLOAD = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "platform": "LinkedIn",
}


@pytest.fixture()
def created_job(client, auth_headers):
    res = client.post("/jobs", json=JOB_PAYLOAD, headers=auth_headers)
    assert res.status_code == 202
    return res.json()


# ── create ────────────────────────────────────────────────────────────────────

def test_create_job(client, auth_headers):
    res = client.post("/jobs", json=JOB_PAYLOAD, headers=auth_headers)
    assert res.status_code == 202
    data = res.json()
    assert data["company"] == "Acme Corp"
    assert data["status"] == "applied"
    assert data["analysis_status"] == "done"   # no jd_text → skip analysis


def test_create_job_with_jd_enqueues(client, auth_headers):
    payload = {**JOB_PAYLOAD, "jd_text": "We need a Python engineer."}
    res = client.post("/jobs", json=payload, headers=auth_headers)
    assert res.status_code == 202
    assert res.json()["analysis_status"] == "pending"


def test_create_job_requires_auth(client):
    res = client.post("/jobs", json=JOB_PAYLOAD)
    assert res.status_code == 403


# ── list ──────────────────────────────────────────────────────────────────────

def test_list_jobs(client, auth_headers, created_job):
    res = client.get("/jobs", headers=auth_headers)
    assert res.status_code == 200
    ids = [j["id"] for j in res.json()]
    assert created_job["id"] in ids


def test_list_jobs_only_own(client, auth_headers):
    # register a second user and create a job for them
    client.post("/auth/register", json={"email": "other@example.com", "password": "pass"})
    login = client.post("/auth/login", json={"email": "other@example.com", "password": "pass"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    client.post("/jobs", json=JOB_PAYLOAD, headers=other_headers)

    res = client.get("/jobs", headers=auth_headers)
    for job in res.json():
        assert job["user_id"] != login.json().get("id")  # jobs belong to current user


# ── get ───────────────────────────────────────────────────────────────────────

def test_get_job(client, auth_headers, created_job):
    res = client.get(f"/jobs/{created_job['id']}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == created_job["id"]


def test_get_job_not_found(client, auth_headers):
    res = client.get("/jobs/nonexistent-id", headers=auth_headers)
    assert res.status_code == 404


# ── update ────────────────────────────────────────────────────────────────────

def test_update_job_status(client, auth_headers, created_job):
    res = client.patch(
        f"/jobs/{created_job['id']}",
        json={"status": "interview"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "interview"


# ── delete ────────────────────────────────────────────────────────────────────

def test_delete_job(client, auth_headers, created_job):
    res = client.delete(f"/jobs/{created_job['id']}", headers=auth_headers)
    assert res.status_code == 204

    res = client.get(f"/jobs/{created_job['id']}", headers=auth_headers)
    assert res.status_code == 404
