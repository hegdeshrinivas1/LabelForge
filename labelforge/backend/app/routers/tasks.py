import math
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Task, DataItem, Label, Annotation, Review, User, Project
from app.auth import get_current_user
from app.schemas import (
    TaskStatus,
    PaginatedResponse,
    TaskListItem,
    TaskDetail,
    AnnotateTask,
    LabelResponse,
    AnnotationResponse,
    ReviewResponse,
    DataItemResponse
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get(
    "/my",
    response_model=PaginatedResponse[TaskListItem],
    summary="Get paginated list of tasks assigned to current user"
)
def get_my_tasks(
    status: Optional[TaskStatus] = Query(None, description="Filter by status (PENDING, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve tasks assigned to the authenticated user.
    - Annotators see ONLY their own tasks.
    - Filterable by lifecycle status.
    - Includes latest review feedback if previously rejected.
    """
    query = (
        db.query(Task)
        .join(DataItem, Task.item_id == DataItem.id)
        .filter(Task.assigned_to == current_user.id)
    )

    if status:
        query = query.filter(Task.status == status.value)

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    tasks = (
        query
        .order_by(Task.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items: List[TaskListItem] = []
    for t in tasks:
        # Fetch project metadata
        proj = db.query(Project.name, Project.description).filter(Project.id == t.item.project_id).first()
        proj_name = proj[0] if proj else None
        proj_desc = proj[1] if proj else None

        # Fetch latest review comment if rejected
        latest_comment = None
        if t.reviews:
            sorted_reviews = sorted(t.reviews, key=lambda r: r.reviewed_at, reverse=True)
            latest_comment = sorted_reviews[0].comment

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
                latest_review_comment=latest_comment
            )
        )

    return PaginatedResponse[TaskListItem](
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get(
    "/{task_id}",
    response_model=TaskDetail,
    summary="Get details of a specific task and available project labels"
)
def get_task_detail(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full task details, including content, current annotation,
    latest review comment, and available labels for the project.
    
    Automatic state transition:
    If opened by the assigned annotator while in PENDING or REJECTED status,
    the task status transitions to IN_PROGRESS.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found"
        )

    # Permission check: Annotators can only view their own tasks. Reviewers and Admins can view any task.
    if current_user.role == "annotator" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this task"
        )

    # Auto-transition: PENDING or REJECTED -> IN_PROGRESS when opened by the assigned annotator
    if current_user.id == task.assigned_to and task.status in ("PENDING", "REJECTED"):
        task.status = "IN_PROGRESS"
        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)

    # Project metadata
    proj = db.query(Project).filter(Project.id == task.item.project_id).first()
    proj_name = proj.name if proj else None
    proj_desc = proj.description if proj else None

    # Available labels for this project
    available_labels = (
        db.query(Label)
        .filter(Label.project_id == task.item.project_id)
        .order_by(Label.id.asc())
        .all()
    )

    # Latest review if present
    latest_review = None
    if task.reviews:
        sorted_reviews = sorted(task.reviews, key=lambda r: r.reviewed_at, reverse=True)
        latest_review = ReviewResponse.model_validate(sorted_reviews[0])

    annotation_resp = None
    if task.annotation:
        annotation_resp = AnnotationResponse(
            id=task.annotation.id,
            task_id=task.annotation.task_id,
            label_id=task.annotation.label_id,
            label=LabelResponse.model_validate(task.annotation.label) if task.annotation.label else None,
            annotated_at=task.annotation.annotated_at
        )

    return TaskDetail(
        id=task.id,
        item=DataItemResponse.model_validate(task.item),
        project_name=proj_name,
        project_description=proj_desc,
        status=TaskStatus(task.status),
        assigned_to=task.assigned_to,
        annotation=annotation_resp,
        latest_review=latest_review,
        available_labels=[LabelResponse.model_validate(l) for l in available_labels]
    )


@router.post(
    "/{task_id}/annotate",
    response_model=TaskDetail,
    summary="Submit or update an annotation for a task"
)
def annotate_task(
    task_id: int,
    payload: AnnotateTask,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply a label to a task and transition status to SUBMITTED.
    
    Business Rules:
    - Annotator can only annotate tasks assigned to them.
    - Task must be in PENDING, IN_PROGRESS, or REJECTED status (otherwise 409 Conflict).
    - Label must belong to the task's parent project (otherwise 400 Bad Request).
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found"
        )

    # Enforce task ownership
    if current_user.role != "admin" and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only annotate tasks assigned to you"
        )

    # Enforce allowed status transitions
    allowed_statuses = ("PENDING", "IN_PROGRESS", "REJECTED")
    if task.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task cannot be annotated while in '{task.status}' status"
        )

    # Validate that label belongs to the same project
    label = db.query(Label).filter(Label.id == payload.label_id).first()
    if not label or label.project_id != task.item.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected label does not exist or does not belong to this project"
        )

    now = datetime.now(timezone.utc)

    # Upsert annotation record
    if task.annotation:
        task.annotation.label_id = payload.label_id
        task.annotation.annotated_at = now
    else:
        annotation = Annotation(
            task_id=task.id,
            label_id=payload.label_id,
            annotated_at=now
        )
        db.add(annotation)

    # Transition task state to SUBMITTED
    task.status = "SUBMITTED"
    task.submitted_at = now
    task.updated_at = now

    db.commit()
    db.refresh(task)

    return get_task_detail(task_id=task.id, db=db, current_user=current_user)
