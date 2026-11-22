import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import User


def test_register_success(client: TestClient):
    """Test successful user registration with default 'annotator' role."""
    payload = {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "password": "validpassword123"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "jane.doe@example.com"
    assert data["name"] == "Jane Doe"
    assert data["role"] == "annotator"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client: TestClient, annotator_user: User):
    """Test that registering an existing email returns 409 Conflict."""
    payload = {
        "name": "Duplicate Tester",
        "email": annotator_user.email,
        "password": "validpassword123"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_register_short_password(client: TestClient):
    """Test that password shorter than 8 characters is rejected with 422."""
    payload = {
        "name": "Short Pw",
        "email": "short@example.com",
        "password": "short"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_login_success(client: TestClient, annotator_user: User):
    """Test valid user login returns JWT token and user profile."""
    payload = {
        "email": annotator_user.email,
        "password": "annotatorpassword123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == annotator_user.email


def test_login_invalid_password(client: TestClient, annotator_user: User):
    """Test login with wrong password returns 401 Unauthorized."""
    payload = {
        "email": annotator_user.email,
        "password": "wrongpassword123"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_me(client: TestClient, annotator_headers: dict, annotator_user: User):
    """Test retrieving authenticated user profile."""
    response = client.get("/api/v1/users/me", headers=annotator_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == annotator_user.id
    assert data["email"] == annotator_user.email


def test_require_role_admin_forbidden_for_annotator(client: TestClient, annotator_headers: dict):
    """Test that an annotator accessing admin-only user list is rejected with 403 Forbidden."""
    response = client.get("/api/v1/users", headers=annotator_headers)
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]


def test_require_role_admin_allowed_for_admin(client: TestClient, admin_headers: dict):
    """Test that admin can successfully access the user list."""
    response = client.get("/api/v1/users", headers=admin_headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1
