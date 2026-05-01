"""
Tests for GET /profile and PATCH /profile.

Profile is auto-created on first access — no explicit POST needed.
All fields are optional and only updated when explicitly provided (PATCH semantics).
"""


def test_get_profile_auto_creates(client, auth_headers):
    """
    Fetching a profile that does not exist yet should
    automatically create a blank one and return 200.
    """
    res = client.get("/profile", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] is not None
    assert data["full_name"] is None
    assert data["needs_sponsor"] is False


def test_get_profile_requires_auth(client):
    """Unauthenticated request should be rejected with 403."""
    res = client.get("/profile")
    assert res.status_code == 403


def test_update_profile_basic_fields(client, auth_headers):
    """
    PATCH with a subset of fields should only update those fields
    and leave the rest unchanged.
    """
    res = client.patch(
        "/profile",
        json={"full_name": "Jane Doe", "phone": "+1-555-0100"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Jane Doe"
    assert data["phone"] == "+1-555-0100"
    # Fields not sent should remain None
    assert data["address"] is None


def test_update_profile_needs_sponsor(client, auth_headers):
    """Setting needs_sponsor to True should persist correctly."""
    res = client.patch(
        "/profile",
        json={"needs_sponsor": True, "nationality": "Taiwan", "visa_status": "F1"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["needs_sponsor"] is True
    assert data["nationality"] == "Taiwan"
    assert data["visa_status"] == "F1"


def test_update_profile_is_idempotent(client, auth_headers):
    """
    Calling PATCH twice with the same payload should return the same result.
    Ensures upsert logic doesn't duplicate data.
    """
    payload = {"full_name": "John Smith", "linkedin_url": "https://linkedin.com/in/john"}
    client.patch("/profile", json=payload, headers=auth_headers)
    res = client.patch("/profile", json=payload, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "John Smith"


def test_update_profile_partial_does_not_clear_existing(client, auth_headers):
    """
    A PATCH with only one field should not reset previously saved fields.
    Verifies that exclude_unset=True is working correctly.
    """
    client.patch("/profile", json={"full_name": "Alice"}, headers=auth_headers)
    res = client.patch("/profile", json={"phone": "123"}, headers=auth_headers)
    assert res.status_code == 200
    # full_name set in the first call should still be there
    assert res.json()["full_name"] == "Alice"
    assert res.json()["phone"] == "123"


def test_profile_is_isolated_per_user(client, auth_headers):
    """
    Each user should have their own profile.
    Updating one user's profile must not affect another user's profile.
    """
    # Set up a second user
    client.post("/auth/register", json={"email": "other@example.com", "password": "pass"})
    other_login = client.post("/auth/login", json={"email": "other@example.com", "password": "pass"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    client.patch("/profile", json={"full_name": "User One"}, headers=auth_headers)
    client.patch("/profile", json={"full_name": "User Two"}, headers=other_headers)

    res1 = client.get("/profile", headers=auth_headers)
    res2 = client.get("/profile", headers=other_headers)

    assert res1.json()["full_name"] == "User One"
    assert res2.json()["full_name"] == "User Two"
