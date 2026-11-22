import math
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, DataItem, Label, Annotation, Review, User, Project
from app.auth import require_role
from app.schemas import (
    ReviewSubmit,
    ReviewResponse,
    ReviewDecision,
    PaginatedResponse,
    TaskListItem,
    TaskStatus,
    LabelResponse
)

router = APIRouter(tags=["Reviews"])


@router.get(
    "/reviews/queue",
    response_model=PaginatedResponse[TaskListItem],
    summary="Get queue of submitted tasks awaiting quality review (Reviewer/Admin)"
)
def get_review_queue(
    project_id: Optional[int] = Query(None, description="Filter queue by project ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_role(["reviewer", "admin"]))
):
    """
    Retrieve tasks in SUBMITTED state waiting for quality assurance.
    - Reviewers and Admins can access this queue.
    - Filterable by project_id.
    """
    query = (
        db.query(Task)
        .join(DataItem, Task.item_id == DataItem.id)
        .filter(Task.status == "SUBMITTED")
    )

    if project_id is not None:
        query = query.filter(DataItem.project_id == project_id)

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    tasks = (
        query
        .order_by(Task.submitted_at.asc())  # FIFO queue
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items: List[TaskListItem] = []
    for t in tasks:
        proj = db.query(Project.name, Project.description).filter(Project.id == t.item.project_id).first()
        proj_name = proj[0] if proj else None
        proj_desc = proj[1] if proj else None

        label_resp = None
        if t.annotation and t.annotation.label:
            label_resp = LabelResponse.model_validate(t.annotation.label)

        items.append(
            TaskListItem(
                id=t.id,
                item_id=t.item_id,
                content=t.item.content,
                project_id=t.item.project_id,
                project_name=proj_name,
                project_description=proj_desc,
                status=TaskStatus(t.status),
                assigned_to=t.assigned_to,
                submitted_at=t.submitted_at,
                updated_at=t.updated_at,
                label=label_resp,
                latest_review_comment=None
            )
        )

    return PaginatedResponse[TaskListItem](
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.post(
    "/tasks/{task_id}/review",
    response_model=ReviewResponse,
    summary="Submit review decision for a task (Approve or Reject)"
)
def review_task(
    task_id: int,
    payload: ReviewSubmit,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_role(["reviewer", "admin"]))
):
    """
    Approve or reject a submitted annotation.
    
    Business Rules:
    - Reviewer CANNOT review a task they annotated themselves (403 Forbidden).
    - Task must be in SUBMITTED status (409 Conflict).
    - If decision is REJECTED, an explanatory comment is strictly required (422 Unprocessable Entity).
    - Transitions task status to APPROVED or REJECTED.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found"
        )

    # Prevent conflict of interest: self-review prohibition
    if task.assigned_to == reviewer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewers cannot review their own annotations"
        )

    # State validation
    if task.status != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only submitted tasks can be reviewed. Task is currently in '{task.status}' status."
        )

    # Mandatory comment on rejection
    if payload.decision == ReviewDecision.REJECTED:
        if not payload.comment or not payload.comment.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A non-empty comment is required when rejecting an annotation."
            )

    now = datetime.now(timezone.utc)
    comment_clean = payload.comment.strip() if payload.comment else None

    # Log review record
    review = Review(
        task_id=task.id,
        reviewer_id=reviewer.id,
        decision=payload.decision.value,
        comment=comment_clean,
        reviewed_at=now
    )
    db.add(review)

    # Update task lifecycle status
    task.status = payload.decision.value
    task.updated_at = now

    db.commit()
    db.refresh(review)

    return ReviewResponse(
        id=review.id,
        task_id=review.task_id,
        reviewer_id=review.reviewer_id,
        decision=ReviewDecision(review.decision),
        comment=review.comment,
        reviewed_at=review.reviewed_at
    )
