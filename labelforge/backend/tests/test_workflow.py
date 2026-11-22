import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import User, Project, Task, DataItem, Label, Annotation, Review
from app.auth import create_access_token


def test_full_lifecycle_workflow(
    client: TestClient,
    admin_user: User,
    annotator_user: User,
    reviewer_user: User,
    annotator_headers: dict,
    reviewer_headers: dict,
    db_session: Session
):
    """
    End-to-End Workflow Test:
    Assign -> Annotate -> Reject (with comment) -> Re-annotate -> Approve
    """
    # 1. Setup Project, Labels, and Task
    project = Project(name="Workflow Project", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    label_pos = Label(project_id=project.id, name="Positive", color="#10B981")
    label_neg = Label(project_id=project.id, name="Negative", color="#EF4444")
    db_session.add_all([label_pos, label_neg])
    db_session.commit()

    item = DataItem(project_id=project.id, content="Amazing battery performance!")
    db_session.add(item)
    db_session.flush()

    task = Task(item_id=item.id, assigned_to=annotator_user.id, status="PENDING")
    db_session.add(task)
    db_session.commit()

    # Step 1: Annotator inspects /tasks/my
    res = client.get("/api/v1/tasks/my?status=PENDING", headers=annotator_headers)
    assert res.status_code == 200
    assert res.json()["total"] == 1

    # Step 2: Annotator opens task -> auto transitions to IN_PROGRESS
    res = client.get(f"/api/v1/tasks/{task.id}", headers=annotator_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"

    # Step 3: Annotator submits wrong label (Negative) -> transitions to SUBMITTED
    res = client.post(
        f"/api/v1/tasks/{task.id}/annotate",
        headers=annotator_headers,
        json={"label_id": label_neg.id}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUBMITTED"

    # Step 4: Reviewer inspects queue
    res = client.get(f"/api/v1/reviews/queue?project_id={project.id}", headers=reviewer_headers)
    assert res.status_code == 200
    assert res.json()["total"] == 1

    # Step 5: Reviewer rejects with comment -> transitions to REJECTED
    reject_comment = "Text expresses clear approval; Negative label is incorrect."
    res = client.post(
        f"/api/v1/tasks/{task.id}/review",
        headers=reviewer_headers,
        json={"decision": "REJECTED", "comment": reject_comment}
    )
    assert res.status_code == 200
    assert res.json()["decision"] == "REJECTED"

    # Step 6: Annotator inspects task and sees reviewer feedback
    res = client.get(f"/api/v1/tasks/{task.id}", headers=annotator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "IN_PROGRESS"  # Reopened rejected task auto-transitions to IN_PROGRESS
    assert data["latest_review"]["comment"] == reject_comment

    # Step 7: Annotator fixes label (Positive) and resubmits -> transitions to SUBMITTED
    res = client.post(
        f"/api/v1/tasks/{task.id}/annotate",
        headers=annotator_headers,
        json={"label_id": label_pos.id}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUBMITTED"

    # Step 8: Reviewer approves corrected submission -> transitions to terminal APPROVED
    res = client.post(
        f"/api/v1/tasks/{task.id}/review",
        headers=reviewer_headers,
        json={"decision": "APPROVED", "comment": "Correction approved."}
    )
    assert res.status_code == 200
    assert res.json()["decision"] == "APPROVED"

    # Verify task in database has final status APPROVED
    db_session.refresh(task)
    assert task.status == "APPROVED"


def test_prevent_self_review_bias(
    client: TestClient,
    admin_user: User,
    db_session: Session
):
    """
    Test that a user cannot review a task assigned to themselves,
    even if they possess elevated reviewer/admin permissions.
    """
    # Create user who is both reviewer and assigned to task
    hybrid_user = User(
        name="Hybrid User",
        email="hybrid@test.com",
        password_hash="hash",
        role="reviewer"
    )
    db_session.add(hybrid_user)
    db_session.commit()

    project = Project(name="Self-Review Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    item = DataItem(project_id=project.id, content="Self test text")
    db_session.add(item)
    db_session.flush()

    task = Task(item_id=item.id, assigned_to=hybrid_user.id, status="SUBMITTED")
    db_session.add(task)
    db_session.commit()

    token = create_access_token({"sub": str(hybrid_user.id), "role": hybrid_user.role})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        f"/api/v1/tasks/{task.id}/review",
        headers=headers,
        json={"decision": "APPROVED"}
    )
    assert response.status_code == 403
    assert "Reviewers cannot review their own annotations" in response.json()["detail"]


def test_rejection_requires_comment(
    client: TestClient,
    admin_user: User,
    annotator_user: User,
    reviewer_headers: dict,
    db_session: Session
):
    """Test that rejecting an annotation without a comment returns 422 Unprocessable Entity."""
    project = Project(name="Comment Req Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    item = DataItem(project_id=project.id, content="Review text sample")
    db_session.add(item)
    db_session.flush()

    task = Task(item_id=item.id, assigned_to=annotator_user.id, status="SUBMITTED")
    db_session.add(task)
    db_session.commit()

    # Empty comment on rejection
    response = client.post(
        f"/api/v1/tasks/{task.id}/review",
        headers=reviewer_headers,
        json={"decision": "REJECTED", "comment": "   "}
    )
    assert response.status_code == 422
    assert "non-empty comment is required" in response.json()["detail"]


def test_invalid_status_transition_conflict(
    client: TestClient,
    admin_user: User,
    annotator_user: User,
    annotator_headers: dict,
    db_session: Session
):
    """Test that attempting to annotate an already APPROVED task raises 409 Conflict."""
    project = Project(name="Conflict Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    label = Label(project_id=project.id, name="Test Label", color="#4F46E5")
    db_session.add(label)
    db_session.commit()

    item = DataItem(project_id=project.id, content="Approved text")
    db_session.add(item)
    db_session.flush()

    task = Task(item_id=item.id, assigned_to=annotator_user.id, status="APPROVED")
    db_session.add(task)
    db_session.commit()

    response = client.post(
        f"/api/v1/tasks/{task.id}/annotate",
        headers=annotator_headers,
        json={"label_id": label.id}
    )
    assert response.status_code == 409
    assert "cannot be annotated" in response.json()["detail"]
