import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.auth import get_password_hash, create_access_token

# In-memory SQLite engine using StaticPool to share connection across threads
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all schema tables in in-memory SQLite once per test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Yield a database session and roll back changes after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_user(db_session: Session) -> User:
    """Create and return an admin user fixture."""
    user = User(
        name="Admin Tester",
        email="admin_test@labelforge.com",
        password_hash=get_password_hash("adminpassword123"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def annotator_user(db_session: Session) -> User:
    """Create and return an annotator user fixture."""
    user = User(
        name="Annotator Tester",
        email="annotator_test@labelforge.com",
        password_hash=get_password_hash("annotatorpassword123"),
        role="annotator",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def reviewer_user(db_session: Session) -> User:
    """Create and return a reviewer user fixture."""
    user = User(
        name="Reviewer Tester",
        email="reviewer_test@labelforge.com",
        password_hash=get_password_hash("reviewerpassword123"),
        role="reviewer",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_headers(admin_user: User) -> dict:
    """Authorization headers for admin user."""
    token = create_access_token({"sub": str(admin_user.id), "role": admin_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def annotator_headers(annotator_user: User) -> dict:
    """Authorization headers for annotator user."""
    token = create_access_token({"sub": str(annotator_user.id), "role": annotator_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def reviewer_headers(reviewer_user: User) -> dict:
    """Authorization headers for reviewer user."""
    token = create_access_token({"sub": str(reviewer_user.id), "role": reviewer_user.role})
    return {"Authorization": f"Bearer {token}"}
