def test_register_success(client):
    res = client.post("/auth/register", json={"email": "new@example.com", "password": "pass123"})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new@example.com"
    assert "hashed_password" not in data


def test_register_duplicate_email(client, registered_user):
    res = client.post("/auth/register", json=registered_user)
    assert res.status_code == 409


def test_login_success(client, registered_user):
    res = client.post("/auth/login", json=registered_user)
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_login_wrong_password(client, registered_user):
    res = client.post("/auth/login", json={**registered_user, "password": "wrong"})
    assert res.status_code == 401


def test_login_unknown_email(client):
    res = client.post("/auth/login", json={"email": "nobody@example.com", "password": "pass"})
    assert res.status_code == 401


def test_me_authenticated(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"


def test_me_no_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 403


def test_me_invalid_token(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert res.status_code == 401
