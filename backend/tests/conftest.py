import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

# Uses the GitHub Actions PostgreSQL service in CI.
# Override locally by setting the TEST_DATABASE_URL environment variable.
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://jobtracker:jobtracker@localhost:5433/jobtracker",
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create all tables before the test session and drop them afterward."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Provide an isolated DB session per test; rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """Override get_db dependency to inject the test session."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Register a test account and return its credentials."""
    payload = {"email": "test@example.com", "password": "testpass123"}
    client.post("/auth/register", json=payload)
    return payload


@pytest.fixture()
def auth_headers(client, registered_user):
    """Log in and return the Authorization header."""
    res = client.post("/auth/login", json=registered_user)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
