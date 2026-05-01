"""
Tests for education CRUD endpoints:
  POST   /educations
  GET    /educations
  PATCH  /educations/{id}
  DELETE /educations/{id}
"""

import pytest

BASE_PAYLOAD = {
    "school": "MIT",
    "degree": "Bachelor",
    "field_of_study": "Computer Science",
    "start_date": "2018-09",
    "end_date": "2022-06",
    "gpa": "3.9",
    "order": 0,
}


@pytest.fixture()
def created_edu(client, auth_headers):
    """Create a single education entry and return its response data."""
    res = client.post("/educations", json=BASE_PAYLOAD, headers=auth_headers)
    assert res.status_code == 201
    return res.json()


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_education(client, auth_headers):
    """Successfully creating an education entry should return 201 with all fields."""
    res = client.post("/educations", json=BASE_PAYLOAD, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["school"] == "MIT"
    assert data["degree"] == "Bachelor"
    assert data["gpa"] == "3.9"


def test_create_education_minimal(client, auth_headers):
    """
    Only 'school' is required. All other fields are optional.
    Verifies the schema allows partial education entries.
    """
    res = client.post("/educations", json={"school": "Stanford"}, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["school"] == "Stanford"
    assert data["degree"] is None
    assert data["gpa"] is None


def test_create_requires_auth(client):
    """Unauthenticated request should be rejected with 403."""
    res = client.post("/educations", json=BASE_PAYLOAD)
    assert res.status_code == 403


# ── List ──────────────────────────────────────────────────────────────────────

def test_list_educations(client, auth_headers, created_edu):
    """Listing should return all entries belonging to the current user."""
    res = client.get("/educations", headers=auth_headers)
    assert res.status_code == 200
    ids = [e["id"] for e in res.json()]
    assert created_edu["id"] in ids


def test_list_returns_only_own_educations(client, auth_headers):
    """
    Education entries are user-scoped.
    A second user's entries must not appear in the first user's list.
    """
    client.post("/educations", json=BASE_PAYLOAD, headers=auth_headers)

    client.post("/auth/register", json={"email": "other3@example.com", "password": "pass"})
    login = client.post("/auth/login", json={"email": "other3@example.com", "password": "pass"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    res = client.get("/educations", headers=other_headers)
    assert res.json() == []


def test_list_ordered_by_order_field(client, auth_headers):
    """Entries should be returned sorted by the 'order' field ascending."""
    client.post("/educations", json={**BASE_PAYLOAD, "order": 3}, headers=auth_headers)
    client.post("/educations", json={**BASE_PAYLOAD, "order": 1}, headers=auth_headers)
    client.post("/educations", json={**BASE_PAYLOAD, "order": 2}, headers=auth_headers)

    res = client.get("/educations", headers=auth_headers)
    orders = [e["order"] for e in res.json()]
    assert orders == sorted(orders)


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_education(client, auth_headers, created_edu):
    """PATCH should only update the supplied fields, leaving others unchanged."""
    res = client.patch(
        f"/educations/{created_edu['id']}",
        json={"degree": "Master", "gpa": "4.0"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["degree"] == "Master"
    assert data["gpa"] == "4.0"
    assert data["school"] == "MIT"  # unchanged


def test_update_nonexistent_returns_404(client, auth_headers):
    """Patching an ID that does not exist should return 404."""
    res = client.patch(
        "/educations/nonexistent-id",
        json={"degree": "PhD"},
        headers=auth_headers,
    )
    assert res.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_education(client, auth_headers, created_edu):
    """Deleting an entry should return 204 and remove it from the list."""
    res = client.delete(f"/educations/{created_edu['id']}", headers=auth_headers)
    assert res.status_code == 204

    ids = [e["id"] for e in client.get("/educations", headers=auth_headers).json()]
    assert created_edu["id"] not in ids


def test_delete_nonexistent_returns_404(client, auth_headers):
    """Deleting a non-existent ID should return 404."""
    res = client.delete("/educations/nonexistent-id", headers=auth_headers)
    assert res.status_code == 404
