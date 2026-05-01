"""
Tests for work experience CRUD endpoints:
  POST   /work-experiences
  GET    /work-experiences
  PATCH  /work-experiences/{id}
  DELETE /work-experiences/{id}
"""

import pytest

BASE_PAYLOAD = {
    "company": "Acme Corp",
    "title": "Software Engineer",
    "start_date": "2022-06",
    "end_date": "2024-01",
    "is_current": False,
    "description": "Built backend services.",
    "order": 0,
}


@pytest.fixture()
def created_exp(client, auth_headers):
    """Create a single work experience entry and return its response data."""
    res = client.post("/work-experiences", json=BASE_PAYLOAD, headers=auth_headers)
    assert res.status_code == 201
    return res.json()


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_work_experience(client, auth_headers):
    """Successfully creating a work experience should return 201 with all fields."""
    res = client.post("/work-experiences", json=BASE_PAYLOAD, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["company"] == "Acme Corp"
    assert data["title"] == "Software Engineer"
    assert data["is_current"] is False


def test_create_current_job(client, auth_headers):
    """
    A current job should have is_current=True and end_date=None.
    Verifies the model handles open-ended employment correctly.
    """
    payload = {**BASE_PAYLOAD, "is_current": True, "end_date": None}
    res = client.post("/work-experiences", json=payload, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["is_current"] is True
    assert res.json()["end_date"] is None


def test_create_requires_auth(client):
    """Unauthenticated request should be rejected with 403."""
    res = client.post("/work-experiences", json=BASE_PAYLOAD)
    assert res.status_code == 403


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_work_experiences(client, auth_headers, created_exp):
    """Listing should return all entries belonging to the current user."""
    res = client.get("/work-experiences", headers=auth_headers)
    assert res.status_code == 200
    ids = [e["id"] for e in res.json()]
    assert created_exp["id"] in ids


def test_list_returns_only_own_experiences(client, auth_headers):
    """
    Work experiences are user-scoped.
    A second user's entries must not appear in the first user's list.
    """
    # Create an entry for user one
    client.post("/work-experiences", json=BASE_PAYLOAD, headers=auth_headers)

    # Register and log in as user two
    client.post("/auth/register", json={"email": "other2@example.com", "password": "pass"})
    login = client.post("/auth/login", json={"email": "other2@example.com", "password": "pass"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # User two's list should be empty
    res = client.get("/work-experiences", headers=other_headers)
    assert res.json() == []


def test_list_ordered_by_order_field(client, auth_headers):
    """Entries should be returned sorted by the 'order' field ascending."""
    client.post("/work-experiences", json={**BASE_PAYLOAD, "order": 2}, headers=auth_headers)
    client.post("/work-experiences", json={**BASE_PAYLOAD, "order": 0}, headers=auth_headers)
    client.post("/work-experiences", json={**BASE_PAYLOAD, "order": 1}, headers=auth_headers)

    res = client.get("/work-experiences", headers=auth_headers)
    orders = [e["order"] for e in res.json()]
    assert orders == sorted(orders)


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_work_experience(client, auth_headers, created_exp):
    """PATCH should only update the supplied fields."""
    res = client.patch(
        f"/work-experiences/{created_exp['id']}",
        json={"title": "Senior Engineer", "is_current": True},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Senior Engineer"
    assert data["is_current"] is True
    # Unchanged fields should remain the same
    assert data["company"] == "Acme Corp"


def test_update_nonexistent_returns_404(client, auth_headers):
    """Patching an ID that does not exist should return 404."""
    res = client.patch(
        "/work-experiences/nonexistent-id",
        json={"title": "Ghost"},
        headers=auth_headers,
    )
    assert res.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_work_experience(client, auth_headers, created_exp):
    """Deleting an entry should return 204 and remove it from the list."""
    res = client.delete(f"/work-experiences/{created_exp['id']}", headers=auth_headers)
    assert res.status_code == 204

    ids = [e["id"] for e in client.get("/work-experiences", headers=auth_headers).json()]
    assert created_exp["id"] not in ids


def test_delete_nonexistent_returns_404(client, auth_headers):
    """Deleting a non-existent ID should return 404."""
    res = client.delete("/work-experiences/nonexistent-id", headers=auth_headers)
    assert res.status_code == 404
