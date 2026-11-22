import json
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models import User, Project, Task, DataItem, Label, Annotation, Review


def test_stats_raw_sql_computation(
    client: TestClient,
    admin_user: User,
    annotator_user: User,
    reviewer_user: User,
    admin_headers: dict,
    db_session: Session
):
    """
    Test that raw SQL queries compute exact analytical metrics
    matching known seeded records.
    """
    project = Project(name="Analytics Benchmark", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    label_pos = Label(project_id=project.id, name="Positive", color="#10B981")
    label_neg = Label(project_id=project.id, name="Negative", color="#EF4444")
    db_session.add_all([label_pos, label_neg])
    db_session.commit()

    now = datetime.now(timezone.utc)

    # 1. Approved Task 1 (Positive)
    i1 = DataItem(project_id=project.id, content="Good item 1")
    db_session.add(i1)
    db_session.flush()
    t1 = Task(item_id=i1.id, assigned_to=annotator_user.id, status="APPROVED", submitted_at=now)
    db_session.add(t1)
    db_session.flush()
    a1 = Annotation(task_id=t1.id, label_id=label_pos.id, annotated_at=now)
    r1 = Review(task_id=t1.id, reviewer_id=reviewer_user.id, decision="APPROVED", comment="Good", reviewed_at=now)
    db_session.add_all([a1, r1])

    # 2. Approved Task 2 (Positive)
    i2 = DataItem(project_id=project.id, content="Good item 2")
    db_session.add(i2)
    db_session.flush()
    t2 = Task(item_id=i2.id, assigned_to=annotator_user.id, status="APPROVED", submitted_at=now)
    db_session.add(t2)
    db_session.flush()
    a2 = Annotation(task_id=t2.id, label_id=label_pos.id, annotated_at=now)
    r2 = Review(task_id=t2.id, reviewer_id=reviewer_user.id, decision="APPROVED", comment="Good", reviewed_at=now)
    db_session.add_all([a2, r2])

    # 3. Rejected Task (Negative)
    i3 = DataItem(project_id=project.id, content="Bad item")
    db_session.add(i3)
    db_session.flush()
    t3 = Task(item_id=i3.id, assigned_to=annotator_user.id, status="REJECTED", submitted_at=now)
    db_session.add(t3)
    db_session.flush()
    a3 = Annotation(task_id=t3.id, label_id=label_neg.id, annotated_at=now)
    r3 = Review(task_id=t3.id, reviewer_id=reviewer_user.id, decision="REJECTED", comment="Fix it", reviewed_at=now)
    db_session.add_all([a3, r3])

    # 4. Submitted Task
    i4 = DataItem(project_id=project.id, content="Pending review item")
    db_session.add(i4)
    db_session.flush()
    t4 = Task(item_id=i4.id, assigned_to=annotator_user.id, status="SUBMITTED", submitted_at=now)
    db_session.add(t4)
    db_session.flush()
    a4 = Annotation(task_id=t4.id, label_id=label_pos.id, annotated_at=now)
    db_session.add(a4)

    # 5. Pending Task (Unlabeled)
    i5 = DataItem(project_id=project.id, content="Unlabeled item")
    db_session.add(i5)
    db_session.flush()
    t5 = Task(item_id=i5.id, assigned_to=annotator_user.id, status="PENDING")
    db_session.add(t5)

    db_session.commit()

    # Query Stats API
    response = client.get(f"/api/v1/projects/{project.id}/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()

    # a) Progress Assertions
    progress = data["progress"]
    assert progress["total_tasks"] == 5
    assert progress["approved_count"] == 2
    assert progress["rejected_count"] == 1
    assert progress["submitted_count"] == 1
    assert progress["pending_count"] == 1
    assert progress["completion_percentage"] == 40.0  # (2 / 5) * 100

    # b) Annotator Accuracy Assertions (2 approved out of 3 reviewed = 66.67%)
    accuracy = data["annotator_accuracy"]
    assert len(accuracy) == 1
    ann_stat = accuracy[0]
    assert ann_stat["user_id"] == annotator_user.id
    assert ann_stat["approved_count"] == 2
    assert ann_stat["rejected_count"] == 1
    assert ann_stat["accuracy_percentage"] == 66.67

    # c) Label Distribution Assertions (2 Positive, 0 Negative among APPROVED tasks)
    distribution = {d["label_name"]: d["approved_count"] for d in data["label_distribution"]}
    assert distribution["Positive"] == 2
    assert distribution["Negative"] == 0


def test_export_only_approved_rows(
    client: TestClient,
    admin_user: User,
    annotator_user: User,
    reviewer_user: User,
    admin_headers: dict,
    annotator_headers: dict,
    db_session: Session
):
    """
    Test dataset export strictly filters for tasks in APPROVED status
    and generates valid CSV and JSON downloads.
    """
    project = Project(name="Export Proj", created_by=admin_user.id)
    db_session.add(project)
    db_session.commit()

    label = Label(project_id=project.id, name="Positive", color="#10B981")
    db_session.add(label)
    db_session.commit()

    now = datetime.now(timezone.utc)

    # 1. Approved item (Must appear in export)
    i1 = DataItem(project_id=project.id, content="Approved Text Row")
    db_session.add(i1)
    db_session.flush()
    t1 = Task(item_id=i1.id, assigned_to=annotator_user.id, status="APPROVED", submitted_at=now)
    db_session.add(t1)
    db_session.flush()
    a1 = Annotation(task_id=t1.id, label_id=label.id, annotated_at=now)
    r1 = Review(task_id=t1.id, reviewer_id=reviewer_user.id, decision="APPROVED", comment="Good", reviewed_at=now)
    db_session.add_all([a1, r1])

    # 2. Submitted item (Must NOT appear)
    i2 = DataItem(project_id=project.id, content="Submitted Text Row")
    db_session.add(i2)
    db_session.flush()
    t2 = Task(item_id=i2.id, assigned_to=annotator_user.id, status="SUBMITTED", submitted_at=now)
    db_session.add(t2)
    db_session.flush()
    a2 = Annotation(task_id=t2.id, label_id=label.id, annotated_at=now)
    db_session.add(a2)

    db_session.commit()

    # CSV Export
    csv_res = client.get(f"/api/v1/projects/{project.id}/export?format=csv", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    csv_text = csv_res.text.strip()
    assert "Approved Text Row" in csv_text
    assert "Submitted Text Row" not in csv_text

    # JSON Export
    json_res = client.get(f"/api/v1/projects/{project.id}/export?format=json", headers=admin_headers)
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers["content-type"]
    records = json_res.json()
    assert len(records) == 1
    assert records[0]["text"] == "Approved Text Row"
    assert records[0]["label"] == "Positive"

    # Annotator forbidden from export
    forbidden_res = client.get(f"/api/v1/projects/{project.id}/export?format=csv", headers=annotator_headers)
    assert forbidden_res.status_code == 403
