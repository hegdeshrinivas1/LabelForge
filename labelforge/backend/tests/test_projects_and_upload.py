import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import User, Project, Task, DataItem, Label


def test_create_project_admin(client: TestClient, admin_headers: dict):
    """Test admin creating a new project."""
    payload = {"name": "NLP Classification", "description": "Benchmark project"}
    response = client.post("/api/v1/projects", headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "NLP Classification"
    assert data["description"] == "Benchmark project"


def test_create_project_forbidden_for_annotator(client: TestClient, annotator_headers: dict):
    """Test annotator is blocked from creating a project (403 Forbidden)."""
    payload = {"name": "Unauthorized Project"}
    response = client.post("/api/v1/projects", headers=annotator_headers, json=payload)
    assert response.status_code == 403


def test_create_label_and_duplicate_prevention(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test label creation and duplicate name constraint within the same project."""
    project = Project(name="Label Test Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    # Create first label
    res1 = client.post(
        f"/api/v1/projects/{project.id}/labels",
        headers=admin_headers,
        json={"name": "Urgent", "color": "#EF4444"}
    )
    assert res1.status_code == 201
    assert res1.json()["name"] == "Urgent"

    # Duplicate label creation must fail with 409 Conflict
    res2 = client.post(
        f"/api/v1/projects/{project.id}/labels",
        headers=admin_headers,
        json={"name": "Urgent", "color": "#10B981"}
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_upload_valid_csv_and_task_spawning(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test uploading a valid CSV file instantiates DataItems and linked PENDING Tasks."""
    project = Project(name="Upload CSV Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    csv_content = "text\nFirst line of text\nSecond line of text\nThird line of text\n"
    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = client.post(f"/api/v1/projects/{project.id}/upload", headers=admin_headers, files=files)
    assert response.status_code == 201
    summary = response.json()
    assert summary["inserted"] == 3
    assert summary["skipped"] == 0
    assert summary["total_processed"] == 3

    # Check tasks spawned in PENDING state
    tasks = db_session.query(Task).join(DataItem).filter(DataItem.project_id == project.id).all()
    assert len(tasks) == 3
    for t in tasks:
        assert t.status == "PENDING"
        assert t.assigned_to is None


def test_upload_csv_skips_empty_and_duplicate_rows(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test that empty strings and duplicate text records are cleanly skipped."""
    project = Project(name="Deduplication Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    # Pre-insert one record directly in database
    existing_item = DataItem(project_id=project.id, content="Pre-existing text")
    db_session.add(existing_item)
    db_session.commit()

    csv_content = (
        "text\n"
        "Pre-existing text\n"  # duplicate with DB -> skipped
        "\n"                    # empty row -> skipped
        "Brand new sample 1\n"  # valid -> inserted
        "Brand new sample 1\n"  # intra-batch duplicate -> skipped
        "Brand new sample 2\n"  # valid -> inserted
    )
    files = {"file": ("dataset.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = client.post(f"/api/v1/projects/{project.id}/upload", headers=admin_headers, files=files)
    assert response.status_code == 201
    summary = response.json()
    assert summary["inserted"] == 2
    assert summary["skipped"] == 3


def test_upload_bad_file_extension(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test that unsupported file extensions are rejected with 400 Bad Request."""
    project = Project(name="Bad Ext Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    files = {"file": ("notes.txt", io.BytesIO(b"random content"), "text/plain")}
    response = client.post(f"/api/v1/projects/{project.id}/upload", headers=admin_headers, files=files)
    assert response.status_code == 400
    assert "Only .csv and .json" in response.json()["detail"]


def test_upload_missing_text_column(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test that CSV missing a 'text' column is rejected with 400 Bad Request."""
    project = Project(name="Missing Text Col Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    csv_content = "title,body\nHello,World\n"
    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post(f"/api/v1/projects/{project.id}/upload", headers=admin_headers, files=files)
    assert response.status_code == 400
    assert "Missing required column 'text'" in response.json()["detail"]


def test_round_robin_assignment(client: TestClient, admin_headers: dict, db_session: Session, admin_user: User):
    """Test round-robin distribution of unassigned tasks across annotator IDs."""
    project = Project(name="Assign Test Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    # Create 2 annotators
    ann1 = User(name="Ann 1", email="a1@test.com", password_hash="hash", role="annotator")
    ann2 = User(name="Ann 2", email="a2@test.com", password_hash="hash", role="annotator")
    db_session.add_all([ann1, ann2])
    db_session.commit()

    # Create 3 unassigned tasks
    for i in range(3):
        item = DataItem(project_id=project.id, content=f"Text item #{i}")
        db_session.add(item)
        db_session.flush()
        task = Task(item_id=item.id, status="PENDING")
        db_session.add(task)
    db_session.commit()

    payload = {"annotator_ids": [ann1.id, ann2.id]}
    response = client.post(f"/api/v1/projects/{project.id}/assign", headers=admin_headers, json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["assigned_count"] == 3
    assert res_data["distribution"][str(ann1.id)] == 2
    assert res_data["distribution"][str(ann2.id)] == 1
