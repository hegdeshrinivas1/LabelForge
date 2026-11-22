import csv
import io
import json
from typing import List, Dict, Any
from fastapi import HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.models import Task, DataItem, Label, Annotation, Review, User, Project


def export_approved_dataset(
    project_id: int,
    export_format: str,
    db: Session
) -> Response:
    """
    Export all APPROVED tasks in a project as either CSV or JSON.
    Guarantees that unapproved or in-progress tasks are strictly excluded.
    """
    clean_format = export_format.lower().strip()
    if clean_format not in ("csv", "json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid export format. Must be 'csv' or 'json'."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    # Query approved tasks with all joined metadata
    approved_tasks = (
        db.query(
            Task.id.label("task_id"),
            DataItem.id.label("item_id"),
            DataItem.content.label("text"),
            Label.name.label("label_name"),
            Label.color.label("label_color"),
            User.name.label("annotator_name"),
            User.email.label("annotator_email"),
            Annotation.annotated_at.label("annotated_at"),
            Review.reviewed_at.label("reviewed_at")
        )
        .join(DataItem, Task.item_id == DataItem.id)
        .join(Annotation, Task.id == Annotation.task_id)
        .join(Label, Annotation.label_id == Label.id)
        .join(User, Task.assigned_to == User.id)
        .outerjoin(Review, (Review.task_id == Task.id) & (Review.decision == "APPROVED"))
        .filter(
            DataItem.project_id == project_id,
            Task.status == "APPROVED"
        )
        .order_by(Task.id.asc())
        .all()
    )

    records: List[Dict[str, Any]] = []
    for r in approved_tasks:
        records.append({
            "task_id": r.task_id,
            "item_id": r.item_id,
            "text": r.text,
            "label": r.label_name,
            "label_color": r.label_color,
            "annotated_by": r.annotator_name,
            "annotator_email": r.annotator_email,
            "annotated_at": r.annotated_at.isoformat() if r.annotated_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        })

    filename = f"labelforge_project_{project_id}_approved.{clean_format}"

    if clean_format == "csv":
        output = io.StringIO()
        fieldnames = ["task_id", "item_id", "text", "label", "label_color", "annotated_by", "annotator_email", "annotated_at", "reviewed_at"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in records:
            writer.writerow(row)
        csv_bytes = output.getvalue().encode("utf-8-sig")

        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    else:
        json_str = json.dumps(records, indent=2, ensure_ascii=False)
        return Response(
            content=json_str.encode("utf-8"),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
