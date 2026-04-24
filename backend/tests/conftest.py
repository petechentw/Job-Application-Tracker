import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

# CI 用 GitHub Actions 提供的 PostgreSQL service
# 本地跑測試時設定 TEST_DATABASE_URL 環境變數即可
import os
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://jobtracker:jobtracker@localhost:5433/jobtracker",
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """每次測試 session 前建表，結束後清掉。"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """每個測試獨立的 DB session，測試結束後 rollback。"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """覆蓋 get_db dependency，注入測試用 session。"""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """建一個測試帳號，回傳 email 和 password。"""
    payload = {"email": "test@example.com", "password": "testpass123"}
    client.post("/auth/register", json=payload)
    return payload


@pytest.fixture()
def auth_headers(client, registered_user):
    """登入並回傳 Authorization header。"""
    res = client.post("/auth/login", json=registered_user)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
